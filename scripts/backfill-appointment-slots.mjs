import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_REPORT_DIR = "db-audit/out/firestore-import";
const DEFAULT_BATCH_SIZE = 450;

function parseArgs(argv) {
  const args = {
    execute: false,
    skipConflicts: false,
    reportDir: DEFAULT_REPORT_DIR,
    batchSize: DEFAULT_BATCH_SIZE,
    projectId: undefined,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") args.execute = true;
    else if (arg === "--skip-conflicts") args.skipConflicts = true;
    else if (arg.startsWith("--project=")) args.projectId = arg.split("=")[1];
    else if (arg === "--project") args.projectId = argv[++index];
    else if (arg.startsWith("--report-dir=")) args.reportDir = arg.split("=")[1];
    else if (arg === "--report-dir") args.reportDir = argv[++index];
    else if (arg.startsWith("--batch-size=")) args.batchSize = Number(arg.split("=")[1]);
    else if (arg === "--batch-size") args.batchSize = Number(argv[++index]);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 500) {
    throw new Error("--batch-size doit etre entre 1 et 500");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run backfill:appointment-slots
  npm run backfill:appointment-slots:execute
  npm run backfill:appointment-slots -- --skip-conflicts
  npm run backfill:appointment-slots:execute -- --skip-conflicts

Options:
  --execute          Ecrit les verrous appointment_slots. Sans cette option: audit uniquement.
  --skip-conflicts   Ignore les creneaux en conflit et backfill uniquement les creneaux propres.
  --project ID       Projet Firebase. Defaut: FIREBASE_PROJECT_ID, GCLOUD_PROJECT, puis .firebaserc.
  --report-dir PATH  Dossier du rapport JSON. Defaut: ${DEFAULT_REPORT_DIR}.
  --batch-size N     Taille des batchs Firestore, entre 1 et 500. Defaut: ${DEFAULT_BATCH_SIZE}.
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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function getAppointmentSlotId(dateTime) {
  return encodeURIComponent(normalizeText(dateTime));
}

function getAppointmentSlotRef(db, centerId, dateTime) {
  return db
    .collection("appointment_slots")
    .doc(centerId)
    .collection("slots")
    .doc(getAppointmentSlotId(dateTime));
}

function shouldHoldSlot(appointment) {
  return appointment.status !== "cancelled";
}

function slotKey(appointment) {
  return `${appointment.centerId}::${appointment.dateTime}`;
}

function summarizeBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildSlot(appointment, generatedAt) {
  return {
    id: getAppointmentSlotId(appointment.dateTime),
    centerId: appointment.centerId,
    appointmentId: appointment.id,
    dateTime: appointment.dateTime,
    status: "held",
    source: "backfill",
    createdAt: generatedAt,
    backfilledAt: generatedAt,
  };
}

async function readAppointments(db) {
  const snapshot = await db.collection("appointments").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function validateAppointmentForSlot(appointment) {
  const errors = [];
  if (!normalizeText(appointment.id)) errors.push("id manquant");
  if (!normalizeText(appointment.centerId)) errors.push("centerId manquant");
  if (!normalizeText(appointment.dateTime)) errors.push("dateTime manquant");
  if (!normalizeText(appointment.status)) errors.push("status manquant");
  return errors;
}

function analyzeAppointments(appointments) {
  const invalid = [];
  const candidates = [];

  for (const appointment of appointments) {
    if (!shouldHoldSlot(appointment)) continue;
    const errors = validateAppointmentForSlot(appointment);
    if (errors.length > 0) {
      invalid.push({ id: appointment.id || "unknown", errors });
      continue;
    }
    candidates.push(appointment);
  }

  const groups = new Map();
  for (const appointment of candidates) {
    const key = slotKey(appointment);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(appointment);
  }

  const duplicateSlotConflicts = [];
  const uniqueCandidates = [];
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      duplicateSlotConflicts.push({
        key,
        centerId: group[0].centerId,
        dateTime: group[0].dateTime,
        appointmentIds: group.map((appointment) => appointment.id),
      });
    } else {
      uniqueCandidates.push(group[0]);
    }
  }

  return { invalid, candidates, uniqueCandidates, duplicateSlotConflicts };
}

async function inspectExistingSlots(db, candidates) {
  const toCreate = [];
  const alreadyAligned = [];
  const existingConflicts = [];

  for (let index = 0; index < candidates.length; index += 100) {
    const slice = candidates.slice(index, index + 100);
    const refs = slice.map((appointment) => getAppointmentSlotRef(db, appointment.centerId, appointment.dateTime));
    const snapshots = await db.getAll(...refs);

    snapshots.forEach((snapshot, snapshotIndex) => {
      const appointment = slice[snapshotIndex];
      if (!snapshot.exists) {
        toCreate.push(appointment);
        return;
      }

      const slot = snapshot.data();
      if (slot.appointmentId === appointment.id) {
        alreadyAligned.push({
          appointmentId: appointment.id,
          centerId: appointment.centerId,
          dateTime: appointment.dateTime,
        });
        return;
      }

      existingConflicts.push({
        appointmentId: appointment.id,
        centerId: appointment.centerId,
        dateTime: appointment.dateTime,
        existingSlotAppointmentId: slot.appointmentId || null,
        existingSlotSource: slot.source || null,
      });
    });
  }

  return { toCreate, alreadyAligned, existingConflicts };
}

async function writeSlots(db, appointments, options, generatedAt) {
  let written = 0;
  for (let index = 0; index < appointments.length; index += options.batchSize) {
    const batch = db.batch();
    const slice = appointments.slice(index, index + options.batchSize);
    for (const appointment of slice) {
      const ref = getAppointmentSlotRef(db, appointment.centerId, appointment.dateTime);
      batch.set(ref, buildSlot(appointment, generatedAt), { merge: false });
    }
    await batch.commit();
    written += slice.length;
    console.log(`appointment_slots: ${written}/${appointments.length} ecrits`);
  }
  return written;
}

function buildAdminAuthError(projectId, error) {
  return new Error(
    "Impossible d'acceder a Firestore avec Firebase Admin pour le projet " + (projectId || "inconnu") + ". " +
      "Configurer GOOGLE_APPLICATION_CREDENTIALS vers un fichier service account, ou FIREBASE_SERVICE_ACCOUNT_JSON. " +
      "La session Firebase CLI ne suffit pas pour firebase-admin. Detail: " + error.message
  );
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function writeConflictCsv(args, duplicateSlotConflicts) {
  fs.mkdirSync(args.reportDir, { recursive: true });
  const csvPath = path.join(args.reportDir, "appointment-slots-conflicts.csv");
  const rows = [
    ["centerId", "dateTime", "appointmentCount", "appointmentIds"],
    ...duplicateSlotConflicts.map((conflict) => [
      conflict.centerId,
      conflict.dateTime,
      conflict.appointmentIds.length,
      conflict.appointmentIds,
    ]),
  ];
  fs.writeFileSync(csvPath, rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n", "utf8");
  return csvPath;
}

function writeReport(args, report) {
  fs.mkdirSync(args.reportDir, { recursive: true });
  const reportPath = path.join(args.reportDir, "appointment-slots-backfill-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
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
  let analysis;
  let existing;
  try {
    db = await loadAdmin(projectId);
    appointments = await readAppointments(db);
    analysis = analyzeAppointments(appointments);
    existing = await inspectExistingSlots(db, analysis.uniqueCandidates);
  } catch (error) {
    throw buildAdminAuthError(projectId, error);
  }

  const blockingDuplicateConflicts = analysis.duplicateSlotConflicts;
  const blockingExistingConflicts = existing.existingConflicts;
  const hasConflicts = blockingDuplicateConflicts.length > 0 || blockingExistingConflicts.length > 0;
  const canExecute = args.execute && (!hasConflicts || args.skipConflicts);

  const conflictCsvPath = writeConflictCsv(args, analysis.duplicateSlotConflicts);

  const report = {
    mode: args.execute ? "execute" : "dry-run",
    status: "pending",
    generatedAt,
    projectId,
    counts: {
      appointments: appointments.length,
      nonCancelledCandidates: analysis.candidates.length,
      invalidCandidates: analysis.invalid.length,
      uniqueCandidateSlots: analysis.uniqueCandidates.length,
      duplicateSlotConflicts: analysis.duplicateSlotConflicts.length,
      alreadyAlignedSlots: existing.alreadyAligned.length,
      existingSlotConflicts: existing.existingConflicts.length,
      slotsToCreate: existing.toCreate.length,
      slotsWritten: 0,
    },
    candidatesByCenter: summarizeBy(analysis.candidates, "centerId"),
    candidatesByStatus: summarizeBy(analysis.candidates, "status"),
    conflictCsvPath,
    invalidCandidates: analysis.invalid,
    duplicateSlotConflicts: analysis.duplicateSlotConflicts,
    existingSlotConflicts: existing.existingConflicts,
    alreadyAlignedExamples: existing.alreadyAligned.slice(0, 20),
    slotsToCreateExamples: existing.toCreate.slice(0, 20).map((appointment) => ({
      appointmentId: appointment.id,
      centerId: appointment.centerId,
      dateTime: appointment.dateTime,
      status: appointment.status,
    })),
  };

  if (analysis.invalid.length > 0) {
    report.status = "blocked-invalid-appointments";
  } else if (hasConflicts && !args.skipConflicts) {
    report.status = "blocked-conflicts";
  } else if (!args.execute) {
    report.status = hasConflicts ? "dry-run-conflicts-skipped" : "dry-run-ok";
  } else if (canExecute) {
    report.counts.slotsWritten = await writeSlots(db, existing.toCreate, args, generatedAt);
    report.status = hasConflicts ? "executed-with-conflicts-skipped" : "executed";
  }

  const reportPath = writeReport(args, report);
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(`Rapport: ${reportPath}`);

  if (report.status.startsWith("blocked")) {
    console.error(
      report.status === "blocked-conflicts"
        ? "Backfill bloque: des conflits de creneaux existent. Relancer avec --skip-conflicts pour ecrire uniquement les creneaux propres."
        : "Backfill bloque: certains rendez-vous non annules sont invalides."
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
