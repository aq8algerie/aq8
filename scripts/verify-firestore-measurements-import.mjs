import fs from "node:fs";
import process from "node:process";

const MEASUREMENTS_CSV = "db-audit/out/measurement-import/measurements-import.crm.csv";

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
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

async function loadAdmin(projectId) {
  const adminApp = await import("firebase-admin/app");
  const adminFirestore = await import("firebase-admin/firestore");
  if (adminApp.getApps().length === 0) {
    adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId });
  }
  return adminFirestore.getFirestore();
}

async function main() {
  const rows = parseCsv(fs.readFileSync(MEASUREMENTS_CSV, "utf8"));
  const db = await loadAdmin(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
  let found = 0;
  const missing = [];
  for (let index = 0; index < rows.length; index += 100) {
    const slice = rows.slice(index, index + 100);
    const snapshots = await db.getAll(...slice.map((row) => db.collection("measurements").doc(row.id)));
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) found += 1;
      else missing.push(snapshot.id);
    });
  }
  const result = {
    measurements: {
      expected: rows.length,
      found,
      missing: missing.slice(0, 20),
      missingCount: missing.length,
    },
  };
  fs.writeFileSync("db-audit/out/firestore-import/firestore-measurements-post-import-verification.json", JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify(result, null, 2));
  if (missing.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
