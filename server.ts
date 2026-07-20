import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import next from 'next';
import { applicationDefault, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { DocumentSnapshot, Firestore, Transaction, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Import mock database
import { AQ8Database } from './src/mockData';
import { Appointment, Center, Service } from './src/types';
import {
  PublicBookingRequestInput,
  validatePublicBookingRequest,
  validatePublicContactMessage,
} from './src/lib/publicFormValidation';
import {
  BookingServiceType,
  CenterBookingConfig,
  CenterCapacity,
  getBookingSlotId,
  getCenterBookingCapacity,
  getServiceTypeLabel,
  getSlotCapacity,
  isCenterOpenForDateTime,
} from './src/lib/bookingCapacityRules';
import {
  CrmEmailNotificationPayload,
  sendCrmEmailNotification,
  getEmailNotificationDiagnostics,
  sendPublicContactNotifications,
  sendPublicReservationNotifications,
} from './src/lib/serverEmailNotifications';

const PORT = Number(process.env.PORT || 3000);

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
  status: 'held';
  capacities: CenterCapacity;
  counts: CenterCapacity;
  appointments: Record<string, AppointmentSlotEntry>;
  createdAt: string;
  updatedAt: string;
  migratedFromLegacy?: boolean;
};

type CrmUserProfile = {
  role?: string;
  centerId?: string | null;
  active?: boolean;
};

function ensureAdminApp() {
  if (getAdminApps().length === 0) {
    initializeAdminApp({ credential: applicationDefault() });
  }
}

function getAdminDb(): Firestore {
  ensureAdminApp();
  return getAdminFirestore();
}

function getAdminAuthInstance() {
  ensureAdminApp();
  return getAdminAuth();
}

function isBookingServiceType(value: unknown): value is BookingServiceType {
  return value === 'aq8' || value === 'wonder';
}

function emptyCounts(): CenterCapacity {
  return { aq8: 0, wonder: 0 };
}

function recomputeSlot(slot: AppointmentSlot, center?: CenterBookingConfig): AppointmentSlot {
  const counts = emptyCounts();
  for (const entry of Object.values(slot.appointments)) {
    counts[entry.serviceType] += 1;
  }
  return { ...slot, capacities: getCenterBookingCapacity(slot.centerId, center), counts };
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

async function readAdminServiceType(transaction: Transaction, db: Firestore, serviceId: string): Promise<BookingServiceType> {
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
  transaction: Transaction,
  db: Firestore,
  snapshot: DocumentSnapshot,
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

      const serviceType = isBookingServiceType(rawEntry.serviceType)
        ? rawEntry.serviceType
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

  if (Object.keys(appointments).length === 0 && rawSlot.appointmentId) {
    const appointmentId = String(rawSlot.appointmentId);
    const appointmentSnapshot = await transaction.get(db.collection('appointments').doc(appointmentId));
    if (appointmentSnapshot.exists) {
      const appointment = appointmentSnapshot.data() as Appointment;
      if (appointment.centerId === centerId && appointment.dateTime === dateTime && appointment.status !== 'cancelled') {
        const serviceType = await readAdminServiceType(transaction, db, appointment.serviceId);
        appointments[appointment.id] = {
          appointmentId: appointment.id,
          serviceId: appointment.serviceId,
          serviceType,
          source: (rawSlot.source as AppointmentSlotSource) || 'legacy',
          createdAt: String(rawSlot.createdAt || rawSlot.backfilledAt || timestamp),
        };
      }
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
    throw new Error("Ce creneau est en dehors des horaires d'ouverture du centre.");
  }

  const booked = Object.values(slot.appointments).filter(candidate => (
    candidate.serviceType === entry.serviceType && candidate.appointmentId !== entry.appointmentId
  )).length;
  const capacity = getSlotCapacity(slot.centerId, entry.serviceType, center);

  if (booked >= capacity) {
    throw new Error(`Capacite ${getServiceTypeLabel(entry.serviceType)} atteinte sur ce creneau (${booked}/${capacity}).`);
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

function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && String(value[key]).trim().length > 0;
}

function isCrmEmailPayload(value: unknown): value is CrmEmailNotificationPayload {
  if (!isPlainObject(value) || !hasString(value, 'type') || !hasString(value, 'centerId')) return false;

  switch (value.type) {
    case 'booking_request_accepted':
      return hasString(value, 'requestId');
    case 'booking_request_rejected':
      return hasString(value, 'requestId');
    case 'appointment_booked':
    case 'appointment_updated':
    case 'appointment_cancelled':
    case 'appointment_completed':
      return hasString(value, 'appointmentId');
    case 'package_assigned':
      return hasString(value, 'clientPackageId');
    case 'payment_recorded':
      return hasString(value, 'paymentId');
    default:
      return false;
  }
}

async function verifyCrmEmailAccess(req: express.Request, centerId: string): Promise<void> {
  const authorization = req.header('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw httpError('Authentification CRM requise.', 401);
  }

  const decodedToken = await getAdminAuthInstance().verifyIdToken(match[1]);
  const profileSnapshot = await getAdminDb().collection('users').doc(decodedToken.uid).get();
  if (!profileSnapshot.exists) {
    throw httpError('Profil CRM introuvable.', 403);
  }

  const profile = profileSnapshot.data() as CrmUserProfile;
  if (profile.active !== true || (profile.role !== 'super_admin' && profile.role !== 'center_manager')) {
    throw httpError('Profil CRM non autorise.', 403);
  }

  if (profile.role === 'center_manager' && profile.centerId !== centerId) {
    throw httpError('Ce centre ne correspond pas au manager connecte.', 403);
  }
}

async function createPublicContactMessage(input: unknown) {
  const db = getAdminDb();
  const centersSnapshot = await db.collection('centers').get();
  const centers = centersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Center));
  const validation = validatePublicContactMessage(input as Parameters<typeof validatePublicContactMessage>[0], centers.map(center => center.id));

  if (validation.valid === false) {
    throw httpError(validation.error, 400);
  }

  const createdAt = new Date().toISOString();
  const messageRef = await db.collection('contact_messages').add({
    ...validation.data,
    status: 'new',
    createdAt,
  });

  const selectedCenter = centers.find(center => center.id === validation.data.centerId) || null;
  sendPublicContactNotifications({
    center: selectedCenter,
    messageId: messageRef.id,
    message: validation.data,
  }).catch(error => {
    console.error('Public contact email notification failed:', error);
  });

  return { messageId: messageRef.id };
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

async function checkAndExpirePendingBookings(db: Firestore) {
  const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  
  try {
    console.log(`[Cleaner] Checking for pending bookings older than 48 hours (cutoff: ${cutoffTime})...`);
    
    const pendingSnap = await db.collection('booking_requests')
      .where('status', '==', 'pending')
      .get();
      
    if (pendingSnap.empty) {
      console.log('[Cleaner] No pending booking requests found.');
      return;
    }
    
    let expiredCount = 0;
    
    for (const docSnap of pendingSnap.docs) {
      const request = docSnap.data();
      const createdAt = request.createdAt || '';
      
      if (createdAt && createdAt < cutoffTime) {
        const requestId = docSnap.id;
        const centerId = request.centerId;
        const bookingDate = request.bookingDate;
        const bookingTime = request.bookingTime;
        
        console.log(`[Cleaner] Expiring booking request ${requestId} (created at ${createdAt}) at center ${centerId}`);
        
        await db.runTransaction(async transaction => {
          // 1. Mark request as expired
          transaction.update(docSnap.ref, { 
            status: 'expired',
            updatedAt: new Date().toISOString()
          });
          
          // 2. Load center config
          const centerRef = db.collection('centers').doc(centerId);
          const centerSnap = await transaction.get(centerRef);
          
          let centerConfig: any = undefined;
          if (centerSnap.exists) {
            centerConfig = { id: centerSnap.id, ...centerSnap.data() };
          }
          
          // 3. Load the corresponding slot
          const dateTime = `${bookingDate}T${bookingTime}`;
          const slotId = getBookingSlotId(dateTime);
          const slotRef = db.collection('appointment_slots').doc(centerId).collection('slots').doc(slotId);
          
          const slotSnap = await transaction.get(slotRef);
          if (slotSnap.exists) {
            const slot = slotSnap.data() as AppointmentSlot;
            const entryId = `request-${requestId}`;
            
            if (slot.appointments && slot.appointments[entryId]) {
              const updatedAppointments = { ...slot.appointments };
              delete updatedAppointments[entryId];
              
              const updatedSlot: AppointmentSlot = {
                ...slot,
                appointments: updatedAppointments,
                updatedAt: new Date().toISOString()
              };
              
              const recomputedSlot = recomputeSlot(updatedSlot, centerConfig);
              
              transaction.set(slotRef, recomputedSlot);
              
              const publicSlotRef = db.collection('public_booking_slots').doc(centerId).collection('slots').doc(slotId);
              transaction.set(publicSlotRef, buildPublicBookingSlot(recomputedSlot));
              
              console.log(`[Cleaner] Released slot hold for ${entryId} on ${dateTime}`);
            }
          }
        });
        
        expiredCount++;
      }
    }
    
    console.log(`[Cleaner] Finished clean-up. Expired ${expiredCount} requests.`);
  } catch (error) {
    console.error('[Cleaner] Error running expired booking cleaner:', error);
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  const publicApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      ok: false,
      error: 'Trop de requêtes soumises depuis cette adresse IP. Veuillez réessayer dans une heure.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Apply public API limiter
  app.use('/api/public-reservations', publicApiLimiter);
  app.use('/api/contact-messages', publicApiLimiter);

  // API endpoints
  app.post('/api/public-reservations', async (req, res) => {
    try {
      const data = req.body as PublicBookingRequestInput;
      const validation = validatePublicBookingRequest(data);
      if (!validation.valid) {
        res.status(400).json({ ok: false, error: (validation as any).error });
        return;
      }

      const reservation = await createPublicReservation(data);
      res.status(201).json({ ok: true, reservation });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reservation impossible.';
      res.status(400).json({ ok: false, error: message });
    }
  });

  app.post('/api/contact-messages', async (req, res) => {
    try {
      const data = req.body;
      const validation = validatePublicContactMessage(data);
      if (!validation.valid) {
        res.status(400).json({ ok: false, error: (validation as any).error });
        return;
      }

      const db = getAdminDb();
      const messageRef = await db.collection('contact_messages').add({
        ...data,
        createdAt: new Date().toISOString(),
        status: 'new'
      });

      sendPublicContactNotifications({
        message: data,
        messageId: messageRef.id,
      }).catch(error => {
        console.error('Public contact email notification failed:', error);
      });

      res.status(201).json({ ok: true, id: messageRef.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Message impossible.';
      res.status(400).json({ ok: false, error: message });
    }
  });

  app.post('/api/email-notifications/crm', async (req, res) => {
    try {
      if (!isCrmEmailPayload(req.body)) {
        res.status(400).json({ ok: false, error: 'Notification CRM invalide.' });
        return;
      }

      await verifyCrmEmailAccess(req, req.body.centerId);
      const result = await sendCrmEmailNotification(getAdminDb(), req.body);
      res.status(200).json({ ok: true, result });
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) : 500;
      const message = error instanceof Error ? error.message : 'Notification email impossible.';
      res.status(Number.isFinite(statusCode) ? statusCode : 500).json({ ok: false, error: message });
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Serve the public directory assets
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // Next.js integration
  const dev = process.env.NODE_ENV !== 'production';
  const nextApp = (next as any)({ dev });
  const nextHandler = nextApp.getRequestHandler();

  await nextApp.prepare();

  // Route all other requests to Next.js handler
  app.all('*', (req, res) => {
    return nextHandler(req, res);
  });

  // Start the background expired booking holds cleaner
  const adminDb = getAdminDb();
  checkAndExpirePendingBookings(adminDb).catch(err => {
    console.error('Initial background cleaner execution failed:', err);
  });
  // Run every 6 hours
  setInterval(() => {
    checkAndExpirePendingBookings(adminDb).catch(err => {
      console.error('Background cleaner interval execution failed:', err);
    });
  }, 6 * 60 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
