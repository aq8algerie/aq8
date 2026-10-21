import type { Client, ClientPackage, Payment } from '../types';
import type { LegacyHistoryRecord } from './legacyHistory';
import { isHistoricalRecord } from './legacyHistory';
import { isExcludedFromFinancialReporting } from './financialLedgerRules';

export const reconciliationLabels = {
  client_reference: 'Dossier absent du centre', original_center: 'Centre d’origine non renseigné',
  reversal_link: 'Annulation à rapprocher', package_payment: 'Lien forfait / paiement à vérifier',
  credits: 'Crédits incohérents',
};
export type ReconciliationProblem = keyof typeof reconciliationLabels;
export interface ReconciliationIssue {
  key: string; id: string; origin: 'current' | 'legacy'; kind: 'payment' | 'package' | 'reservation';
  date: string; clientId: string; clientName: string; reference: string; problems: ReconciliationProblem[];
  explanation: string; amount?: number; source?: LegacyHistoryRecord['source']; relatedReferences?: string[];
}
export function buildReconciliation(input: { centerId: string; clients: Client[]; payments: Payment[]; packages: ClientPackage[]; finance: LegacyHistoryRecord[]; reservations: LegacyHistoryRecord[] }) {
  const { centerId } = input;
  const clients = new Map(input.clients.filter(c => c.centerId === centerId).map(c => [c.id, c]));
  const payments = input.payments.filter(p => p.centerId === centerId && !isHistoricalRecord(p));
  const paymentMap = new Map(payments.map(p => [p.id, p]));
  const issues: ReconciliationIssue[] = [];
  const clientName = (id: string) => { const c = clients.get(id); return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : ''; };
  for (const p of payments.filter(p => !isExcludedFromFinancialReporting(p))) {
    const problems: ReconciliationProblem[] = [];
    if (!clients.has(p.clientId)) problems.push('client_reference');
    if (p.kind === 'reversal' || p.status === 'reversed' || p.reversedByPaymentId) {
      const original = p.kind === 'reversal' ? paymentMap.get(p.reversalOfPaymentId || '') : p;
      const counter = p.kind === 'reversal' ? p : paymentMap.get(p.reversedByPaymentId || '');
      if (!original || !counter || isExcludedFromFinancialReporting(original) || isExcludedFromFinancialReporting(counter)
        || original.kind === 'reversal' || original.status !== 'reversed' || counter.kind !== 'reversal'
        || original.reversedByPaymentId !== counter.id || counter.reversalOfPaymentId !== original.id
        || original.clientId !== counter.clientId || !Number.isFinite(original.amount) || original.amount <= 0 || counter.amount !== -original.amount) problems.push('reversal_link');
    }
    if (problems.length) issues.push({ key: `current:payment:${p.id}`, id: p.id, origin: 'current', kind: 'payment', date: p.date || '', clientId: p.clientId || '',
      clientName: clientName(p.clientId), reference: p.receiptNumber || p.id, amount: p.amount, problems,
      relatedReferences: [p.reversalOfPaymentId, p.reversedByPaymentId].filter((id): id is string => !!id),
      explanation: 'Vérifier la référence client et les liens entre règlement et contre-écriture. Conserver les deux écritures et leurs montants pendant le rapprochement.' });
  }
  for (const p of input.packages.filter(p => p.centerId === centerId && !isHistoricalRecord(p))) {
    const problems: ReconciliationProblem[] = [];
    if (!clients.has(p.clientId)) problems.push('client_reference');
    if (!Number.isFinite(p.totalSessions) || !Number.isFinite(p.sessionsRemaining) || p.totalSessions < 0 || p.sessionsRemaining < 0 || p.sessionsRemaining > p.totalSessions) problems.push('credits');
    if (p.sourcePaymentId) {
      const pay = paymentMap.get(p.sourcePaymentId);
      if (!pay || isExcludedFromFinancialReporting(pay) || pay.kind === 'reversal' || pay.clientId !== p.clientId
        || (pay.clientPackageId && pay.clientPackageId !== p.id) || (pay.status === 'reversed' && p.status !== 'cancelled')) problems.push('package_payment');
    }
    if (problems.length) issues.push({ key: `current:package:${p.id}`, id: p.id, origin: 'current', kind: 'package', date: p.purchaseDate || '', clientId: p.clientId || '',
      clientName: clientName(p.clientId), reference: p.id, problems, relatedReferences: p.sourcePaymentId ? [p.sourcePaymentId] : [], explanation: 'Comparer le forfait à son paiement explicitement associé et aux crédits inscrits. L’absence de lien de paiement sur une activation directe n’est pas considérée comme une anomalie.' });
  }
  for (const [kind, records] of [['payment', input.finance], ['reservation', input.reservations]] as const) {
    for (const r of records.filter(r => r.centerId === centerId)) {
      const problems: ReconciliationProblem[] = [];
      if (!clients.has(r.clientId)) problems.push('client_reference');
      if (r.originalCenterMissing) problems.push('original_center');
      if (problems.length) issues.push({ key: `legacy:${kind}:${r.id}`, id: r.id, origin: 'legacy', kind, date: r.date || '', clientId: r.clientId || '',
        clientName: clientName(r.clientId) || r.clientName || '', reference: r.source?.legacyId || r.id, source: r.source, problems,
        ...(kind === 'payment' && Number.isFinite(r.amount) ? { amount: r.amount } : {}),
        explanation: r.originalCenterMissing ? 'Le document d’origine ne renseigne pas le centre. Cet ancien import a conservé son rattachement antérieur ; aucune nouvelle fiche sans centre ne doit être créée.'
          : 'La référence n’a pas été retrouvée parmi les dossiers de ce centre, clients archivés compris. Vérifier les documents d’origine avant tout rattachement ; aucun autre centre n’est déduit.' });
    }
  }
  return issues.sort((a, b) => (a.origin === b.origin ? 0 : a.origin === 'current' ? -1 : 1) || b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}
export function filterReconciliation(rows: ReconciliationIssue[], input: { origin?: string; problem?: string; search?: string }) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(input.search || '').trim().split(/\s+/).filter(Boolean);
  return rows.filter(r => (!input.origin || r.origin === input.origin) && (!input.problem || r.problems.includes(input.problem as ReconciliationProblem))
    && terms.every(t => normalize([r.id, r.clientId, r.clientName, r.reference, r.source?.file, ...r.problems.map(p => reconciliationLabels[p])].join(' ')).includes(t)));
}
