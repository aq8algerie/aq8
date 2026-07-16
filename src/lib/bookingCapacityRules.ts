import { Appointment, Center, Service } from '../types';

export type BookingServiceType = Service['type'];
export type CenterCapacity = Record<BookingServiceType, number>;
export type BookingDayKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';
export type TimeRange = { start: string; end: string };
export type WeeklyOpeningHours = Partial<Record<BookingDayKey, TimeRange[]>>;
export type CenterBookingConfig = Pick<Center, 'bookingCapacity' | 'bookingHours'> | null | undefined;

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type CenterBookingProfile = {
  capacities: CenterCapacity;
  weeklyHours: WeeklyOpeningHours;
};

const DEFAULT_CAPACITY: CenterCapacity = { aq8: 1, wonder: 1 };
const DEFAULT_WEEKLY_HOURS: WeeklyOpeningHours = {
  '0': [{ start: '09:00', end: '20:00' }],
  '1': [{ start: '09:00', end: '20:00' }],
  '2': [{ start: '09:00', end: '20:00' }],
  '3': [{ start: '09:00', end: '20:00' }],
  '4': [{ start: '09:00', end: '20:00' }],
  '6': [{ start: '09:00', end: '20:00' }],
};

export const BOOKING_DAY_KEYS: BookingDayKey[] = ['0', '1', '2', '3', '4', '5', '6'];

export const CENTER_BOOKING_PROFILES: Record<string, CenterBookingProfile> = {
  'center-1': {
    capacities: { aq8: 3, wonder: 1 },
    weeklyHours: {
      '0': [{ start: '09:00', end: '14:00' }],
      '2': [{ start: '09:00', end: '14:00' }],
      '4': [{ start: '09:00', end: '14:00' }],
      '6': [{ start: '09:00', end: '14:00' }],
    },
  },
  'center-2': {
    capacities: { aq8: 2, wonder: 1 },
    weeklyHours: {
      '0': [{ start: '10:00', end: '19:00' }],
      '1': [{ start: '10:00', end: '19:00' }],
      '2': [{ start: '10:00', end: '19:00' }],
      '3': [{ start: '10:00', end: '19:00' }],
      '4': [{ start: '10:00', end: '19:00' }],
      '6': [{ start: '10:00', end: '16:00' }],
    },
  },
  'center-3': {
    capacities: { aq8: 1, wonder: 1 },
    weeklyHours: {
      '0': [{ start: '09:00', end: '17:00' }],
      '1': [{ start: '16:00', end: '19:00' }],
      '2': [{ start: '13:00', end: '19:00' }],
      '3': [{ start: '16:00', end: '19:00' }],
      '6': [{ start: '09:00', end: '17:00' }],
    },
  },
  'center-4': {
    capacities: { aq8: 2, wonder: 1 },
    weeklyHours: {
      '0': [{ start: '09:00', end: '23:00' }],
      '1': [{ start: '09:00', end: '23:00' }],
      '2': [{ start: '09:00', end: '23:00' }],
      '3': [{ start: '09:00', end: '23:00' }],
      '4': [{ start: '09:00', end: '23:00' }],
      '6': [{ start: '09:00', end: '23:00' }],
    },
  },
  'center-5': {
    capacities: { aq8: 3, wonder: 1 },
    weeklyHours: {
      '0': [{ start: '09:00', end: '21:00' }],
      '1': [{ start: '09:00', end: '21:00' }],
      '2': [{ start: '09:00', end: '21:00' }],
      '3': [{ start: '09:00', end: '21:00' }],
      '4': [{ start: '09:00', end: '21:00' }],
      '6': [{ start: '10:00', end: '21:00' }],
    },
  },
};

export const BOOKING_SERVICE_TYPES: BookingServiceType[] = ['aq8', 'wonder'];

export const ALL_BOOKING_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
] as const;

export function getBookingSlotId(dateTime: string): string {
  return encodeURIComponent(dateTime.trim());
}

function parseHourToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours === 24 && minutes === 0) return 24 * 60;
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

function cloneWeeklyHours(hours: WeeklyOpeningHours): WeeklyOpeningHours {
  const next: WeeklyOpeningHours = {};
  for (const key of BOOKING_DAY_KEYS) {
    const ranges = hours[key] ?? [];
    if (ranges.length > 0) {
      next[key] = ranges.map(range => ({ start: range.start, end: range.end }));
    }
  }
  return next;
}

