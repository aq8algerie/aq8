export const BOOKING_HOURS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00'
] as const;

export const CONTACT_REQUEST_TYPES = [
  'general',
  'reservation',
  'partnership',
  'recruitment'
] as const;

export type PublicBookingRequestInput = {
  centerId: string;
  centerName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  bookingDate: string;
  bookingTime: string;
};

export type PublicContactRequestType = typeof CONTACT_REQUEST_TYPES[number];

export type PublicContactMessageInput = {
  name: string;
  phone: string;
  email: string;
  requestType: string;
  centerId: string;
  message: string;
};

type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidOptionalEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBookingMinimumDate(now: Date = new Date()): string {
  const date = new Date(now);
  const currentHours = date.getHours();
  const currentMinutes = date.getMinutes();
  date.setDate(date.getDate() + (currentHours > 21 || (currentHours === 21 && currentMinutes >= 30) ? 2 : 1));
  return toLocalDateString(date);
}

function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toLocalDateString(parsed) === value;
}

function isValidLength(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength;
}

export function validatePublicBookingRequest(
  input: PublicBookingRequestInput,
  availableServices: string[] = [],
  now: Date = new Date()
): ValidationResult<PublicBookingRequestInput> {
  const data = {
    centerId: normalizeText(input.centerId),
    centerName: normalizeText(input.centerName),
    firstName: normalizeText(input.firstName),
    lastName: normalizeText(input.lastName),
    phone: normalizeText(input.phone),
    email: normalizeText(input.email).toLowerCase(),
    service: normalizeText(input.service),
    bookingDate: input.bookingDate.trim(),
    bookingTime: input.bookingTime.trim()
  };

  if (!isValidLength(data.centerId, 80) || !isValidLength(data.centerName, 160)) {
    return { valid: false, error: 'Centre invalide. Veuillez choisir un centre disponible.' };
  }

  if (!isValidLength(data.firstName, 80) || !isValidLength(data.lastName, 80)) {
    return { valid: false, error: 'Veuillez renseigner un prenom et un nom valides.' };
  }

  if (!isValidLength(data.phone, 40)) {
    return { valid: false, error: 'Veuillez renseigner un numero de telephone valide.' };
  }

  if (data.email.length > 160 || !isValidOptionalEmail(data.email)) {
    return { valid: false, error: 'Veuillez renseigner une adresse e-mail valide.' };
  }

  if (!isValidLength(data.service, 80) || (availableServices.length > 0 && !availableServices.includes(data.service))) {
    return { valid: false, error: 'Veuillez choisir une prestation disponible dans ce centre.' };
  }

  if (!isDateString(data.bookingDate) || data.bookingDate < getBookingMinimumDate(now)) {
    return { valid: false, error: 'Veuillez choisir une date disponible pour votre demande.' };
  }

  if (!BOOKING_HOURS.includes(data.bookingTime as typeof BOOKING_HOURS[number])) {
    return { valid: false, error: 'Veuillez choisir un creneau horaire propose.' };
  }

  return { valid: true, data };
}

export function validatePublicContactMessage(
  input: PublicContactMessageInput,
  allowedCenterIds: string[] = []
): ValidationResult<PublicContactMessageInput & { requestType: PublicContactRequestType }> {
  const data = {
    name: normalizeText(input.name),
    phone: normalizeText(input.phone),
    email: normalizeText(input.email).toLowerCase(),
    requestType: input.requestType.trim(),
    centerId: normalizeText(input.centerId),
    message: input.message.trim()
  };

  if (!isValidLength(data.name, 120)) {
    return { valid: false, error: 'Veuillez renseigner votre nom complet.' };
  }

  if (!isValidLength(data.phone, 40)) {
    return { valid: false, error: 'Veuillez renseigner un numero de telephone valide.' };
  }

  if (data.email.length > 160 || !isValidOptionalEmail(data.email)) {
    return { valid: false, error: 'Veuillez renseigner une adresse e-mail valide.' };
  }

  if (!CONTACT_REQUEST_TYPES.includes(data.requestType as PublicContactRequestType)) {
    return { valid: false, error: 'Veuillez choisir un type de demande valide.' };
  }

  const centerIsAllowed = data.centerId === 'general' || allowedCenterIds.length === 0 || allowedCenterIds.includes(data.centerId);
  if (!centerIsAllowed || !isValidLength(data.centerId, 80)) {
    return { valid: false, error: 'Veuillez choisir un centre valide.' };
  }

  if (data.message.length > 2000) {
    return { valid: false, error: 'Votre message est trop long.' };
  }

  return {
    valid: true,
    data: {
      ...data,
      requestType: data.requestType as PublicContactRequestType
    }
  };
}
