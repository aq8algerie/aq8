import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { applicationDefault, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { DocumentSnapshot, Firestore, Transaction, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Import SEO helpers and mock database
import { getSeoForPage, generateCenterSeo, PageSeo } from './lib/seo';
import { AQ8Database } from './src/mockData';
import { Appointment, Center, Service } from './src/types';
import { PublicBookingRequestInput, validatePublicBookingRequest } from './src/lib/publicFormValidation';
import {
  BookingServiceType,
  CenterCapacity,
  getBookingSlotId,
  getCenterBookingCapacity,
  getServiceTypeLabel,
  getSlotCapacity,
  isCenterOpenForDateTime,
} from './src/lib/bookingCapacityRules';

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

function getAdminDb(): Firestore {
  if (getAdminApps().length === 0) {
    initializeAdminApp({ credential: applicationDefault() });
  }
  return getAdminFirestore();
}

function isBookingServiceType(value: unknown): value is BookingServiceType {
  return value === 'aq8' || value === 'wonder';
}

function emptyCounts(): CenterCapacity {
  return { aq8: 0, wonder: 0 };
}

function recomputeSlot(slot: AppointmentSlot): AppointmentSlot {
  const counts = emptyCounts();
  for (const entry of Object.values(slot.appointments)) {
    counts[entry.serviceType] += 1;
  }
  return { ...slot, capacities: getCenterBookingCapacity(slot.centerId), counts };
}

function buildEmptyAppointmentSlot(centerId: string, dateTime: string, timestamp: string): AppointmentSlot {
  return {
    id: getBookingSlotId(dateTime),
    centerId,
    dateTime,
    status: 'held',
    capacities: getCenterBookingCapacity(centerId),
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
): Promise<AppointmentSlot> {
  const emptySlot = buildEmptyAppointmentSlot(centerId, dateTime, timestamp);
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
  });
}

function addBookingHoldToSlot(slot: AppointmentSlot, entry: AppointmentSlotEntry): AppointmentSlot {
  if (!isCenterOpenForDateTime(slot.centerId, slot.dateTime)) {
    throw new Error("Ce creneau est en dehors des horaires d'ouverture du centre.");
  }

  const booked = Object.values(slot.appointments).filter(candidate => (
    candidate.serviceType === entry.serviceType && candidate.appointmentId !== entry.appointmentId
  )).length;
  const capacity = getSlotCapacity(slot.centerId, entry.serviceType);

  if (booked >= capacity) {
    throw new Error(`Capacite ${getServiceTypeLabel(entry.serviceType)} atteinte sur ce creneau (${booked}/${capacity}).`);
  }

  return recomputeSlot({
    ...slot,
    appointments: {
      ...slot.appointments,
      [entry.appointmentId]: entry,
    },
  });
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

  const center = centerSnapshot.data() as Center;
  const servicesSnapshot = await db.collection('services').get();
  const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
  const availableServiceTypes = getAvailablePublicServiceTypes(center, services);

  const validation = validatePublicBookingRequest(
    { ...input, centerName: center.name },
    availableServiceTypes,
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
  const slotRef = db.collection('appointment_slots').doc(data.centerId).collection('slots').doc(slotId);
  const publicSlotRef = db.collection('public_booking_slots').doc(data.centerId).collection('slots').doc(slotId);

  await db.runTransaction(async transaction => {
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeAdminSlot(transaction, db, slotSnapshot, data.centerId, dateTime, createdAt);
    const entryId = `request-${requestRef.id}`;
    const nextSlot = addBookingHoldToSlot(slot, {
      appointmentId: entryId,
      serviceId: service.id,
      serviceType,
      source: 'booking_request',
      createdAt,
      requestId: requestRef.id,
    });

    transaction.set(requestRef, {
      centerId: data.centerId,
      centerName: center.name,
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

  return {
    reservationId: requestRef.id,
    centerName: center.name,
    service: data.service,
    bookingDate: data.bookingDate,
    bookingTime: data.bookingTime,
  };
}

function injectSeo(html: string, seo: PageSeo): string {
  let modifiedHtml = html;
  
  // Clean up any existing titles or meta tags
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, '');

  // Generate complete set of optimized SEO tags
  const metaTags = `
    <title>${seo.title}</title>
    <meta name="description" content="${seo.description}" />
    <meta name="keywords" content="${seo.keywords.join(', ')}" />
    <link rel="canonical" href="${seo.canonicalUrl}" />
    <meta property="og:title" content="${seo.title}" />
    <meta property="og:description" content="${seo.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title}" />
    <meta name="twitter:description" content="${seo.description}" />
  `;

  // Inject right after <head> or before </head>
  if (modifiedHtml.includes('<head>')) {
    return modifiedHtml.replace('<head>', `<head>\n    ${metaTags}`);
  } else {
    return modifiedHtml.replace('</head>', `${metaTags}\n</head>`);
  }
}

function getSeoForUrl(urlPath: string): PageSeo {
  // Match a dynamic center slug URL
  const centerMatch = urlPath.match(/^\/centres\/([a-zA-Z0-9_-]+)/);
  if (centerMatch) {
    const slug = centerMatch[1];
    const centers = AQ8Database.getCenters();
    const center = centers.find(c => c.slug === slug);
    if (center) {
      return generateCenterSeo(center);
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
    'contact': 'contact'
  };

  const routeKey = validRoutes[cleanPath] || 'home';
  return getSeoForPage(routeKey);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.post('/api/public-reservations', async (req, res) => {
    try {
      const reservation = await createPublicReservation(req.body as PublicBookingRequestInput);
      res.status(201).json({ ok: true, reservation });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reservation impossible.';
      res.status(400).json({ ok: false, error: message });
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
