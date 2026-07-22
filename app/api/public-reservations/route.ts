/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for Public Booking Requests
 * POST /api/public-reservations
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import {
  PublicBookingRequestInput,
  validatePublicBookingRequest,
} from '@/src/lib/publicFormValidation';
import {
  BookingServiceType,
  CenterCapacity,
  getBookingSlotId,
  getCenterBookingCapacity,
  getServiceTypeLabel,
  getSlotCapacity,
  isCenterOpenForDateTime,
  isBookingServiceType,
  CenterBookingConfig,
} from '@/src/lib/bookingCapacityRules';
import { sendPublicReservationNotifications } from '@/src/lib/serverEmailNotifications';
import type { Center, Service, ClientPackage } from '@/src/types';

type AppointmentSlotSource = 'manual' | 'booking_request' | 'backfill' | 'legacy';

type AppointmentSlotEntry = {
  appointmentId: string;
  serviceId: string;
  serviceType: BookingServiceType;
  source: AppointmentSlotSource;
  createdAt: string;
  requestId?: string;
};

type AppointmentSlot = {
  id: string;
  centerId: string;
  dateTime: string;
  status: 'available' | 'held' | 'full';
  capacities: CenterCapacity;
  counts: CenterCapacity;
  appointments: Record<string, AppointmentSlotEntry>;
  createdAt: string;
  updatedAt: string;
  migratedFromLegacy?: boolean;
};

function emptyCounts(): CenterCapacity {
  return { aq8: 0, wonder: 0 };
}

function recomputeSlot(slot: AppointmentSlot, center?: CenterBookingConfig): AppointmentSlot {
  const capacities = getCenterBookingCapacity(slot.centerId, center);
  const counts = emptyCounts();

  Object.values(slot.appointments).forEach(entry => {
    if (counts[entry.serviceType] !== undefined) {
      counts[entry.serviceType]++;
    }
  });

  const isAq8Full = counts.aq8 >= capacities.aq8;
  const isWonderFull = counts.wonder >= capacities.wonder;
  let status: 'available' | 'held' | 'full' = 'available';

  if (isAq8Full && isWonderFull) {
    status = 'full';
  } else if (counts.aq8 > 0 || counts.wonder > 0) {
    status = 'held';
  }

  return {
    ...slot,
    capacities,
    counts,
    status,
  };
}

