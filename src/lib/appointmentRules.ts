/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment, Service } from '../types';
import {
  getServiceTypeById,
  getServiceTypeLabel,
  getSlotAvailability,
  isCenterOpenForDateTime,
} from './bookingCapacityRules';

/**
 * Checks if a time string is a full hour (e.g. "10:00", "11:00", not "10:30")
 */
export function isFullHour(timeStr: string): boolean {
  if (!timeStr) return false;
  const parts = timeStr.split(':');
  if (parts.length < 2) return false;
  const minutes = parseInt(parts[1], 10);
  return minutes === 0;
}

/**
 * Checks if the reservation is made the day before prior to 21:30.
 * This is a prepared AQ8 business rule, ready to be toggled on/off.
 */
export function isBeforePreviousDayCutoff(appointmentDateTimeStr: string, creationDate: Date = new Date()): boolean {
  try {
    const aptDate = new Date(appointmentDateTimeStr);
    const cutoffDate = new Date(aptDate);
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    cutoffDate.setHours(21, 30, 0, 0);

    return creationDate.getTime() <= cutoffDate.getTime();
  } catch (e) {
    return true;
  }
}

interface ValidateAppointmentParams {
  clientId: string;
  serviceId: string;
  centerId: string;
  dateTime: string;
  duration: number;
}

/**
 * Validates a new appointment registration against center ownership,
 * opening hours and per-service hourly capacity.
 */
export function validateAppointment(
  params: ValidateAppointmentParams,
  existingAppointments: Appointment[],
  clientCenterId: string,
  services: Service[],
  excludeAppointmentId?: string,
): { valid: boolean; error?: string } {
  const { centerId, dateTime, serviceId } = params;

  if (!centerId) {
    return { valid: false, error: 'Chaque rendez-vous doit avoir un centre.' };
  }

  if (clientCenterId !== centerId) {
    return { valid: false, error: "L'adherent selectionne n'appartient pas a ce centre." };
  }

  const timePart = dateTime.split('T')[1];
  if (!timePart) {
    return { valid: false, error: 'Format de date et heure invalide.' };
  }

  if (!isFullHour(timePart)) {
    return { valid: false, error: 'Les reservations doivent se faire uniquement par heure complete (ex: 10:00).' };
  }

  if (!isCenterOpenForDateTime(centerId, dateTime)) {
    return { valid: false, error: "Ce creneau est en dehors des horaires d'ouverture du centre." };
  }

  const serviceType = getServiceTypeById(services, serviceId);
  if (!serviceType) {
    return { valid: false, error: 'Prestation introuvable ou inactive.' };
  }

  const availability = getSlotAvailability(
    existingAppointments,
    services,
    centerId,
    dateTime,
    serviceType,
    excludeAppointmentId,
  );

  if (!availability.isAvailable) {
    return {
      valid: false,
      error: `Capacite ${getServiceTypeLabel(serviceType)} atteinte sur ce creneau (${availability.booked}/${availability.capacity}).`,
    };
  }

  return { valid: true };
}
