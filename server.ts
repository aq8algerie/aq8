import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { applicationDefault, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { DocumentSnapshot, Firestore, Transaction, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Import SEO helpers and mock database
import { getSeoForPage, generateCenterSeo, PageSeo, generateJsonLd } from './lib/seo';
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

function injectSeo(html: string, seoInfo: { seo: PageSeo, jsonLd: string }): string {
  const { seo, jsonLd } = seoInfo;
  let modifiedHtml = html;
  
  // Clean up any existing titles or meta tags
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="(?:icon|shortcut icon)"[^>]*>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="apple-touch-icon"[^>]*>/gi, '');

  // Generate complete set of optimized SEO tags
  const metaTags = `
    <title>${seo.title}</title>
    <meta name="description" content="${seo.description}" />
    <meta name="keywords" content="${seo.keywords.join(', ')}" />
    <link rel="canonical" href="${seo.canonicalUrl}" />
    <link rel="icon" type="image/png" href="/images/favicon.png" />
    <link rel="apple-touch-icon" href="/images/favicon.png" />
    <meta property="og:title" content="${seo.title}" />
    <meta property="og:description" content="${seo.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title}" />
    <meta name="twitter:description" content="${seo.description}" />
    ${jsonLd}
  `;

  // Inject right after <head> or before </head>
  if (modifiedHtml.includes('<head>')) {
    return modifiedHtml.replace('<head>', `<head>\n    ${metaTags}`);
  } else {
    return modifiedHtml.replace('</head>', `${metaTags}\n</head>`);
  }
}

function getSeoForUrl(urlPath: string): { seo: PageSeo; jsonLd: string } {
  // Match a dynamic center slug URL
  const centerMatch = urlPath.match(/^\/centres\/([a-zA-Z0-9_-]+)/);
  if (centerMatch) {
    const slug = centerMatch[1];
    const centers = AQ8Database.getCenters();
    const center = centers.find(c => c.slug === slug);
    if (center) {
      const seo = generateCenterSeo(center);
      const jsonLd = generateJsonLd('center-detail', center);
      return { seo, jsonLd };
    }
  }

  // Match static pages
  const cleanPath = urlPath === '/' ? 'home' : urlPath.replace(/^\//, '');
  const validRoutes: Record<string, string> = {
    'home': 'home',
    'aq8': 'aq8',
    'wonder': 'wonder',
    'centres': 'centers',
    'centers': 'centers',
    'faq': 'faq',
    'contact': 'contact',
    'a-propos': 'about',
    'about': 'about',
    'reservation': 'booking'
  };

  const routeKey = validRoutes[cleanPath] || 'home';
  const seo = getSeoForPage(routeKey);
  const jsonLd = generateJsonLd(routeKey);
  return { seo, jsonLd };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/email-notifications/health', (req, res) => {
    res.json({ ok: true, email: getEmailNotificationDiagnostics() });
  });

  app.post('/api/contact-messages', async (req, res) => {
    try {
      const result = await createPublicContactMessage(req.body);
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) : 500;
      const message = error instanceof Error ? error.message : 'Message impossible.';
      res.status(Number.isFinite(statusCode) ? statusCode : 500).json({ ok: false, error: message });
    }
  });

  app.post('/api/public-reservations', async (req, res) => {
    try {
      const reservation = await createPublicReservation(req.body as PublicBookingRequestInput);
      res.status(201).json({ ok: true, reservation });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reservation impossible.';
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

  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite's Dev Middleware
    console.log('Starting server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        // Dynamic SEO injection
        const seo = getSeoForUrl(req.path);
        const html = injectSeo(template, seo);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production mode serving built assets from dist/
    console.log('Starting server in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve client-side static assets
    app.use(express.static(distPath, { index: false }));

    app.use('*', async (req, res, next) => {
      try {
        const templatePath = path.join(distPath, 'index.html');
        const template = await fs.readFile(templatePath, 'utf-8');
        
        // Dynamic SEO injection
        const seo = getSeoForUrl(req.path);
        const html = injectSeo(template, seo);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
