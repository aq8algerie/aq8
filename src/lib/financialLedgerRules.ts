import type { ClientPackage, Payment } from '../types';

export function validatePaymentReversal(input: {
  payment: Payment | undefined;
  clientPackage: ClientPackage | undefined;
  centerId: string;
}): { valid: true } | { valid: false; error: string } {
  const { payment, clientPackage, centerId } = input;
  if (
    !payment ||
    payment.centerId !== centerId ||
    payment.kind === 'reversal' ||
    !Number.isFinite(payment.amount) ||
    payment.amount <= 0
  ) {
    return { valid: false, error: 'Paiement encaissé introuvable dans ce centre.' };
  }
  if (
    clientPackage &&
    (
      clientPackage.sessionsRemaining !== clientPackage.totalSessions ||
      Boolean(clientPackage.lastCompletedAppointmentId)
    )
  ) {
    return {
      valid: false,
      error: "Ce forfait a déjà été consommé. L'annulation nécessite une régularisation supervisée.",
    };
  }
  return { valid: true };
}
