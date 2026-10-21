import { buildClientTimeline } from './clientTimeline';
import { balanceLabels, buildClientBalances, netReceipts } from './paymentBalances';
import { isExcludedFromFinancialReporting } from './financialLedgerRules';

export function buildClientStatement(input: Parameters<typeof buildClientTimeline>[0], center: { name?: string; address?: string; phone?: string }) {
  const now = input.now || new Date();
  const { client, centerId, financialVisible } = input;
  if (client.centerId !== centerId) throw new Error('Statement ownership mismatch');
  const ownPayments = input.payments.filter(p => p.centerId === centerId && p.clientId === client.id && !isExcludedFromFinancialReporting(p));
  const balance = buildClientBalances({ centerId, now, clients: [{ ...client, status: client.status === 'archived' ? 'suspended' : client.status }],
    clientPackages: input.packages, payments: ownPayments, appointments: input.appointments })[0];
  return {
    generatedAt: now.toISOString(), financialVisible,
    client: { id: client.id, name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Adhérent', phone: client.phone || '', status: client.status || 'active' },
    center: { id: centerId, name: center.name || centerId, address: center.address || '', phone: center.phone || '' },
    summary: { packageCount: balance?.pkgsCount || 0, availableCredits: balance?.totalRemaining || 0,
      nonUsableCredits: balance?.nonUsableRemaining || 0, completedSessions: balance?.completedApts || 0,
      balanceLabel: client.status === 'archived' ? 'Client archivé · crédits indisponibles' : balance ? balanceLabels[balance.statusCategory] : 'Dossier à vérifier',
      ...(financialVisible ? { netReceipts: ownPayments.length ? netReceipts(ownPayments) : null } : {}) },
    events: buildClientTimeline({ ...input, now }),
  };
}
export type ClientStatementData = ReturnType<typeof buildClientStatement>;
