import { Appointment, Center, Service } from '../types';
import {
  BookingServiceType,
  getBookingHoursForDate,
  getCenterBookingCapacity,
  getServiceTypeById,
} from './bookingCapacityRules';

export type OccupancyMetric = {
  booked: number;
  capacity: number;
  rate: number;
};

export type MonthToDateOccupancy = Record<BookingServiceType, OccupancyMetric>;

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAppointmentDate(value: string): Date | null {
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getMonthToDateOccupancy(input: {
  appointments: Appointment[];
  services: Service[];
  centerId: string;
  center?: Pick<Center, 'bookingCapacity' | 'bookingHours'> | null;
  now?: Date;
}): MonthToDateOccupancy {
  const now = input.now ?? new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const configuredCapacity = getCenterBookingCapacity(input.centerId, input.center);

  let availableHours = 0;
  for (const date = new Date(monthStart); date < tomorrowStart; date.setDate(date.getDate() + 1)) {
    availableHours += getBookingHoursForDate(
      input.centerId,
      toLocalDateString(date),
      input.center,
    ).length;
  }

  const booked: Record<BookingServiceType, number> = { aq8: 0, wonder: 0 };
  for (const appointment of input.appointments) {
    if (appointment.centerId !== input.centerId || appointment.status === 'cancelled') continue;

    const appointmentDate = parseAppointmentDate(appointment.dateTime);
    if (!appointmentDate || appointmentDate < monthStart || appointmentDate >= tomorrowStart) continue;

    const serviceType = getServiceTypeById(input.services, appointment.serviceId);
    if (serviceType) booked[serviceType] += 1;
  }

  const buildMetric = (serviceType: BookingServiceType): OccupancyMetric => {
    const capacity = availableHours * configuredCapacity[serviceType];
    return {
      booked: booked[serviceType],
      capacity,
      rate: capacity > 0 ? Math.min(100, Math.round((booked[serviceType] / capacity) * 100)) : 0,
    };
  };

  return {
    aq8: buildMetric('aq8'),
    wonder: buildMetric('wonder'),
  };
}
