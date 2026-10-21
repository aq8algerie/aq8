import type { Client, Payment } from '../types';
export type PaymentEntryState = 'posted' | 'reversed' | 'reversal' | 'adjustment';
export type PaymentStateFilter = 'all' | PaymentEntryState | 'unresolved';
export const paymentStateLabels: Record<PaymentEntryState, string> = {
  posted: 'Règlement enregistré', reversed: 'Règlement annulé', reversal: 'Contre-écriture d’annulation', adjustment: 'Régularisation',
};
export function paymentEntryState(payment: Payment): PaymentEntryState {
  if (payment.kind === 'reversal') return 'reversal';
  if (payment.status === 'reversed') return 'reversed';
  return payment.amount > 0 ? 'posted' : 'adjustment';
}
export function matchesPaymentState(payment: Payment, client: Client | undefined, filter: PaymentStateFilter) {
  if (filter === 'all') return true;
  if (filter === 'unresolved') return !client;
  return paymentEntryState(payment) === filter;
}
export const paymentMethodLabels = { cash: 'Espèces', card: 'Carte', ccp: 'CCP', cheque: 'Chèque' };
