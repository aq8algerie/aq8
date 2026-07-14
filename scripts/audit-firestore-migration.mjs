import fs from "node:fs";
import process from "node:process";

const COLLECTIONS = ["clients", "appointments", "payments", "packages", "measurements"];
const REPORT_PATH = "db-audit/out/firestore-import/firestore-migration-audit.json";

async function loadAdmin(projectId) {
  const adminApp = await import("firebase-admin/app");
  const adminFirestore = await import("firebase-admin/firestore");
  if (adminApp.getApps().length === 0) {
    adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId });
  }
  return adminFirestore.getFirestore();
}

async function readCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function countBy(rows, field) {
  return rows.reduce((acc, row) => {
    const key = row[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sumBy(rows, field) {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function missingRefs(rows, field, knownIds) {
  return rows
    .filter((row) => row[field] && !knownIds.has(row[field]))
    .map((row) => ({ id: row.id, [field]: row[field] }))
    .slice(0, 50);
}

async function main() {
  const db = await loadAdmin(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT);
  const data = {};
  for (const collectionName of COLLECTIONS) {
    data[collectionName] = await readCollection(db, collectionName);
  }

  const clientIds = new Set(data.clients.map((row) => row.id));
  const packageIds = new Set(data.packages.map((row) => row.id));
  const legacy = Object.fromEntries(
    Object.entries(data).map(([collectionName, rows]) => [
      collectionName,
      rows.filter((row) => row.importedFrom === "legacy-mysql").length,
    ])
  );

  const legacyData = Object.fromEntries(
    Object.entries(data).map(([collectionName, rows]) => [
      collectionName,
      rows.filter((row) => row.importedFrom === "legacy-mysql"),
    ])
  );
  const report = {
    generatedAt: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(data).map(([collectionName, rows]) => [collectionName, rows.length])),
    legacyCounts: legacy,
    clientsByCenter: countBy(data.clients, "centerId"),
    appointmentsByCenter: countBy(data.appointments, "centerId"),
    appointmentsByStatus: countBy(data.appointments, "status"),
    appointmentsByService: countBy(data.appointments, "serviceId"),
    paymentsByCenter: countBy(data.payments, "centerId"),
    paymentsByMethod: countBy(data.payments, "method"),
    paymentsTotalAmount: sumBy(data.payments.filter((row) => row.importedFrom === "legacy-mysql"), "amount"),
    measurementsByCenter: countBy(data.measurements, "centerId"),
    referentialIntegrity: {
      appointmentsMissingClients: missingRefs(data.appointments, "clientId", clientIds),
      paymentsMissingClients: missingRefs(data.payments, "clientId", clientIds),
      paymentsMissingPackages: missingRefs(data.payments, "packageId", packageIds),
      measurementsMissingClients: missingRefs(data.measurements, "clientId", clientIds),
    },
    legacyReferentialIntegrity: {
      appointmentsMissingClients: missingRefs(legacyData.appointments, "clientId", clientIds),
      paymentsMissingClients: missingRefs(legacyData.payments, "clientId", clientIds),
      paymentsMissingPackages: missingRefs(legacyData.payments, "packageId", packageIds),
      measurementsMissingClients: missingRefs(legacyData.measurements, "clientId", clientIds),
    },
  };

  fs.mkdirSync("db-audit/out/firestore-import", { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  const hasBrokenRefs = Object.values(report.legacyReferentialIntegrity).some((items) => items.length > 0);
  if (hasBrokenRefs) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
