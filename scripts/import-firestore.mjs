import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_CLIENTS_CSV = "db-audit/out/client-import/clients-import.crm.csv";
const DEFAULT_APPOINTMENTS_CSV = "db-audit/out/final-import/appointments-import.crm.csv";
const DEFAULT_REPORT_DIR = "db-audit/out/firestore-import";

const CLIENT_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "centerId",
  "createdAt",
  "notes",
  "gender",
  "medicalConditions",
];

const APPOINTMENT_FIELDS = [
  "id",
  "clientId",
  "serviceId",
  "centerId",
  "dateTime",
  "duration",
  "status",
  "notes",
];

function parseArgs(argv) {
  const args = {
    collection: "all",
    clients: DEFAULT_CLIENTS_CSV,
    appointments: DEFAULT_APPOINTMENTS_CSV,
    reportDir: DEFAULT_REPORT_DIR,
    execute: false,
    allowOverwrite: false,
    replace: false,
    batchSize: 450,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") args.execute = true;
    else if (arg === "--allow-overwrite") args.allowOverwrite = true;
    else if (arg === "--replace") args.replace = true;
    else if (arg.startsWith("--collection=")) args.collection = arg.split("=")[1];
    else if (arg === "--collection") args.collection = argv[++index];
    else if (arg.startsWith("--clients=")) args.clients = arg.split("=")[1];
    else if (arg === "--clients") args.clients = argv[++index];
    else if (arg.startsWith("--appointments=")) args.appointments = arg.split("=")[1];
    else if (arg === "--appointments") args.appointments = argv[++index];
    else if (arg.startsWith("--report-dir=")) args.reportDir = arg.split("=")[1];
    else if (arg === "--report-dir") args.reportDir = argv[++index];
    else if (arg.startsWith("--batch-size=")) args.batchSize = Number(arg.split("=")[1]);
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!["all", "clients", "appointments"].includes(args.collection)) {
    throw new Error("--collection doit valoir all, clients ou appointments");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 500) {
    throw new Error("--batch-size doit etre entre 1 et 500");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run import:firestore
  npm run import:firestore -- --collection clients
  npm run import:firestore -- --collection appointments
  npm run import:firestore -- --execute --collection clients
  npm run import:firestore -- --execute --collection appointments --allow-overwrite

Options:
  --execute             Lance les ecritures Firestore. Sans cette option: dry-run uniquement.
  --collection VALUE    all, clients ou appointments. Defaut: all.
  --allow-overwrite     Autorise les IDs deja presents dans Firestore.
  --replace             Remplace les documents au lieu de faire un set merge.
  --clients PATH        CSV clients source.
  --appointments PATH   CSV rendez-vous source.
  --report-dir PATH     Dossier de rapport.
`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((line) => line.length > 1 || line[0] !== "");
  if (!headers) return [];
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function requireFields(rows, fields, label) {
  const missing = [];
  const first = rows[0] || {};
  for (const field of fields) {
    if (!(field in first)) missing.push(field);
  }
  if (missing.length > 0) {
    throw new Error(`${label}: colonnes manquantes: ${missing.join(", ")}`);
  }
}

function stripEmptyValues(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== ""));
}

function normalizeClient(row) {
  const data = stripEmptyValues({
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    centerId: row.centerId,
    createdAt: row.createdAt,
    notes: row.notes,
    gender: row.gender,
    medicalConditions: row.medicalConditions,
  });
  data.importedFrom = "legacy-mysql";
  data.importBatch = "legacy-2026-07-07";
  return data;
}

function normalizeAppointment(row) {
  const data = stripEmptyValues({
    id: row.id,
    clientId: row.clientId,
    serviceId: row.serviceId,
    centerId: row.centerId,
    dateTime: row.dateTime,
    duration: Number(row.duration),
    status: row.status,
    notes: row.notes,
  });
  data.importedFrom = "legacy-mysql";
  data.importBatch = "legacy-2026-07-07";
  return data;
}

function validateClients(clients) {
  const errors = [];
  const seenIds = new Set();

  for (const [index, row] of clients.entries()) {
    const line = index + 2;
    if (!row.id) errors.push(`clients ligne ${line}: id manquant`);
    if (seenIds.has(row.id)) errors.push(`clients ligne ${line}: id duplique ${row.id}`);
    seenIds.add(row.id);
    if (!row.firstName && !row.lastName) errors.push(`clients ligne ${line}: nom/prenom manquant`);
    if (!row.phone) errors.push(`clients ligne ${line}: telephone manquant`);
    if (!row.centerId || row.centerId === "center-unknown") errors.push(`clients ligne ${line}: centre invalide`);
  }

  return errors;
}

function validateAppointments(appointments, clientIds) {
  const errors = [];
  const seenIds = new Set();
  const allowedStatuses = new Set(["booked", "completed", "cancelled"]);

  for (const [index, row] of appointments.entries()) {
    const line = index + 2;
    if (!row.id) errors.push(`appointments ligne ${line}: id manquant`);
    if (seenIds.has(row.id)) errors.push(`appointments ligne ${line}: id duplique ${row.id}`);
    seenIds.add(row.id);
    if (!clientIds.has(row.clientId)) errors.push(`appointments ligne ${line}: client introuvable ${row.clientId}`);
    if (!row.serviceId) errors.push(`appointments ligne ${line}: serviceId manquant`);
    if (!row.centerId || row.centerId === "center-unknown") errors.push(`appointments ligne ${line}: centre invalide`);
    if (!row.dateTime) errors.push(`appointments ligne ${line}: dateTime manquant`);
    if (!Number.isFinite(Number(row.duration)) || Number(row.duration) <= 0) {
      errors.push(`appointments ligne ${line}: duree invalide ${row.duration}`);
    }
    if (!allowedStatuses.has(row.status)) errors.push(`appointments ligne ${line}: statut invalide ${row.status}`);
  }

  return errors;
}

function summarizeRows(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function loadAdmin(projectId) {
  const adminApp = await import("firebase-admin/app");
  const adminFirestore = await import("firebase-admin/firestore");

  const existingApps = adminApp.getApps();
  if (existingApps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      adminApp.initializeApp({
        credential: adminApp.cert(JSON.parse(serviceAccountJson)),
        projectId,
      });
    } else {
      adminApp.initializeApp({
        credential: adminApp.applicationDefault(),
        projectId,
      });
    }
  }

  return adminFirestore.getFirestore();
}

async function findExistingIds(db, collectionName, rows) {
  const existing = [];
  for (let index = 0; index < rows.length; index += 100) {
    const slice = rows.slice(index, index + 100);
    const refs = slice.map((row) => db.collection(collectionName).doc(row.id));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) existing.push(snapshot.id);
    });
  }
  return existing;
}

async function writeCollection(db, collectionName, rows, normalize, options) {
  const existing = options.allowOverwrite ? [] : await findExistingIds(db, collectionName, rows);
  if (existing.length > 0) {
    throw new Error(
      `${collectionName}: ${existing.length} document(s) existent deja. ` +
        `Relancer avec --allow-overwrite si c'est voulu. Exemples: ${existing.slice(0, 10).join(", ")}`
    );
  }

  let written = 0;
  for (let index = 0; index < rows.length; index += options.batchSize) {
    const batch = db.batch();
    const slice = rows.slice(index, index + options.batchSize);
    for (const row of slice) {
      const ref = db.collection(collectionName).doc(row.id);
      batch.set(ref, normalize(row), { merge: !options.replace });
    }
    await batch.commit();
    written += slice.length;
    console.log(`${collectionName}: ${written}/${rows.length} ecrits`);
  }
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const clients = readCsv(args.clients);
  const appointments = readCsv(args.appointments);
  requireFields(clients, CLIENT_FIELDS, "clients");
  requireFields(appointments, APPOINTMENT_FIELDS, "appointments");

  const clientIds = new Set(clients.map((client) => client.id));
  const collections = args.collection === "all" ? ["clients", "appointments"] : [args.collection];
  const validationErrors = [
    ...(collections.includes("clients") ? validateClients(clients) : []),
    ...(collections.includes("appointments") ? validateAppointments(appointments, clientIds) : []),
  ];

  const report = {
    mode: args.execute ? "execute" : "dry-run",
    collection: args.collection,
    generatedAt: new Date().toISOString(),
    sources: {
      clients: path.resolve(args.clients),
      appointments: path.resolve(args.appointments),
    },
    counts: {
      clients: clients.length,
      appointments: appointments.length,
    },
    clientsByCenter: summarizeRows(clients, "centerId"),
    appointmentsByCenter: summarizeRows(appointments, "centerId"),
    appointmentsByService: summarizeRows(appointments, "serviceId"),
    appointmentsByStatus: summarizeRows(appointments, "status"),
    validationErrors,
    writes: {},
  };

  fs.mkdirSync(args.reportDir, { recursive: true });

  if (validationErrors.length > 0) {
    report.status = "blocked";
    fs.writeFileSync(path.join(args.reportDir, "firestore-import-report.json"), JSON.stringify(report, null, 2), "utf8");
    console.error(`Import bloque: ${validationErrors.length} erreur(s) de validation.`);
    console.error(validationErrors.slice(0, 20).join("\n"));
    process.exitCode = 1;
    return;
  }

  if (!args.execute) {
    report.status = "dry-run-ok";
    fs.writeFileSync(path.join(args.reportDir, "firestore-import-report.json"), JSON.stringify(report, null, 2), "utf8");
    console.log("Dry-run OK. Aucune ecriture Firestore effectuee.");
    console.log(JSON.stringify(report.counts, null, 2));
    return;
  }

  let db;
  try {
    db = await loadAdmin(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
  } catch (error) {
    throw new Error(
      "Impossible de charger Firebase Admin. Installe firebase-admin et fournis GOOGLE_APPLICATION_CREDENTIALS " +
        "ou FIREBASE_SERVICE_ACCOUNT_JSON. Detail: " + error.message
    );
  }

  if (collections.includes("clients")) {
    report.writes.clients = await writeCollection(db, "clients", clients, normalizeClient, args);
  }
  if (collections.includes("appointments")) {
    report.writes.appointments = await writeCollection(db, "appointments", appointments, normalizeAppointment, args);
  }

  report.status = "executed";
  fs.writeFileSync(path.join(args.reportDir, "firestore-import-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("Import Firestore termine.");
  console.log(JSON.stringify(report.writes, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
