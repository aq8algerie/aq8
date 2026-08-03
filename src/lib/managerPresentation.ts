import { Appointment, Client, Service } from '../types';
import { BookingServiceType, getServiceTypeById } from './bookingCapacityRules';

function cleanDisplayPart(value: unknown): string {
  const text = String(value ?? '').trim();
  return /^(undefined|null|nan)$/i.test(text) ? '' : text;
}

export function getClientDisplayName(client?: Client, fallback = 'Adhérent inconnu'): string {
  if (!client) return fallback;

  const fullName = [cleanDisplayPart(client.firstName), cleanDisplayPart(client.lastName)]
    .filter(Boolean)
    .join(' ');

  return fullName
    || cleanDisplayPart(client.phone)
    || cleanDisplayPart(client.email)
    || 'Adhérent sans nom';
}

export function getAppointmentTechnology(
  appointment: Appointment,
  services: Service[],
): BookingServiceType | null {
  return getServiceTypeById(services, appointment.serviceId);
}

export function isAppointmentOverdue(appointment: Appointment, now = new Date()): boolean {
  if (appointment.status !== 'booked') return false;

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
