import { Appointment, Client, Service } from '../types';
import { BookingServiceType, getServiceTypeById } from './bookingCapacityRules';

function cleanDisplayPart(value: unknown): string {
  const text = String(value ?? '').trim();
  return /^(undefined|null|nan)$/i.test(text) ? '' : text;
}

export function resolveAppointmentClient(
  appointment?: Appointment | null,
  clients: Client[] = []
): Client | undefined {
  if (!appointment) return undefined;

  const matched = clients.find(c => c.id === appointment.clientId);
  if (matched) return matched;

  if (
    appointment.clientFirstName ||
    appointment.clientLastName ||
    appointment.clientPhone ||
    appointment.clientEmail
  ) {
    return {
      id: appointment.clientId || appointment.id,
      firstName: appointment.clientFirstName || '',
      lastName: appointment.clientLastName || '',
      phone: appointment.clientPhone || '',
      email: appointment.clientEmail || '',
      centerId: appointment.centerId,
      createdAt: appointment.createdAt || '',
      status: 'active',
    };
  }

  return undefined;
}

export function getClientDisplayName(
  client?: Partial<Client> | null,
  fallback = 'Adhérent inconnu',
  appointment?: Appointment | null
): string {
  if (client) {
    const fullName = [cleanDisplayPart(client.firstName), cleanDisplayPart(client.lastName)]
      .filter(Boolean)
      .join(' ');
    if (fullName) return fullName;
    if (cleanDisplayPart(client.phone)) return cleanDisplayPart(client.phone);
    if (cleanDisplayPart(client.email)) return cleanDisplayPart(client.email);
  }

  if (appointment) {
    const apptFullName = [cleanDisplayPart(appointment.clientFirstName), cleanDisplayPart(appointment.clientLastName)]
      .filter(Boolean)
      .join(' ');
    if (apptFullName) return apptFullName;
    if (cleanDisplayPart(appointment.clientPhone)) return cleanDisplayPart(appointment.clientPhone);
    if (cleanDisplayPart(appointment.clientEmail)) return cleanDisplayPart(appointment.clientEmail);
  }

  return fallback;
}

export function isBookedStatus(status?: string): boolean {
  return status === 'booked' || status === 'confirmed';
}

export function getAppointmentTechnology(
  appointment: Appointment,
  services: Service[],
): BookingServiceType | null {
  return getServiceTypeById(services, appointment.serviceId);
}

export function isAppointmentOverdue(appointment: Appointment, now = new Date()): boolean {
  if (!isBookedStatus(appointment.status)) return false;

  const startsAt = new Date(appointment.dateTime.replace(' ', 'T'));
  if (Number.isNaN(startsAt.getTime())) return false;

  const endsAt = new Date(startsAt.getTime() + Math.max(appointment.duration || 0, 0) * 60_000);
  return endsAt < now;
}

export function getAppointmentStatusLabel(appointment: Appointment, now = new Date()): string {
  if (appointment.status === 'completed') return 'Effectuée';
  if (appointment.status === 'cancelled') return 'Annulée';
  return isAppointmentOverdue(appointment, now) ? 'À régulariser' : 'Planifiée';
}
