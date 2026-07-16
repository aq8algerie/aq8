/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Center {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  imageUrl: string;
  services: ('aq8' | 'wonder')[];
  schedule: string;
  description: string;
  slug?: string;
  status?: string;
  importantNotes?: string[];
  menHours?: string[];
  womenHours?: string[];
  equipment?: string[];
  cancellationRule?: string;
  customServicePrices?: Record<string, number>;
  customPackagePrices?: Record<string, number>;
  customActiveServices?: string[];
  customActivePackages?: string[];
  bookingCapacity?: Partial<Record<'aq8' | 'wonder', number>>;
  bookingHours?: Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', Array<{ start: string; end: string }>>>;
}

export interface CenterManager {
  id: string;
  name: string;
  email: string;
  centerId: string;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  type: 'aq8' | 'wonder';
  duration: number; // in minutes
  price: number; // in DZD
  description: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  centerId: string;
  createdAt: string;
  notes?: string;
  gender?: 'H' | 'F';
  dob?: string;
  bloodType?: string;
  profession?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string;
  sportGoals?: string[];
  avatarUrl?: string;
}

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  centerId: string;
  dateTime: string; // ISO string or YYYY-MM-DD HH:mm
  duration: number; // in minutes
  status: AppointmentStatus;
  notes?: string;
}

export interface Package {
  id: string;
  name: string;
  type: 'aq8' | 'wonder' | 'mix';
  sessionsCount: number;
  price: number; // in DZD
  description: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  centerId: string;
  sessionsRemaining: number;
  totalSessions: number;
  purchaseDate: string;
  status: 'active' | 'completed' | 'expired';
}

export interface Payment {
  id: string;
  clientId: string;
  packageId: string;
  centerId: string;
  amount: number; // in DZD
  date: string;
  method: 'cash' | 'card' | 'ccp' | 'cheque';
  receiptNumber?: string;
}

export interface Measurement {
  id: string;
  clientId: string;
  centerId: string;
  date: string; // YYYY-MM-DD
  weight: number; // kg
  bodyFat?: number; // %
  muscleMass?: number; // %
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  thighs?: number; // cm
  loggedBy: string; // manager name or ID
}

export interface GeneralSettings {
  appName: string;
  contactEmail: string;
  contactPhone: string;
  addressAlgérie: string;
  currency: string;
  enableVoucherPromo: boolean;
}

export type BookingRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface BookingRequest {
  id: string;
  centerId: string;
  centerName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingRequestStatus;
  createdAt: string;
}
