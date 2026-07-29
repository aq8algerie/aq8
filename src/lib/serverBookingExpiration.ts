import type { Firestore } from 'firebase-admin/firestore';
import {
  type BookingServiceType,
  type CenterBookingConfig,
  type CenterCapacity,
  getBookingSlotId,
  getCenterBookingCapacity,
} from './bookingCapacityRules';

type AppointmentSlotEntry = {
  appointmentId: string;
  serviceId: string;
  serviceType: BookingServiceType;
  source: 'manual' | 'booking_request' | 'backfill' | 'legacy';
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
};

const EXPIRATION_DELAY_MS = 48 * 60 * 60 * 1000;

function recomputeSlot(
  slot: AppointmentSlot,
  center?: CenterBookingConfig,
): AppointmentSlot {
  const capacities = getCenterBookingCapacity(slot.centerId, center);
  const counts: CenterCapacity = { aq8: 0, wonder: 0 };

  for (const entry of Object.values(slot.appointments)) {
    if (entry.serviceType === 'aq8' || entry.serviceType === 'wonder') {
      counts[entry.serviceType] += 1;
    }
  }

  const full = counts.aq8 >= capacities.aq8 && counts.wonder >= capacities.wonder;
  const held = counts.aq8 > 0 || counts.wonder > 0;

  return {
    ...slot,
    capacities,
    counts,
    status: full ? 'full' : held ? 'held' : 'available',
  };
}

function buildPublicSlot(slot: AppointmentSlot) {
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

export async function expirePendingBookingRequests(db: Firestore): Promise<number> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - EXPIRATION_DELAY_MS).toISOString();
  const pendingSnapshot = await db.collection('booking_requests')
    .where('status', '==', 'pending')
    .get();

  let expiredCount = 0;

  for (const pendingDocument of pendingSnapshot.docs) {
    const didExpire = await db.runTransaction(async transaction => {
      const requestRef = pendingDocument.ref;
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists) return false;

      const request = requestSnapshot.data();
      const createdAt = String(request.createdAt || '');
      if (request.status !== 'pending' || !createdAt || createdAt >= cutoff) {
        return false;
      }

      const centerId = String(request.centerId || '');
      const bookingDate = String(request.bookingDate || '');
      const bookingTime = String(request.bookingTime || '');
      if (!centerId || !bookingDate || !bookingTime) {
        return false;
      }

      const dateTime = `${bookingDate}T${bookingTime}`;
      const slotId = getBookingSlotId(dateTime);
      const centerRef = db.collection('centers').doc(centerId);
      const slotRef = db.collection('appointment_slots').doc(centerId).collection('slots').doc(slotId);
      const publicSlotRef = db.collection('public_booking_slots').doc(centerId).collection('slots').doc(slotId);
      const auditRef = db.collection('audit_events').doc();

      const [centerSnapshot, slotSnapshot] = await Promise.all([
        transaction.get(centerRef),
        transaction.get(slotRef),
      ]);

      const timestamp = now.toISOString();
      transaction.update(requestRef, {
        status: 'rejected',
        statusReason: 'expired_48h',
        processedAt: timestamp,
        processedBy: 'system',
        expiredAt: timestamp,
        updatedAt: timestamp,
      });

      if (slotSnapshot.exists) {
        const slot = slotSnapshot.data() as AppointmentSlot;
        const appointments = { ...(slot.appointments || {}) };

        for (const [entryId, entry] of Object.entries(appointments)) {
          if (entryId === `request-${pendingDocument.id}` || entry.requestId === pendingDocument.id) {
            delete appointments[entryId];
          }
        }

        const center = centerSnapshot.exists
          ? ({ id: centerSnapshot.id, ...centerSnapshot.data() } as CenterBookingConfig)
          : undefined;
        const nextSlot = recomputeSlot({
          ...slot,
          appointments,
          updatedAt: timestamp,
        }, center);

        if (Object.keys(nextSlot.appointments).length === 0) {
          transaction.delete(slotRef);
          transaction.delete(publicSlotRef);
        } else {
          transaction.set(slotRef, nextSlot);
          transaction.set(publicSlotRef, buildPublicSlot(nextSlot));
        }
      }

      transaction.set(auditRef, {
        action: 'booking_request.expired',
        actorUid: 'system',
        actorRole: 'system',
        centerId,
        entityType: 'booking_request',
        entityId: pendingDocument.id,
        createdAt: timestamp,
        metadata: { reason: 'expired_48h' },
      });

      return true;
    });

    if (didExpire) expiredCount += 1;
  }

  return expiredCount;
}
