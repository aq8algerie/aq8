import { Center, Client, ClientPackage, Package, Payment } from '../types';

const PAYMENT_METHODS: Payment['method'][] = ['cash', 'card', 'ccp', 'cheque'];

export type PackageActivationValidationInput = {
  center: Center | undefined;
  client: Client | undefined;
  packageDefinition: Package | undefined;
  centerId: string;
};

export function validatePackageActivation({
  center,
  client,
  packageDefinition,
  centerId,
}: PackageActivationValidationInput): { valid: true } | { valid: false; error: string } {
  if (!center || center.id !== centerId) {
    return { valid: false, error: 'Centre introuvable.' };
  }

  if (center.status === 'suspended' || center.status === 'showcase') {
    return { valid: false, error: "Ce centre n'est pas autorisé à activer des forfaits." };
  }

  if (!client || client.centerId !== centerId) {
    return { valid: false, error: "L'adhérent est introuvable ou n'appartient pas à votre centre." };
  }

  if (client.status === 'suspended' || client.status === 'archived') {
    return { valid: false, error: "Le compte de cet adhérent n’est pas actif." };
  }

  if (!packageDefinition) {
    return { valid: false, error: 'Forfait introuvable.' };
  }

  const packageIsActive = center.customActivePackages
    ? center.customActivePackages.includes(packageDefinition.id)
    : packageDefinition.type === 'mix'
      ? center.services.includes('aq8') && center.services.includes('wonder')
      : center.services.includes(packageDefinition.type);

  if (!packageIsActive) {
    return { valid: false, error: "Ce forfait n'est pas activé dans votre centre." };
  }

  if (!Number.isInteger(packageDefinition.sessionsCount) || packageDefinition.sessionsCount <= 0) {
    return { valid: false, error: 'Ce forfait ne contient aucune séance activable.' };
  }

  return { valid: true };
}

export type PaymentRegistrationValidationInput = PackageActivationValidationInput & {
  amount: number;
  method: Payment['method'];
  receiptNumber: string;
  autoActivatePackage: boolean;
};

export function validatePaymentRegistration({
  center,
  client,
  packageDefinition,
  centerId,
  amount,
  method,
  receiptNumber,
  autoActivatePackage,
}: PaymentRegistrationValidationInput): { valid: true } | { valid: false; error: string } {
  const activationValidation = validatePackageActivation({
    center,
    client,
    packageDefinition,
    centerId,
  });
  if (activationValidation.valid === false) {
    return activationValidation;
  }

  if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000) {
    return { valid: false, error: 'Le montant encaissé doit être un entier positif valide.' };
  }

  if (!PAYMENT_METHODS.includes(method)) {
    return { valid: false, error: 'Mode de paiement invalide.' };
  }

  if (!receiptNumber || receiptNumber.length > 80) {
    return { valid: false, error: 'La référence du reçu est invalide.' };
  }

  if (autoActivatePackage && packageDefinition.sessionsCount <= 0) {
    return { valid: false, error: 'Ce forfait ne contient aucune séance activable.' };
  }

  return { valid: true };
}

export function isSamePaymentOperation(
  existingPayment: Payment,
  expectedPayment: Payment
): boolean {
  return existingPayment.id === expectedPayment.id &&
    existingPayment.centerId === expectedPayment.centerId &&
    existingPayment.clientId === expectedPayment.clientId &&
    existingPayment.packageId === expectedPayment.packageId &&
    existingPayment.amount === expectedPayment.amount &&
    existingPayment.date === expectedPayment.date &&
    existingPayment.method === expectedPayment.method &&
    existingPayment.receiptNumber === expectedPayment.receiptNumber &&
    existingPayment.clientPackageId === expectedPayment.clientPackageId;
}

export function isSameClientPackageActivation(
  existingClientPackage: ClientPackage,
  expectedClientPackage: ClientPackage
): boolean {
  return existingClientPackage.id === expectedClientPackage.id &&
    existingClientPackage.centerId === expectedClientPackage.centerId &&
    existingClientPackage.clientId === expectedClientPackage.clientId &&
    existingClientPackage.packageId === expectedClientPackage.packageId &&
    existingClientPackage.purchaseDate === expectedClientPackage.purchaseDate &&
    existingClientPackage.totalSessions === expectedClientPackage.totalSessions &&
    existingClientPackage.sessionsRemaining === expectedClientPackage.sessionsRemaining &&
    existingClientPackage.status === expectedClientPackage.status &&
    existingClientPackage.sourcePaymentId === expectedClientPackage.sourcePaymentId;
}