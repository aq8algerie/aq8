/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, ClientPackage, Appointment } from '../types';

/**
 * Find active packages for a specific client with remaining sessions
 */
export function findActivePackageForClient(
  clientId: string,
  clientPackages: ClientPackage[]
): ClientPackage | undefined {
  return clientPackages.find(
    cp => cp.clientId === clientId && cp.status === 'active' && cp.sessionsRemaining > 0
  );
}

/**
 * Validates the business requirements for completing an appointment and deducting a session credit
 */
export function validateDeduction(
  appointment: Appointment,
  client: Client | undefined,
  activePackage: ClientPackage | undefined,
  managerCenterId: string
): { valid: boolean; error?: string } {
  // 1. Ensure appointment belongs to manager's center
  if (appointment.centerId !== managerCenterId) {
    return { valid: false, error: "Cette réservation n'appartient pas à votre centre." };
  }

  // 2. Ensure client belongs to the correct center
  if (!client || client.centerId !== managerCenterId) {
    return { valid: false, error: "L'adhérent n'existe pas ou n'appartient pas à ce centre." };
  }

  // 3. Check current status of the reservation (should be booked)
  if (appointment.status !== 'booked') {
    return { valid: false, error: "La réservation n'est pas dans l'état planifiée." };
  }

  // 4. Ensure an active package exists
  if (!activePackage) {
    return { valid: false, error: "L'adhérent ne possède aucun forfait actif pour ce centre." };
  }

  // 5. Ensure package has remaining sessions
  if (activePackage.sessionsRemaining <= 0) {
    return { valid: false, error: 'Le forfait actif de cet adhérent est épuisé.' };
  }

  return { valid: true };
}

/**
 * Deducts a session from the client package
 */
export function deductSessionFromPackage(clientPackage: ClientPackage): ClientPackage {
  const remaining = clientPackage.sessionsRemaining - 1;
  return {
    ...clientPackage,
    sessionsRemaining: remaining,
    status: remaining === 0 ? 'completed' : 'active'
  };
}
