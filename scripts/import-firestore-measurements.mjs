import fs from "node:fs";
import process from "node:process";

const DEFAULT_MEASUREMENTS_CSV = "db-audit/out/measurement-import/measurements-import.crm.csv";
const DEFAULT_CLIENTS_CSV = "db-audit/out/client-import/clients-import.crm.csv";
const DEFAULT_REPORT_DIR = "db-audit/out/firestore-import";

function parseArgs(argv) {
  const args = {
    measurements: DEFAULT_MEASUREMENTS_CSV,
    clients: DEFAULT_CLIENTS_CSV,
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
    else if (arg === "--measurements") args.measurements = argv[++index];
    else if (arg.startsWith("--measurements=")) args.measurements = arg.split("=")[1];
    else if (arg === "--clients") args.clients = argv[++index];
    else if (arg.startsWith("--clients=")) args.clients = arg.split("=")[1];
    else if (arg === "--report-dir") args.reportDir = argv[++index];
    else if (arg.startsWith("--report-dir=")) args.reportDir = arg.split("=")[1];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run import:firestore:measurements
  npm run import:firestore:measurements:execute

Options:
  --execute             Lance les ecritures Firestore. Sans cette option: dry-run.
  --allow-overwrite     Autorise les IDs deja presents.
  --replace             Remplace les documents au lieu d'un merge.
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
      } else if (char === '"') inQuotes = false;
      else cell += char;
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
    } else if (char !== "\r") cell += char;
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

function stripEmptyValues(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== ""));
}

function validateMeasurements(measurements, clientIds) {
  const errors = [];
  const seen = new Set();
  for (const [index, row] of measurements.entries()) {
    const line = index + 2;
    if (!row.id) errors.push(`measurements ligne ${line}: id manquant`);
    if (seen.has(row.id)) errors.push(`measurements ligne ${line}: id duplique ${row.id}`);
    seen.add(row.id);
    if (!clientIds.has(row.clientId)) errors.push(`measurements ligne ${line}: client introuvable ${row.clientId}`);
    if (!row.centerId || row.centerId === "center-unknown") errors.push(`measurements ligne ${line}: centre invalide`);
    if (!row.date) errors.push(`measurements ligne ${line}: date manquante`);
    if (!Number.isFinite(Number(row.weight)) || Number(row.weight) <= 0) errors.push(`measurements ligne ${line}: poids invalide ${row.weight}`);
  }
  return errors;
}

function normalizeMeasurement(row) {
  const data = stripEmptyValues({
    id: row.id,
    clientId: row.clientId,
    centerId: row.centerId,
    date: row.date,
    weight: Number(row.weight),
    chest: row.chest ? Number(row.chest) : "",
    hips: row.hips ? Number(row.hips) : "",
    thighs: row.thighs ? Number(row.thighs) : "",
    loggedBy: row.loggedBy,
  });
  data.importedFrom = "legacy-mysql";
  data.importBatch = "legacy-2026-07-07";
  return data;
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
  if (adminApp.getApps().length === 0) {
    adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId });
  }
  return adminFirestore.getFirestore();
}

async function findExistingIds(db, rows) {
  const existing = [];
  for (let index = 0; index < rows.length; index += 100) {
    const slice = rows.slice(index, index + 100);
    const snapshots = await db.getAll(...slice.map((row) => db.collection("measurements").doc(row.id)));
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) existing.push(snapshot.id);
    });
  }
  return existing;
}

async function writeMeasurements(db, rows, options) {
  const existing = options.allowOverwrite ? [] : await findExistingIds(db, rows);
  if (existing.length > 0) {
    throw new Error(
      `measurements: ${existing.length} document(s) existent deja. ` +
        `Relancer avec --allow-overwrite si c'est voulu. Exemples: ${existing.slice(0, 10).join(", ")}`
    );
  }
  let written = 0;
  for (let index = 0; index < rows.length; index += options.batchSize) {
    const batch = db.batch();
    const slice = rows.slice(index, index + options.batchSize);
    for (const row of slice) {
      batch.set(db.collection("measurements").doc(row.id), normalizeMeasurement(row), { merge: !options.replace });
    }
    await batch.commit();
    written += slice.length;
    console.log(`measurements: ${written}/${rows.length} ecrits`);
  }
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const measurements = readCsv(args.measurements);
  const clients = readCsv(args.clients);
  const clientIds = new Set(clients.map((row) => row.id));
  const validationErrors = validateMeasurements(measurements, clientIds);
  const report = {
    mode: args.execute ? "execute" : "dry-run",
    generatedAt: new Date().toISOString(),
    counts: { measurements: measurements.length, clients: clients.length },
    measurementsByCenter: summarizeRows(measurements, "centerId"),
    validationErrors,
    writes: {},
  };
  fs.mkdirSync(args.reportDir, { recursive: true });
  const reportPath = `${args.reportDir}/firestore-measurements-import-report.json`;

  if (validationErrors.length > 0) {
    report.status = "blocked";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.error(`Import mesures bloque: ${validationErrors.length} erreur(s).`);
    console.error(validationErrors.slice(0, 20).join("\n"));
    process.exitCode = 1;
    return;
  }

  if (!args.execute) {
    report.status = "dry-run-ok";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log("Dry-run mesures OK. Aucune ecriture Firestore effectuee.");
    console.log(JSON.stringify(report.counts, null, 2));
    return;
  }

  const db = await loadAdmin(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
  report.writes.measurements = await writeMeasurements(db, measurements, args);
  report.status = "executed";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Import mesures Firestore termine.");
  console.log(JSON.stringify(report.writes, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
