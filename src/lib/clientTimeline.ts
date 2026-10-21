import type { Appointment, Client, ClientPackage, Payment } from '../types';
import type { LegacyHistoryRecord } from './legacyHistory';
import { isHistoricalRecord } from './legacyHistory';
import { paymentEntryState, paymentMethodLabels, paymentStateLabels } from './paymentRegister';
import { packageStatusLabel } from './paymentBalances';

export type TimelineKind = 'payment' | 'package' | 'reservation';
export type TimelineOrigin = 'current' | 'legacy';
export interface TimelineEvent {
  id: string; date: string; kind: TimelineKind; origin: TimelineOrigin;
  title: string; status: string; reference: string; amount?: number;
  details: { label: string; value: string }[];
}
export interface TimelineResult {
  ok: true; rows: TimelineEvent[]; total: number; page: number; pageSize: number;
  financialVisible: boolean;
}
export const timelineKindLabels = { payment: 'Paiements et écritures', package: 'Abonnements', reservation: 'Réservations et séances' };
export const timelineOriginLabels = { current: 'CRM actuel', legacy: 'Ancienne base' };
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const detail = (label: string, value: unknown) => ({ label, value: text(value) });

// A single, explicit projection: never serialize raw documents to the timeline.
export function buildClientTimeline(input: {
  client: Client; centerId: string; financialVisible: boolean;
  appointments: Appointment[]; packages: ClientPackage[]; payments: Payment[];
  finance: LegacyHistoryRecord[]; reservations: LegacyHistoryRecord[]; now?: Date;
}): TimelineEvent[] {
  const { client, centerId, financialVisible } = input;
  if (client.centerId !== centerId) return [];
  const own = (row: { clientId: string; centerId: string }) => row.clientId === client.id && row.centerId === centerId;
  const events: TimelineEvent[] = [];
  for (const a of input.appointments.filter(a => own(a) && !isHistoricalRecord(a))) {
    const status = { booked: 'Planifiée', confirmed: 'Confirmée', completed: 'Effectuée', cancelled: 'Annulée' }[a.status] || 'État non renseigné';
    events.push({ id: `appointment:${a.id}`, date: a.dateTime || '', kind: 'reservation', origin: 'current', title: a.serviceName || (a.serviceType === 'wonder' ? 'Séance Wonder' : a.serviceType === 'aq8' ? 'Séance AQ8' : 'Réservation'), status, reference: a.id,
      details: [detail('Réservation', a.id), detail('Date prévue', a.dateTime), detail('Enregistrée le', a.createdAt),
        detail('Séance validée le', a.completedAt), detail('Forfait débité', a.completedWithClientPackageId), detail('Crédits déduits', a.deductedCredits),
        detail('Annulée le', a.cancelledAt), detail('Motif d’annulation', a.cancellationReason)] });
  }
  for (const p of input.packages.filter(own)) {
    events.push({ id: `package:${p.id}`, date: p.purchaseDate || '', kind: 'package', origin: 'current', title: `Forfait CRM${Number.isFinite(p.totalSessions) ? ` · ${p.totalSessions} séances` : ''}`, status: packageStatusLabel(p, input.now), reference: p.id,
      details: [detail('Forfait', p.id), detail('Référence catalogue', p.packageId), detail('Séances acquises', p.totalSessions), detail('Crédits inscrits au dossier', p.sessionsRemaining),
        detail('Activé le', p.activatedAt), detail('Annulé le', p.cancelledAt), detail('Motif d’annulation', p.cancellationReason),
        ...(financialVisible ? [detail('Paiement associé', p.sourcePaymentId), detail('Écriture d’annulation', p.reversedByPaymentId)] : [])] });
  }
  if (financialVisible) for (const p of input.payments.filter(p => own(p) && !isHistoricalRecord(p))) {
    events.push({ id: `payment:${p.id}`, date: p.date || '', kind: 'payment', origin: 'current', title: p.kind === 'reversal' ? 'Contre-écriture d’annulation' : 'Règlement CRM',
      status: paymentStateLabels[paymentEntryState(p)], reference: p.receiptNumber || p.id, amount: p.amount,
      details: [detail('Référence d’écriture', p.id), detail('Reçu', p.receiptNumber), detail('Mode de paiement', paymentMethodLabels[p.method]),
        detail('Forfait associé', p.clientPackageId), detail('Règlement d’origine', p.reversalOfPaymentId), detail('Contre-écriture', p.reversedByPaymentId),
        detail('Enregistré par', p.recordedByUserName), detail('Motif', p.reason || p.reversalReason),
        ...(p.reportingExcluded ? [detail('Hors indicateurs financiers', 'Document de démonstration ; aucun encaissement réel justifié.'), detail('Source', p.dataQuality?.sourceFile), detail('Version source', p.dataQuality?.sourceCommit)] : [])] });
  }
  for (const m of Object.values(client.legacyMemberships || {}).filter(own)) {
    events.push({ id: `membership:${m.id}`, date: m.validFrom || '', kind: 'package', origin: 'legacy', title: 'Adhésion historique', status: 'Inactive · échue', reference: m.id,
      details: [detail('Référence historique', m.id), detail('Début', m.validFrom), detail('Fin', m.validTo), detail('Crédits actuels', 'Aucun crédit ajouté par cette archive'),
        detail('Document source', m.source?.file), detail('Page du PDF', m.source?.page), detail('Empreinte du document', m.source?.sha256)] });
  }
  for (const [kind, rows] of [['reservation', input.reservations], ['payment', financialVisible ? input.finance : []]] as const) {
    for (const r of rows.filter(own)) {
      events.push({ id: `legacy-${kind}:${r.id}`, date: r.date || '', kind, origin: 'legacy', title: r.type || (kind === 'payment' ? 'Écriture historique' : 'Réservation historique'),
        status: kind === 'payment' ? 'Archive · hors encaissements CRM' : r.cancelled ? 'Annulée' : r.refunded ? 'Remboursée' : 'Archive · réalisation non attestée',
        reference: r.source?.legacyId || r.id, ...(financialVisible && kind === 'payment' && Number.isFinite(r.amount) ? { amount: r.amount } : {}),
        details: [detail('Référence importée', r.id), detail('Référence ancienne base', r.source?.legacyId), detail('Prestation', r.service), detail('Ressource', r.resource),
          detail('État d’origine', r.sourceState || r.planningState), detail('Fin prévue', r.end), detail('Annulation', r.cancelled ? 'Oui' : ''), detail('Remboursement', r.refunded ? 'Oui' : ''),
          detail('Réservations associées', r.relatedReservationIds?.join(', ')), ...(financialVisible ? [detail('Commentaire d’origine', r.comment)] : []),
          detail('Document source', r.source?.file), detail('Page du PDF', r.source?.page), detail('Page technique', r.source?.technicalPage), detail('Empreinte du document', r.source?.sha256),
          detail('Centre d’origine', r.originalCenterMissing ? 'Absent du PDF ; rattachement antérieur à valider' : '')] });
    }
  }
  return events.map(e => ({ ...e, details: e.details.filter(d => d.value !== '') }))
    .sort((a, b) => b.date.replace(' ', 'T').localeCompare(a.date.replace(' ', 'T')) || a.id.localeCompare(b.id));
}

export function filterClientTimeline(events: TimelineEvent[], filters: { kind?: string; origin?: string; search?: string; from?: string; to?: string }) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(filters.search || '').trim().split(/\s+/).filter(Boolean);
  return events.filter(e => (!filters.kind || e.kind === filters.kind) && (!filters.origin || e.origin === filters.origin)
    && (!filters.from || (!!e.date && e.date.slice(0, 10) >= filters.from)) && (!filters.to || (!!e.date && e.date.slice(0, 10) <= filters.to))
    && terms.every(term => normalize([e.title, e.reference, e.status, ...e.details.map(d => d.value)].join(' ')).includes(term)));
}
