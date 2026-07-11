/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment } from '../types';

/**
 * Checks if a time string is a full hour (e.g. "10:00", "11:00", not "10:30")
 */
export function isFullHour(timeStr: string): boolean {
  if (!timeStr) return false;
  // Format could be HH:mm or HH:mm:ss
  const parts = timeStr.split(':');
  if (parts.length < 2) return false;
  const minutes = parseInt(parts[1], 10);
  return minutes === 0;
}

/**
 * Checks if the reservation is made the day before prior to 21:30
 * This is a prepared AQ8 business rule, ready to be toggled on/off.
 */
export function isBeforePreviousDayCutoff(appointmentDateTimeStr: string, creationDate: Date = new Date()): boolean {
  try {
    const aptDate = new Date(appointmentDateTimeStr);
    
    // Calculate the cutoff time: day before at 21:30
    const cutoffDate = new Date(aptDate);
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    cutoffDate.setHours(21, 30, 0, 0);

    return creationDate.getTime() <= cutoffDate.getTime();
  } catch (e) {
    return true; // Graceful fallback
  }
}

interface ValidateAppointmentParams {
  clientId: string;
  serviceId: string;
  centerId: string;
  dateTime: string; // "YYYY-MM-DDTHH:mm"
  duration: number;
}

/**
 * Validates a new appointment registration
 */
export function validateAppointment(
  params: ValidateAppointmentParams,
  existingAppointments: Appointment[],
  clientCenterId: string
): { valid: boolean; error?: string } {
  const { clientId, centerId, dateTime } = params;

  // 1. Ensure centerId matches
  if (!centerId) {
    return { valid: false, error: 'Chaque rendez-vous doit avoir un CenterId.' };
  }

  // 2. Ensure client belongs to the correct center
  if (clientCenterId !== centerId) {
    return { valid: false, error: "L'adhérent sélectionné n'appartient pas à ce centre." };
  }

  // Extract time from dateTime
  const timePart = dateTime.split('T')[1];
  if (!timePart) {
    return { valid: false, error: 'Format de date et heure invalide.' };
  }

  // 3. Ensure full hour restriction
  if (!isFullHour(timePart)) {
    return { valid: false, error: 'Les réservations doivent se faire uniquement par heure complète (ex: 10:00).' };
  }

  // 4. Ensure no duplicate slot exists in the same center, same date, same hour
  const hasDuplicate = existingAppointments.some(apt => {
    return (
      apt.centerId === centerId &&
      apt.dateTime === dateTime &&
      apt.status !== 'cancelled'
    );
  });

  if (hasDuplicate) {
    return { valid: false, error: 'Ce créneau horaire est déjà réservé dans votre centre.' };
  }

  return { valid: true };
}
