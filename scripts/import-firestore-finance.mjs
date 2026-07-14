import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_PACKAGES_CSV = "db-audit/out/payment-import/packages-import.crm.csv";
const DEFAULT_PAYMENTS_CSV = "db-audit/out/payment-import/payments-import.crm.csv";
const DEFAULT_CLIENTS_CSV = "db-audit/out/client-import/clients-import.crm.csv";
const DEFAULT_REPORT_DIR = "db-audit/out/firestore-import";

function parseArgs(argv) {
  const args = {
    collection: "all",
    packages: DEFAULT_PACKAGES_CSV,
    payments: DEFAULT_PAYMENTS_CSV,
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
    else if (arg === "--collection") args.collection = argv[++index];
    else if (arg.startsWith("--collection=")) args.collection = arg.split("=")[1];
    else if (arg === "--packages") args.packages = argv[++index];
    else if (arg.startsWith("--packages=")) args.packages = arg.split("=")[1];
    else if (arg === "--payments") args.payments = argv[++index];
    else if (arg.startsWith("--payments=")) args.payments = arg.split("=")[1];
    else if (arg === "--clients") args.clients = argv[++index];
    else if (arg.startsWith("--clients=")) args.clients = arg.split("=")[1];
    else if (arg === "--report-dir") args.reportDir = argv[++index];
    else if (arg.startsWith("--report-dir=")) args.reportDir = arg.split("=")[1];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!["all", "packages", "payments"].includes(args.collection)) {
    throw new Error("--collection doit valoir all, packages ou payments");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  npm run import:firestore:finance
  npm run import:firestore:finance -- --collection packages
  npm run import:firestore:finance -- --collection payments
  npm run import:firestore:finance:execute -- --collection packages
  npm run import:firestore:finance:execute -- --collection payments

Options:
  --execute             Lance les ecritures Firestore. Sans cette option: dry-run.
  --collection VALUE    all, packages ou payments. Defaut: all.
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

function validatePackages(packages) {
  const errors = [];
  const seen = new Set();
  const allowedTypes = new Set(["aq8", "wonder", "mix"]);
  for (const [index, row] of packages.entries()) {
    const line = index + 2;
    if (!row.id) errors.push(`packages ligne ${line}: id manquant`);
    if (seen.has(row.id)) errors.push(`packages ligne ${line}: id duplique ${row.id}`);
    seen.add(row.id);
    if (!row.name) errors.push(`packages ligne ${line}: nom manquant`);
    if (!allowedTypes.has(row.type)) errors.push(`packages ligne ${line}: type invalide ${row.type}`);
    if (!Number.isFinite(Number(row.sessionsCount))) errors.push(`packages ligne ${line}: sessionsCount invalide`);
    if (!Number.isFinite(Number(row.price))) errors.push(`packages ligne ${line}: price invalide`);
  }
  return errors;
}

function validatePayments(payments, clientIds, packageIds) {
  const errors = [];
  const seen = new Set();
  const allowedMethods = new Set(["cash", "card", "ccp", "cheque"]);
  for (const [index, row] of payments.entries()) {
    const line = index + 2;
    if (!row.id) errors.push(`payments ligne ${line}: id manquant`);
    if (seen.has(row.id)) errors.push(`payments ligne ${line}: id duplique ${row.id}`);
    seen.add(row.id);
    if (!clientIds.has(row.clientId)) errors.push(`payments ligne ${line}: client introuvable ${row.clientId}`);
    if (!packageIds.has(row.packageId)) errors.push(`payments ligne ${line}: package introuvable ${row.packageId}`);
    if (!row.centerId || row.centerId === "center-unknown") errors.push(`payments ligne ${line}: centre invalide`);
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) errors.push(`payments ligne ${line}: montant invalide ${row.amount}`);
    if (!row.date) errors.push(`payments ligne ${line}: date manquante`);
    if (!allowedMethods.has(row.method)) errors.push(`payments ligne ${line}: methode invalide ${row.method}`);
  }
  return errors;
}

function normalizePackage(row) {
  const data = stripEmptyValues({
    id: row.id,
    name: row.name,
    type: row.type,
    sessionsCount: Number(row.sessionsCount),
    price: Number(row.price),
    description: row.description,
  });
  data.importedFrom = "legacy-mysql";
  data.importBatch = "legacy-2026-07-07";
  return data;
}

function normalizePayment(row) {
  const data = stripEmptyValues({
    id: row.id,
    clientId: row.clientId,
    packageId: row.packageId,
    centerId: row.centerId,
    amount: Number(row.amount),
    date: row.date,
    method: row.method,
    receiptNumber: row.receiptNumber,
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
      batch.set(db.collection(collectionName).doc(row.id), normalize(row), { merge: !options.replace });
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

  const packages = readCsv(args.packages);
  const payments = readCsv(args.payments);
  const clients = readCsv(args.clients);
  const clientIds = new Set(clients.map((row) => row.id));
  const packageIds = new Set(packages.map((row) => row.id));
  const collections = args.collection === "all" ? ["packages", "payments"] : [args.collection];
  const validationErrors = [
    ...(collections.includes("packages") ? validatePackages(packages) : []),
    ...(collections.includes("payments") ? validatePayments(payments, clientIds, packageIds) : []),
  ];

  const report = {
    mode: args.execute ? "execute" : "dry-run",
    collection: args.collection,
    generatedAt: new Date().toISOString(),
    sources: {
      packages: path.resolve(args.packages),
      payments: path.resolve(args.payments),
      clients: path.resolve(args.clients),
    },
    counts: {
      packages: packages.length,
      payments: payments.length,
      clients: clients.length,
    },
    paymentsByCenter: summarizeRows(payments, "centerId"),
    paymentsByMethod: summarizeRows(payments, "method"),
    validationErrors,
    writes: {},
  };

  fs.mkdirSync(args.reportDir, { recursive: true });
  const reportPath = path.join(args.reportDir, "firestore-finance-import-report.json");

  if (validationErrors.length > 0) {
    report.status = "blocked";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.error(`Import finance bloque: ${validationErrors.length} erreur(s).`);
    console.error(validationErrors.slice(0, 20).join("\n"));
    process.exitCode = 1;
    return;
  }

  if (!args.execute) {
    report.status = "dry-run-ok";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log("Dry-run finance OK. Aucune ecriture Firestore effectuee.");
    console.log(JSON.stringify(report.counts, null, 2));
    return;
  }

  const db = await loadAdmin(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
  if (collections.includes("packages")) {
    report.writes.packages = await writeCollection(db, "packages", packages, normalizePackage, args);
  }
  if (collections.includes("payments")) {
    report.writes.payments = await writeCollection(db, "payments", payments, normalizePayment, args);
  }

  report.status = "executed";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Import finance Firestore termine.");
  console.log(JSON.stringify(report.writes, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