function buildEmptyAppointmentSlot(centerId: string, dateTime: string, timestamp: string, center?: CenterBookingConfig): AppointmentSlot {
  return {
    id: getBookingSlotId(dateTime),
    centerId,
    dateTime,
    status: 'held',
    capacities: getCenterBookingCapacity(centerId, center),
    counts: emptyCounts(),
    appointments: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildPublicBookingSlot(slot: AppointmentSlot) {
  const [date, time] = slot.dateTime.split('T');
  return {
    id: slot.id,
    centerId: slot.centerId,
    dateTime: slot.dateTime,
    date: date || '',
    time: time || '',
    capacities: slot.capacities,
    counts: slot.counts,
    remaining: {
      aq8: Math.max(slot.capacities.aq8 - slot.counts.aq8, 0),
      wonder: Math.max(slot.capacities.wonder - slot.counts.wonder, 0),
    },
    updatedAt: slot.updatedAt,
  };
}

async function readAdminServiceType(transaction: any, db: any, serviceId: string): Promise<BookingServiceType> {
  const serviceSnapshot = await transaction.get(db.collection('services').doc(serviceId));
  if (!serviceSnapshot.exists) {
    throw new Error('Prestation introuvable.');
  }
  const service = serviceSnapshot.data() as Service;
  if (!isBookingServiceType(service.type)) {
    throw new Error('Type de prestation invalide.');
  }
  return service.type;
}

async function normalizeAdminSlot(
  transaction: any,
  db: any,
  snapshot: any,
  centerId: string,
  dateTime: string,
  timestamp: string,
  center?: CenterBookingConfig,
): Promise<AppointmentSlot> {
  const emptySlot = buildEmptyAppointmentSlot(centerId, dateTime, timestamp, center);
  if (!snapshot.exists) return emptySlot;

  const rawSlot = snapshot.data() as Record<string, unknown>;
  const rawAppointments = rawSlot.appointments;
  const appointments: Record<string, AppointmentSlotEntry> = {};

  if (rawAppointments && typeof rawAppointments === 'object' && !Array.isArray(rawAppointments)) {
    for (const [key, rawEntry] of Object.entries(rawAppointments as Record<string, Record<string, unknown>>)) {
      if (!rawEntry || typeof rawEntry !== 'object') continue;
      const appointmentId = String(rawEntry.appointmentId || key || '').trim();
      const serviceId = String(rawEntry.serviceId || '').trim();
      if (!appointmentId || !serviceId) continue;

      const rawType = String(rawEntry.serviceType || '');
      const serviceType = isBookingServiceType(rawType)
        ? rawType
        : await readAdminServiceType(transaction, db, serviceId);

      appointments[appointmentId] = {
        appointmentId,
        serviceId,
        serviceType,
        source: (rawEntry.source as AppointmentSlotSource) || 'legacy',
        createdAt: String(rawEntry.createdAt || rawSlot.createdAt || timestamp),
        ...(rawEntry.requestId ? { requestId: String(rawEntry.requestId) } : {}),
      };
    }
  }

  return recomputeSlot({
    ...emptySlot,
    createdAt: String(rawSlot.createdAt || timestamp),
    updatedAt: timestamp,
    appointments,
    migratedFromLegacy: Boolean(rawSlot.appointmentId && Object.keys(appointments).length > 0),
  }, center);
}

function addBookingHoldToSlot(slot: AppointmentSlot, entry: AppointmentSlotEntry, center?: CenterBookingConfig): AppointmentSlot {
  if (!isCenterOpenForDateTime(slot.centerId, slot.dateTime, center)) {
    throw new Error("Ce créneau est en dehors des horaires d'ouverture du centre.");
  }

  const booked = Object.values(slot.appointments).filter(candidate => (
    candidate.serviceType === entry.serviceType && candidate.appointmentId !== entry.appointmentId
  )).length;
  const capacity = getSlotCapacity(slot.centerId, entry.serviceType, center);

  if (booked >= capacity) {
    throw new Error(`Capacité ${getServiceTypeLabel(entry.serviceType)} atteinte sur ce créneau (${booked}/${capacity}).`);
  }

  return recomputeSlot({
    ...slot,
    appointments: {
      ...slot.appointments,
      [entry.appointmentId]: entry,
    },
  }, center);
}

function getAvailablePublicServiceTypes(center: Center, services: Service[]): BookingServiceType[] {
  const activeServiceIds = center.customActiveServices;
  if (activeServiceIds && activeServiceIds.length > 0) {
    return Array.from(new Set(
      services
        .filter(service => activeServiceIds.includes(service.id) && isBookingServiceType(service.type))
        .map(service => service.type)
    ));
  }
  return center.services.filter(isBookingServiceType);
}

function findReservableService(center: Center, services: Service[], serviceType: BookingServiceType): Service | undefined {
  const activeServiceIds = center.customActiveServices;
  return services.find(service => (
    service.type === serviceType && (!activeServiceIds || activeServiceIds.length === 0 || activeServiceIds.includes(service.id))
  ));
}

async function createPublicReservation(input: PublicBookingRequestInput) {
  const db = getAdminDb();
  const requestedCenterId = String(input.centerId || '').trim();
  if (!requestedCenterId) {
    throw new Error('Centre invalide. Veuillez choisir un centre disponible.');
  }

  const centerSnapshot = await db.collection('centers').doc(requestedCenterId).get();
  if (!centerSnapshot.exists) {
    throw new Error('Centre introuvable.');
  }

  const center = { id: centerSnapshot.id, ...(centerSnapshot.data() as Omit<Center, 'id'>) } as Center;
  const servicesSnapshot = await db.collection('services').get();
  const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
  const availableServiceTypes = getAvailablePublicServiceTypes(center, services);

  const validation = validatePublicBookingRequest(
    { ...input, centerName: center.name },
    availableServiceTypes,
    new Date(),
    center,
  );
  if (validation.valid === false) {
    throw new Error(validation.error);
  }

  const data = validation.data;
  const phoneSearch = String(data.phone || '').trim();
  let warningMessage: string | undefined = undefined;

  if (phoneSearch) {
    const clientsSnap = await db.collection('clients')
      .where('phone', '==', phoneSearch)
      .where('centerId', '==', data.centerId)
      .get();

    if (!clientsSnap.empty) {
      const clientDoc = clientsSnap.docs[0];
      const clientId = clientDoc.id;

      const pkgsSnap = await db.collection('client_packages')
        .where('clientId', '==', clientId)
        .get();

      const clientPkgs = pkgsSnap.docs.map(doc => doc.data() as ClientPackage);

      const hasActiveValidPackage = clientPkgs.some(cp => {
        if (cp.status !== 'active' || cp.sessionsRemaining <= 0) return false;
        if (!cp.purchaseDate) return false;
        const purchase = new Date(cp.purchaseDate);
        if (isNaN(purchase.getTime())) return false;
        const diffDays = (Date.now() - purchase.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 45;
      });

      if (!hasActiveValidPackage) {
        const appointmentsSnap = await db.collection('appointments')
          .where('clientId', '==', clientId)
          .where('status', '==', 'booked')
          .get();

        const requestsSnap = await db.collection('booking_requests')
          .where('phone', '==', phoneSearch)
          .where('centerId', '==', data.centerId)
          .where('status', '==', 'pending')
          .get();

        if (!appointmentsSnap.empty || !requestsSnap.empty) {
          throw new Error("Votre forfait est épuisé ou expiré et vous avez déjà une séance planifiée. Veuillez vous rendre au centre pour régler votre forfait afin de pouvoir réserver à nouveau.");
        } else {
          warningMessage = "Votre forfait est épuisé ou expiré. Votre créneau est pré-réservé, mais veuillez vous rendre au centre pour régler votre forfait lors de votre séance, sans quoi vous ne pourrez plus prendre de nouveaux rendez-vous.";
        }
      }
    }
  }

  const serviceType = data.service as BookingServiceType;
  const service = findReservableService(center, services, serviceType);
  if (!service) {
    throw new Error('Prestation indisponible dans ce centre.');
  }

  const createdAt = new Date().toISOString();
  const dateTime = `${data.bookingDate}T${data.bookingTime}`;
  const slotId = getBookingSlotId(dateTime);
  const requestRef = db.collection('booking_requests').doc();
  const centerRef = db.collection('centers').doc(data.centerId);
  const slotRef = db.collection('appointment_slots').doc(data.centerId).collection('slots').doc(slotId);
  const publicSlotRef = db.collection('public_booking_slots').doc(data.centerId).collection('slots').doc(slotId);
  let reservedCenter = center;

  await db.runTransaction(async transaction => {
    const transactionCenterSnapshot = await transaction.get(centerRef);
    if (!transactionCenterSnapshot.exists) {
      throw new Error('Centre introuvable.');
    }
    const transactionCenter = { id: transactionCenterSnapshot.id, ...(transactionCenterSnapshot.data() as Omit<Center, 'id'>) } as Center;
    reservedCenter = transactionCenter;

    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeAdminSlot(transaction, db, slotSnapshot, data.centerId, dateTime, createdAt, transactionCenter);
    const entryId = `request-${requestRef.id}`;
    const nextSlot = addBookingHoldToSlot(slot, {
      appointmentId: entryId,
      serviceId: service.id,
      serviceType,
      source: 'booking_request',
      createdAt,
      requestId: requestRef.id,
    }, transactionCenter);

    transaction.set(requestRef, {
      centerId: data.centerId,
      centerName: transactionCenter.name,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      service: data.service,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      status: 'pending',
      createdAt,
      reservedAt: createdAt,
    });
    transaction.set(slotRef, nextSlot);
    transaction.set(publicSlotRef, buildPublicBookingSlot(nextSlot));
  });

  const reservation = {
    reservationId: requestRef.id,
    centerName: reservedCenter.name,
    service: data.service,
    bookingDate: data.bookingDate,
    bookingTime: data.bookingTime,
    ...(warningMessage ? { warning: warningMessage } : {})
  };

  sendPublicReservationNotifications({
    center: reservedCenter,
    input: data,
    reservationId: requestRef.id,
  }).catch(error => {
    console.error('Public reservation email notification failed:', error);
  });

  return reservation;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PublicBookingRequestInput;
    const validation = validatePublicBookingRequest(body);

    if (validation.valid === false) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const reservation = await createPublicReservation(validation.data);
    return NextResponse.json({ ok: true, reservation, warning: (reservation as any).warning }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Réservation impossible pour ce créneau.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
