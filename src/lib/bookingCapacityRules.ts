import { Appointment, Service } from '../types';

export type BookingServiceType = Service['type'];
export type CenterCapacity = Record<BookingServiceType, number>;

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type TimeRange = { start: string; end: string };
type WeeklyOpeningHours = Partial<Record<DayIndex, TimeRange[]>>;

type CenterBookingProfile = {
  capacities: CenterCapacity;
  weeklyHours: WeeklyOpeningHours;
};

const DEFAULT_CAPACITY: CenterCapacity = { aq8: 1, wonder: 1 };
const DEFAULT_WEEKLY_HOURS: WeeklyOpeningHours = {
  0: [{ start: '09:00', end: '20:00' }],
  1: [{ start: '09:00', end: '20:00' }],
  2: [{ start: '09:00', end: '20:00' }],
  3: [{ start: '09:00', end: '20:00' }],
  4: [{ start: '09:00', end: '20:00' }],
  6: [{ start: '09:00', end: '20:00' }],
};

export const CENTER_BOOKING_PROFILES: Record<string, CenterBookingProfile> = {
  'center-1': {
    capacities: { aq8: 3, wonder: 1 },
    weeklyHours: {
      0: [{ start: '09:00', end: '14:00' }],
      2: [{ start: '09:00', end: '14:00' }],
      4: [{ start: '09:00', end: '14:00' }],
      6: [{ start: '09:00', end: '14:00' }],
    },
  },
  'center-2': {
    capacities: { aq8: 2, wonder: 1 },
    weeklyHours: {
      0: [{ start: '10:00', end: '19:00' }],
      1: [{ start: '10:00', end: '19:00' }],
      2: [{ start: '10:00', end: '19:00' }],
      3: [{ start: '10:00', end: '19:00' }],
      4: [{ start: '10:00', end: '19:00' }],
      6: [{ start: '10:00', end: '16:00' }],
    },
  },
  'center-3': {
    capacities: { aq8: 1, wonder: 1 },
    weeklyHours: {
      0: [{ start: '09:00', end: '17:00' }],
      1: [{ start: '16:00', end: '19:00' }],
      2: [{ start: '13:00', end: '19:00' }],
      3: [{ start: '16:00', end: '19:00' }],
      6: [{ start: '09:00', end: '17:00' }],
    },
  },
  'center-4': {
    capacities: { aq8: 2, wonder: 1 },
    weeklyHours: {
      0: [{ start: '09:00', end: '23:00' }],
      1: [{ start: '09:00', end: '23:00' }],
      2: [{ start: '09:00', end: '23:00' }],
      3: [{ start: '09:00', end: '23:00' }],
      4: [{ start: '09:00', end: '23:00' }],
      6: [{ start: '09:00', end: '23:00' }],
    },
  },
  'center-5': {
    capacities: { aq8: 3, wonder: 1 },
    weeklyHours: {
      0: [{ start: '09:00', end: '21:00' }],
      1: [{ start: '09:00', end: '21:00' }],
      2: [{ start: '09:00', end: '21:00' }],
      3: [{ start: '09:00', end: '21:00' }],
      4: [{ start: '09:00', end: '21:00' }],
      6: [{ start: '10:00', end: '21:00' }],
    },
  },
};

export const BOOKING_SERVICE_TYPES: BookingServiceType[] = ['aq8', 'wonder'];

export const ALL_BOOKING_HOURS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
] as const;

function parseHourToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatMinutesAsHour(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:00`;
}

function toDateAtLocalMidnight(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isBookingServiceType(value: string): value is BookingServiceType {
  return BOOKING_SERVICE_TYPES.includes(value as BookingServiceType);
}

export function getServiceTypeById(services: Service[], serviceId: string): BookingServiceType | null {
  return services.find(service => service.id === serviceId)?.type ?? null;
}

export function getServiceTypeLabel(serviceType: BookingServiceType): string {
  return serviceType === 'aq8' ? 'AQ8 EMS' : 'Wonder';
}

export function getCenterBookingCapacity(centerId: string): CenterCapacity {
  return CENTER_BOOKING_PROFILES[centerId]?.capacities ?? DEFAULT_CAPACITY;
}

export function getSlotCapacity(centerId: string, serviceType: BookingServiceType): number {
  return getCenterBookingCapacity(centerId)[serviceType] ?? 0;
}

export function getCenterWeeklyOpeningHours(centerId: string): WeeklyOpeningHours {
  return CENTER_BOOKING_PROFILES[centerId]?.weeklyHours ?? DEFAULT_WEEKLY_HOURS;
}

export function getBookingHoursForDate(centerId: string, dateStr: string): string[] {
  const date = toDateAtLocalMidnight(dateStr);
  if (!date) return [];

  const day = date.getDay() as DayIndex;
  const ranges = getCenterWeeklyOpeningHours(centerId)[day] ?? [];
  const hours = new Set<string>();

  for (const range of ranges) {
    const start = parseHourToMinutes(range.start);
    const end = parseHourToMinutes(range.end);
    if (start === null || end === null || end <= start) continue;

    for (let current = start; current + 60 <= end; current += 60) {
      hours.add(formatMinutesAsHour(current));
    }
  }

  return [...hours].sort();
}

export function isCenterOpenForDateTime(centerId: string, dateTime: string): boolean {
  const [dateStr, timeStr] = dateTime.split('T');
  if (!dateStr || !timeStr) return false;

  const normalizedHour = `${timeStr.slice(0, 2)}:00`;
  return getBookingHoursForDate(centerId, dateStr).includes(normalizedHour);
}

export function countActiveAppointmentsForSlot(
  appointments: Appointment[],
  services: Service[],
  centerId: string,
  dateTime: string,
  serviceType: BookingServiceType,
  excludeAppointmentId?: string,
): number {
  return appointments.filter(appointment => {
    if (appointment.id === excludeAppointmentId) return false;
    if (appointment.centerId !== centerId) return false;
    if (appointment.dateTime !== dateTime) return false;
    if (appointment.status === 'cancelled') return false;

    return getServiceTypeById(services, appointment.serviceId) === serviceType;
  }).length;
}

export function getSlotAvailability(
  appointments: Appointment[],
  services: Service[],
  centerId: string,
  dateTime: string,
  serviceType: BookingServiceType,
  excludeAppointmentId?: string,
) {
  const capacity = getSlotCapacity(centerId, serviceType);
  const booked = countActiveAppointmentsForSlot(appointments, services, centerId, dateTime, serviceType, excludeAppointmentId);
  const isOpen = isCenterOpenForDateTime(centerId, dateTime);

  return {
    capacity,
    booked,
    remaining: Math.max(capacity - booked, 0),
    isOpen,
    isAvailable: capacity > booked && isOpen,
  };
}

export function getCapacitySummary(centerId: string): string {
  const capacity = getCenterBookingCapacity(centerId);
  return `${capacity.aq8} AQ8 + ${capacity.wonder} Wonder / heure`;
}

export function getNextOpenBookingDate(centerId: string, minDateStr: string, maxDays = 45): string {
  const startDate = toDateAtLocalMidnight(minDateStr) ?? new Date();

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + offset);
    const candidateStr = toLocalDateString(candidate);
    if (getBookingHoursForDate(centerId, candidateStr).length > 0) {
      return candidateStr;
    }
  }

  return minDateStr;
}
