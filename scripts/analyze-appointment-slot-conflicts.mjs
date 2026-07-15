import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_REPORT_DIR = "db-audit/out/firestore-import";

function parseArgs(argv) {
  const args = {
    reportDir: DEFAULT_REPORT_DIR,
    projectId: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--project=")) args.projectId = arg.split("=")[1];
    else if (arg === "--project") args.projectId = argv[++index];
    else if (arg.startsWith("--report-dir=")) args.reportDir = arg.split("=")[1];
    else if (arg === "--report-dir") args.reportDir = argv[++index];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run analyze:appointment-slot-conflicts
  npm run analyze:appointment-slot-conflicts -- --project aq8algerie-4f675

Options:
  --project ID       Projet Firebase. Defaut: FIREBASE_PROJECT_ID, GCLOUD_PROJECT, puis .firebaserc.
  --report-dir PATH  Dossier de sortie. Defaut: ${DEFAULT_REPORT_DIR}.
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
      "Detail: " + error.message
  );
}

async function readCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function shouldHoldSlot(appointment) {
  return appointment.status !== "cancelled";
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function slotKey(appointment) {
  return `${appointment.centerId}::${appointment.dateTime}`;
}

function groupConflicts(appointments) {
  const groups = new Map();
  for (const appointment of appointments) {
    if (!shouldHoldSlot(appointment)) continue;
    if (!appointment.centerId || !appointment.dateTime) continue;
    const key = slotKey(appointment);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(appointment);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, centerId: group[0].centerId, dateTime: group[0].dateTime, appointments: group }));
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(filePath, "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n", "utf8");
}

function indexById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function clientLabel(client) {
  if (!client) return "Client introuvable";
  const fullName = [client.firstName, client.lastName].map(normalizeText).filter(Boolean).join(" ");
  return fullName || normalizeText(client.phone) || normalizeText(client.email) || client.id;
}

function serviceLabel(service) {
  if (!service) return "Service introuvable";
  return normalizeText(service.name) || service.id;
}

function centerLabel(center) {
  if (!center) return "Centre introuvable";
  return normalizeText(center.name) || center.id;
}

function isPastSlot(dateTime, now = new Date()) {
  const parsed = new Date(String(dateTime).replace(" ", "T"));
  return Number.isFinite(parsed.getTime()) && parsed.getTime() < now.getTime();
}

function getConflictKind(group, clientsById) {
  const clientIds = new Set(group.appointments.map((appointment) => appointment.clientId || "unknown"));
  const serviceIds = new Set(group.appointments.map((appointment) => appointment.serviceId || "unknown"));
  const phones = new Set(group.appointments.map((appointment) => normalizeText(clientsById.get(appointment.clientId)?.phone) || "unknown"));

  if (clientIds.size === 1) return "same-client";
  if (phones.size === 1 && !phones.has("unknown")) return "same-phone";
  if (serviceIds.size === 1) return "same-service-multiple-clients";
  return "multiple-clients-services";
}

function summarizeBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortAppointmentsForReview(appointments) {
  return [...appointments].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const projectId = resolveProjectId(args);
  let appointments;
  let clients;
  let services;
  let centers;

  try {
    const db = await loadAdmin(projectId);
    [appointments, clients, services, centers] = await Promise.all([
      readCollection(db, "appointments"),
      readCollection(db, "clients"),
      readCollection(db, "services"),
      readCollection(db, "centers"),
    ]);
  } catch (error) {
    throw buildAdminAuthError(projectId, error);
  }

  const clientsById = indexById(clients);
  const servicesById = indexById(services);
  const centersById = indexById(centers);
  const conflicts = groupConflicts(appointments);
  const generatedAt = new Date().toISOString();

  const detailedRows = [[
    "centerId",
    "centerName",
    "dateTime",
    "isPastSlot",
    "appointmentCount",
    "conflictKind",
    "appointmentId",
    "status",
    "clientId",
    "clientName",
    "clientPhone",
    "clientEmail",
    "serviceId",
    "serviceName",
    "duration",
    "notes",
    "importedFrom",
    "importBatch",
  ]];

  const summaryRows = [[
    "centerId",
    "centerName",
    "dateTime",
    "isPastSlot",
    "appointmentCount",
    "conflictKind",
    "appointmentIds",
    "clientNames",
    "clientPhones",
    "serviceNames",
  ]];

  for (const conflict of conflicts.sort((a, b) => `${a.centerId}-${a.dateTime}`.localeCompare(`${b.centerId}-${b.dateTime}`))) {
    const center = centersById.get(conflict.centerId);
    const sortedAppointments = sortAppointmentsForReview(conflict.appointments);
    const kind = getConflictKind(conflict, clientsById);
    const past = isPastSlot(conflict.dateTime);

    summaryRows.push([
      conflict.centerId,
      centerLabel(center),
      conflict.dateTime,
      past ? "yes" : "no",
      sortedAppointments.length,
      kind,
      sortedAppointments.map((appointment) => appointment.id),
      sortedAppointments.map((appointment) => clientLabel(clientsById.get(appointment.clientId))),
      sortedAppointments.map((appointment) => normalizeText(clientsById.get(appointment.clientId)?.phone)),
      sortedAppointments.map((appointment) => serviceLabel(servicesById.get(appointment.serviceId))),
    ]);

    for (const appointment of sortedAppointments) {
      const client = clientsById.get(appointment.clientId);
      const service = servicesById.get(appointment.serviceId);
      detailedRows.push([
        conflict.centerId,
        centerLabel(center),
        conflict.dateTime,
        past ? "yes" : "no",
        sortedAppointments.length,
        kind,
        appointment.id,
        appointment.status,
        appointment.clientId,
        clientLabel(client),
        normalizeText(client?.phone),
        normalizeText(client?.email),
        appointment.serviceId,
        serviceLabel(service),
        appointment.duration,
        appointment.notes,
        appointment.importedFrom,
        appointment.importBatch,
      ]);
    }
  }

  fs.mkdirSync(args.reportDir, { recursive: true });
  const summaryPath = path.join(args.reportDir, "appointment-slots-conflicts-summary.csv");
  const detailedPath = path.join(args.reportDir, "appointment-slots-conflicts-detailed.csv");
  const reportPath = path.join(args.reportDir, "appointment-slots-conflicts-analysis.json");

  writeCsv(summaryPath, summaryRows);
  writeCsv(detailedPath, detailedRows);

  const report = {
    generatedAt,
    projectId,
    counts: {
      appointments: appointments.length,
      clients: clients.length,
      services: services.length,
      centers: centers.length,
      conflictSlots: conflicts.length,
      conflictAppointments: detailedRows.length - 1,
      pastConflictSlots: conflicts.filter((conflict) => isPastSlot(conflict.dateTime)).length,
      futureConflictSlots: conflicts.filter((conflict) => !isPastSlot(conflict.dateTime)).length,
    },
    conflictsByCenter: summarizeBy(conflicts, (conflict) => conflict.centerId),
    conflictsByKind: summarizeBy(conflicts, (conflict) => getConflictKind(conflict, clientsById)),
    outputs: {
      summaryPath,
      detailedPath,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