function getDefaultProfile(centerId: string): CenterBookingProfile {
  return CENTER_BOOKING_PROFILES[centerId] ?? {
    capacities: DEFAULT_CAPACITY,
    weeklyHours: DEFAULT_WEEKLY_HOURS,
  };
}

function normalizeCapacity(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(20, Math.floor(value)));
}

function normalizeRanges(ranges: unknown): TimeRange[] {
  if (!Array.isArray(ranges)) return [];

  return ranges
    .map(range => {
      if (!range || typeof range !== 'object') return null;
      const raw = range as Record<string, unknown>;
      const start = typeof raw.start === 'string' ? raw.start : '';
      const end = typeof raw.end === 'string' ? raw.end : '';
      const startMinutes = parseHourToMinutes(start);
      const endMinutes = parseHourToMinutes(end);
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
      return { start, end };
    })
    .filter((range): range is TimeRange => Boolean(range))
    .sort((a, b) => (parseHourToMinutes(a.start) ?? 0) - (parseHourToMinutes(b.start) ?? 0));
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

export function getDefaultCenterBookingCapacity(centerId: string): CenterCapacity {
  return { ...getDefaultProfile(centerId).capacities };
}

export function getDefaultCenterWeeklyOpeningHours(centerId: string): WeeklyOpeningHours {
  return cloneWeeklyHours(getDefaultProfile(centerId).weeklyHours);
}

export function getCenterBookingCapacity(centerId: string, center?: CenterBookingConfig): CenterCapacity {
  const defaults = getDefaultProfile(centerId).capacities;
  const configured = center?.bookingCapacity;

  return {
    aq8: normalizeCapacity(configured?.aq8, defaults.aq8),
    wonder: normalizeCapacity(configured?.wonder, defaults.wonder),
  };
}

export function getSlotCapacity(centerId: string, serviceType: BookingServiceType, center?: CenterBookingConfig): number {
  return getCenterBookingCapacity(centerId, center)[serviceType] ?? 0;
}

export function getCenterWeeklyOpeningHours(centerId: string, center?: CenterBookingConfig): WeeklyOpeningHours {
  const configured = center?.bookingHours;
  if (configured && typeof configured === 'object') {
    const next: WeeklyOpeningHours = {};
    for (const key of BOOKING_DAY_KEYS) {
      const ranges = normalizeRanges(configured[key]);
      if (ranges.length > 0) {
        next[key] = ranges;
      }
    }
    return next;
  }

  return getDefaultCenterWeeklyOpeningHours(centerId);
}

export function getBookingHoursForDate(centerId: string, dateStr: string, center?: CenterBookingConfig): string[] {
  const date = toDateAtLocalMidnight(dateStr);
  if (!date) return [];

  const day = String(date.getDay() as DayIndex) as BookingDayKey;
  const ranges = getCenterWeeklyOpeningHours(centerId, center)[day] ?? [];
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

export function isCenterOpenForDateTime(centerId: string, dateTime: string, center?: CenterBookingConfig): boolean {
  const [dateStr, timeStr] = dateTime.split('T');
  if (!dateStr || !timeStr) return false;

  const normalizedHour = `${timeStr.slice(0, 2)}:00`;
  return getBookingHoursForDate(centerId, dateStr, center).includes(normalizedHour);
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
  center?: CenterBookingConfig,
) {
  const capacity = getSlotCapacity(centerId, serviceType, center);
  const booked = countActiveAppointmentsForSlot(appointments, services, centerId, dateTime, serviceType, excludeAppointmentId);
  const isOpen = isCenterOpenForDateTime(centerId, dateTime, center);

  return {
    capacity,
    booked,
    remaining: Math.max(capacity - booked, 0),
    isOpen,
    isAvailable: capacity > booked && isOpen,
  };
}

export function getCapacitySummary(centerId: string, center?: CenterBookingConfig): string {
  const capacity = getCenterBookingCapacity(centerId, center);
  return `${capacity.aq8} AQ8 + ${capacity.wonder} Wonder / heure`;
}

export function getNextOpenBookingDate(centerId: string, minDateStr: string, maxDays = 45, center?: CenterBookingConfig): string {
  const startDate = toDateAtLocalMidnight(minDateStr) ?? new Date();

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + offset);
    const candidateStr = toLocalDateString(candidate);
    if (getBookingHoursForDate(centerId, candidateStr, center).length > 0) {
      return candidateStr;
    }
  }

  return minDateStr;
}
