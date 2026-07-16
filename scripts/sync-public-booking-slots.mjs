import fs from "node:fs";
import process from "node:process";

const DEFAULT_BATCH_SIZE = 400;

const DEFAULT_CAPACITY = { aq8: 1, wonder: 1 };
const CENTER_CAPACITIES = {
  "center-1": { aq8: 3, wonder: 1 },
  "center-2": { aq8: 2, wonder: 1 },
  "center-3": { aq8: 1, wonder: 1 },
  "center-4": { aq8: 2, wonder: 1 },
  "center-5": { aq8: 3, wonder: 1 },
};

function parseArgs(argv) {
  const args = {
    execute: false,
    projectId: undefined,
    fromDate: new Date().toISOString().slice(0, 10),
    batchSize: DEFAULT_BATCH_SIZE,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--project=")) args.projectId = arg.split("=")[1];
    else if (arg === "--project") args.projectId = argv[++index];
    else if (arg.startsWith("--from-date=")) args.fromDate = arg.split("=")[1];
    else if (arg === "--from-date") args.fromDate = argv[++index];
    else if (arg.startsWith("--batch-size=")) args.batchSize = Number(arg.split("=")[1]);
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.fromDate)) {
    throw new Error("--from-date doit etre au format YYYY-MM-DD");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 450) {
    throw new Error("--batch-size doit etre entre 1 et 450");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run sync:public-booking-slots
  npm run sync:public-booking-slots:execute
  npm run sync:public-booking-slots -- --from-date 2026-07-16

Options:
  --execute          Ecrit appointment_slots et public_booking_slots. Sans cette option: audit uniquement.
  --project ID       Projet Firebase. Defaut: FIREBASE_PROJECT_ID, GCLOUD_PROJECT, puis .firebaserc.
  --from-date DATE   Date minimale incluse, format YYYY-MM-DD. Defaut: aujourd'hui.
  --batch-size N     Taille des batchs Firestore, entre 1 et 450. Defaut: ${DEFAULT_BATCH_SIZE}.
`);
}

function readFirebaseRcProject() {
  try {
    const raw = fs.readFileSync(".firebaserc", "utf8");
    const parsed = JSON.parse(raw);
    return parsed.projects?.default;
  } catch {
    return undefined;
  }
}

function resolveProjectId(args) {
  return args.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || readFirebaseRcProject();
}

async function loadAdmin(projectId) {
  if (!projectId) {
    throw new Error("Projet Firebase introuvable. Utiliser --project, FIREBASE_PROJECT_ID, GCLOUD_PROJECT ou .firebaserc.");
  }

  const adminApp = await import("firebase-admin/app");
  const adminFirestore = await import("firebase-admin/firestore");

  if (adminApp.getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      adminApp.initializeApp({ credential: adminApp.cert(JSON.parse(serviceAccountJson)), projectId });
    } else {
      adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId });
    }
  }

  return adminFirestore.getFirestore();
}

function buildAdminAuthError(projectId, error) {
  return new Error(
    "Impossible d'acceder a Firestore avec Firebase Admin pour le projet " + (projectId || "inconnu") + ". " +
      "Configurer GOOGLE_APPLICATION_CREDENTIALS vers un fichier service account, ou FIREBASE_SERVICE_ACCOUNT_JSON. " +
      "Detail: " + error.message,
  );
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function isBookingServiceType(value) {
  return value === "aq8" || value === "wonder";
}

function getBookingSlotId(dateTime) {
  return encodeURIComponent(normalizeText(dateTime));
}

function getCenterCapacity(centerId) {
  return CENTER_CAPACITIES[centerId] || DEFAULT_CAPACITY;
}

function emptyCounts() {
  return { aq8: 0, wonder: 0 };
}

function splitDateTime(value) {
  const normalized = normalizeText(value).replace(" ", "T");
  const [date, rawTime] = normalized.split("T");
  const time = normalizeText(rawTime).slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  return { date, time, dateTime: `${date}T${time}` };
}

function shouldHoldAppointment(appointment) {
  return appointment.status !== "cancelled";
}

function buildSlot(centerId, dateTime, generatedAt) {
  return {
    id: getBookingSlotId(dateTime),
    centerId,
    dateTime,
    status: "held",
    capacities: getCenterCapacity(centerId),
    counts: emptyCounts(),
    appointments: {},
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };
}

function addEntry(slot, entry) {
  slot.appointments[entry.appointmentId] = entry;
  slot.counts = emptyCounts();
  for (const candidate of Object.values(slot.appointments)) {
    if (isBookingServiceType(candidate.serviceType)) {
      slot.counts[candidate.serviceType] += 1;
    }
  }
  return slot;
}

function buildPublicSlot(slot) {
  const [date, time] = slot.dateTime.split("T");
  return {
    id: slot.id,
    centerId: slot.centerId,
    dateTime: slot.dateTime,
    date: date || "",
    time: time || "",
    capacities: slot.capacities,
    counts: slot.counts,
    remaining: {
      aq8: Math.max(slot.capacities.aq8 - slot.counts.aq8, 0),
      wonder: Math.max(slot.capacities.wonder - slot.counts.wonder, 0),
    },
    updatedAt: slot.updatedAt,
  };
}

async function readCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function indexServices(services) {
  const byId = new Map();
  const firstIdByType = new Map();

  for (const service of services) {
    byId.set(service.id, service);
    if (isBookingServiceType(service.type) && !firstIdByType.has(service.type)) {
      firstIdByType.set(service.type, service.id);
    }
  }

  return { byId, firstIdByType };
}

function getOrCreateSlot(slots, centerId, dateTime, generatedAt) {
  const key = `${centerId}::${dateTime}`;
  if (!slots.has(key)) {
    slots.set(key, buildSlot(centerId, dateTime, generatedAt));
  }
  return slots.get(key);
}

function collectSlots({ appointments, bookingRequests, servicesById, firstServiceIdByType, fromDate, generatedAt }) {
  const slots = new Map();
  const skipped = [];

  for (const appointment of appointments) {
    if (!shouldHoldAppointment(appointment)) continue;

    const centerId = normalizeText(appointment.centerId);
    const parsed = splitDateTime(appointment.dateTime);
    if (!centerId || !parsed || parsed.date < fromDate) continue;

    const service = servicesById.get(appointment.serviceId);
    if (!isBookingServiceType(service?.type)) {
      skipped.push({ kind: "appointment", id: appointment.id, reason: "service type invalide" });
      continue;
    }

    const slot = getOrCreateSlot(slots, centerId, parsed.dateTime, generatedAt);
    addEntry(slot, {
      appointmentId: appointment.id,
      serviceId: appointment.serviceId,
      serviceType: service.type,
      source: "backfill",
      createdAt: normalizeText(appointment.createdAt) || generatedAt,
    });
  }

  for (const request of bookingRequests) {
    if (request.status !== "pending") continue;
    if (!isBookingServiceType(request.service)) {
      skipped.push({ kind: "booking_request", id: request.id, reason: "service type invalide" });
      continue;
    }

    const centerId = normalizeText(request.centerId);
    const parsed = splitDateTime(`${request.bookingDate}T${request.bookingTime}`);
    if (!centerId || !parsed || parsed.date < fromDate) continue;

    const slot = getOrCreateSlot(slots, centerId, parsed.dateTime, generatedAt);
    addEntry(slot, {
      appointmentId: `request-${request.id}`,
      serviceId: firstServiceIdByType.get(request.service) || `public-${request.service}`,
      serviceType: request.service,
      source: "booking_request",
      createdAt: normalizeText(request.reservedAt) || normalizeText(request.createdAt) || generatedAt,
      requestId: request.id,
    });
  }

  return { slots: [...slots.values()], skipped };
}

function summarizeOverCapacity(slots) {
  return slots
    .flatMap((slot) => ["aq8", "wonder"].map((serviceType) => ({
      centerId: slot.centerId,
      dateTime: slot.dateTime,
      serviceType,
      booked: slot.counts[serviceType],
      capacity: slot.capacities[serviceType],
    })))
    .filter((row) => row.booked > row.capacity);
}

async function writeSlots(db, slots, args) {
  let written = 0;
  for (let index = 0; index < slots.length; index += args.batchSize) {
    const slice = slots.slice(index, index + args.batchSize);
    const batch = db.batch();

    for (const slot of slice) {
      const slotRef = db.collection("appointment_slots").doc(slot.centerId).collection("slots").doc(slot.id);
      const publicSlotRef = db.collection("public_booking_slots").doc(slot.centerId).collection("slots").doc(slot.id);
      batch.set(slotRef, slot, { merge: false });
      batch.set(publicSlotRef, buildPublicSlot(slot), { merge: false });
    }

    await batch.commit();
    written += slice.length;
  }
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveProjectId(args);
  const generatedAt = new Date().toISOString();
  let db;
  let appointments;
  let bookingRequests;
  let services;

  try {
    db = await loadAdmin(projectId);
    [appointments, bookingRequests, services] = await Promise.all([
      readCollection(db, "appointments"),
      readCollection(db, "booking_requests"),
      readCollection(db, "services"),
    ]);
  } catch (error) {
    throw buildAdminAuthError(projectId, error);
  }

  const { byId: servicesById, firstIdByType } = indexServices(services);
  const { slots, skipped } = collectSlots({
    appointments,
    bookingRequests,
    servicesById,
    firstServiceIdByType: firstIdByType,
    fromDate: args.fromDate,
    generatedAt,
  });
  const overCapacity = summarizeOverCapacity(slots);

  console.log(`Projet: ${projectId}`);
  console.log(`Mode: ${args.execute ? "EXECUTION" : "AUDIT"}`);
  console.log(`Depuis: ${args.fromDate}`);
  console.log(`Slots publics a synchroniser: ${slots.length}`);
  console.log(`Entrees ignorees: ${skipped.length}`);
  console.log(`Slots au-dessus de la capacite: ${overCapacity.length}`);

  if (overCapacity.length > 0) {
    console.log(JSON.stringify(overCapacity.slice(0, 20), null, 2));
  }

  if (!args.execute) {
    console.log("Aucune ecriture effectuee. Relancer avec --execute pour synchroniser.");
    return;
  }

  const written = await writeSlots(db, slots, args);
  console.log(`Synchronisation terminee: ${written} slots appointment/public ecrits.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
