/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment, Client, ClientPackage, Package, Service } from '../types';

/**
 * Check if a client package is expired (more than 45 days since purchase)
 */
export function isPackageExpired(clientPackage: ClientPackage): boolean {
  if (clientPackage.status === 'expired') return true;
  if (!clientPackage.purchaseDate) return false;
  
  const purchase = new Date(clientPackage.purchaseDate);
  if (isNaN(purchase.getTime())) return false;
  
  // Calculate date diff in days
  const today = new Date();
  const diffTime = today.getTime() - purchase.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays > 45;
}

/**
 * Find active packages for a specific client with remaining sessions
 */
export function findActivePackageForClient(
  clientId: string,
  clientPackages: ClientPackage[]
): ClientPackage | undefined {
  return clientPackages.find(
    cp => cp.clientId === clientId && 
          cp.status === 'active' && 
          cp.sessionsRemaining > 0 &&
          !isPackageExpired(cp)
  );
}

export function isPackageCompatibleWithService(
  clientPackage: ClientPackage,
  service: Service,
  packages: Package[]
): boolean {
  const packageDefinition = packages.find(pkg => pkg.id === clientPackage.packageId);
  return Boolean(packageDefinition && (
    packageDefinition.type === 'mix' ||
    packageDefinition.type === service.type
  ));
}

/**
 * Select the oldest valid compatible package so credits that expire first are
 * consumed before newer purchases.
 */
export function findActivePackageForClientAndService(
  clientId: string,
  service: Service,
  clientPackages: ClientPackage[],
  packages: Package[]
): ClientPackage | undefined {
  return clientPackages
    .filter(clientPackage =>
      clientPackage.clientId === clientId &&
      clientPackage.status === 'active' &&
      clientPackage.sessionsRemaining > 0 &&
      !isPackageExpired(clientPackage) &&
      isPackageCompatibleWithService(clientPackage, service, packages)
    )
    .sort((left, right) => left.purchaseDate.localeCompare(right.purchaseDate))[0];
}

export type SessionCompletionValidationInput = {
  appointment: Appointment;
  client: Client | undefined;
  clientPackage: ClientPackage | undefined;
  service: Service | undefined;
  packageDefinition: Package | undefined;
  managerCenterId: string;
};

/**
 * Validate every invariant required by the completion transaction.
 */
export function validateSessionCompletion({
  appointment,
  client,
  clientPackage,
  service,
  packageDefinition,
  managerCenterId,
}: SessionCompletionValidationInput): { valid: true } | { valid: false; error: string } {
  if (appointment.centerId !== managerCenterId) {
    return { valid: false, error: "Cette réservation n'appartient pas à votre centre." };
  }

  if (appointment.status !== 'booked') {
    return { valid: false, error: 'Cette séance a déjà été validée ou annulée.' };
  }

  if (!client || client.centerId !== managerCenterId || client.id !== appointment.clientId) {
    return { valid: false, error: "L'adhérent est introuvable ou n'appartient pas à votre centre." };
  }

  if (client.status === 'suspended') {
    return { valid: false, error: "Le compte de cet adhérent est suspendu." };
  }

  if (!service || service.id !== appointment.serviceId) {
    return { valid: false, error: 'La prestation associée à cette séance est introuvable.' };
  }

  if (!clientPackage) {
    return { valid: false, error: "L'adhérent ne possède aucun forfait compatible actif." };
  }

  if (
    clientPackage.centerId !== managerCenterId ||
    clientPackage.clientId !== appointment.clientId
  ) {
    return { valid: false, error: 'Le forfait sélectionné ne correspond pas à cette séance.' };
  }

  if (!packageDefinition || packageDefinition.id !== clientPackage.packageId) {
    return { valid: false, error: 'La définition du forfait est introuvable.' };
  }

  if (
    clientPackage.status !== 'active' ||
    !Number.isInteger(clientPackage.sessionsRemaining) ||
    clientPackage.sessionsRemaining <= 0
  ) {
    return { valid: false, error: "Le forfait actif de cet adhérent ne contient plus de crédit." };
  }

  if (isPackageExpired(clientPackage)) {
    return { valid: false, error: "Le forfait actif de cet adhérent a expiré." };
  }

  if (packageDefinition.type !== 'mix' && packageDefinition.type !== service.type) {
    return {
      valid: false,
      error: `Ce forfait ne permet pas de valider une séance ${service.type === 'aq8' ? 'AQ8' : 'Wonder'}.`,
    };
  }

  return { valid: true };
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
