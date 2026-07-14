const fs = require("fs");
const path = require("path");

const operationsPath = process.argv[2] || path.join(process.cwd(), "db-audit", "out", "finance-extract", "operations.csv");
const clientsPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "client-import", "clients-import.crm.csv");
const outDir = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "payment-import");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((line) => line.length > 1 || line[0] !== "");
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  ensureDir(outDir);
  const operations = parseCsv(fs.readFileSync(operationsPath, "utf8"));
  const clients = parseCsv(fs.readFileSync(clientsPath, "utf8"));
  const clientIds = new Set(clients.map((client) => client.id));

  const payments = [];
  const review = [];

  for (const operation of operations) {
    const amount = Number(operation.amount);
    const warnings = [];
    if (!clientIds.has(operation.clientId)) warnings.push("client_not_imported");
    if (!operation.centerId || operation.centerId === "center-unknown") warnings.push("unknown_center");
    if (!Number.isFinite(amount) || amount <= 0) warnings.push("not_positive_payment");

    const row = {
      id: `legacy-payment-${operation.legacyNodeId}`,
      clientId: operation.clientId,
      packageId: "pkg-legacy-payment",
      centerId: operation.centerId,
      amount,
      date: operation.date,
      method: "cash",
      receiptNumber: `LEG-${operation.legacyNodeId}`,
      legacyNodeId: operation.legacyNodeId,
      legacyUserId: operation.legacyUserId,
      importWarnings: warnings.join(";"),
    };

    if (warnings.length === 0) payments.push(row);
    else review.push(row);
  }

  payments.sort((a, b) => a.date.localeCompare(b.date) || Number(a.legacyNodeId) - Number(b.legacyNodeId));

  const packageRows = [{
    id: "pkg-legacy-payment",
    name: "Paiement legacy importé",
    type: "mix",
    sessionsCount: 0,
    price: 0,
    description: "Forfait technique utilisé pour rattacher les encaissements importés depuis l'ancien site.",
  }];

  const paymentColumns = ["id", "clientId", "packageId", "centerId", "amount", "date", "method", "receiptNumber"];
  const reviewColumns = Object.keys(review[0] || payments[0] || {});
  writeCsv(path.join(outDir, "payments-import.crm.csv"), payments, paymentColumns);
  writeCsv(path.join(outDir, "payments-import.review.csv"), [...payments, ...review], reviewColumns);
  writeCsv(path.join(outDir, "payments-import.needs-review.csv"), review, reviewColumns);
  writeCsv(path.join(outDir, "packages-import.crm.csv"), packageRows, Object.keys(packageRows[0]));

  const summary = {
    totalOperations: operations.length,
    readyPayments: payments.length,
    blockedForReview: review.length,
    totalReadyAmount: payments.reduce((sum, row) => sum + Number(row.amount), 0),
    byCenter: payments.reduce((acc, row) => {
      acc[row.centerId] = (acc[row.centerId] || 0) + 1;
      return acc;
    }, {}),
    reviewWarnings: review.reduce((acc, row) => {
      for (const warning of row.importWarnings.split(";").filter(Boolean)) {
        acc[warning] = (acc[warning] || 0) + 1;
      }
      return acc;
    }, {}),
  };

  fs.writeFileSync(path.join(outDir, "payments-import.summary.json"), JSON.stringify(summary, null, 2), "utf8");
  const report = [
    "# Paiements - preparation import CRM",
    "",
    `- Operations source: ${summary.totalOperations}`,
    `- Paiements positifs prets: ${summary.readyPayments}`,
    `- Lignes bloquees/revue: ${summary.blockedForReview}`,
    `- Montant total pret: ${summary.totalReadyAmount} DZD`,
    "",
    "## Regles",
    "- Seules les operations positives sont preparees comme paiements.",
    "- Les operations negatives sont exclues de l'import paiements et conservees en revue.",
    "- Methode par defaut: cash, faute de champ legacy plus precis.",
    "- Package technique: pkg-legacy-payment.",
    "",
    "## Fichiers",
    "- db-audit/out/payment-import/packages-import.crm.csv",
    "- db-audit/out/payment-import/payments-import.crm.csv",
    "- db-audit/out/payment-import/payments-import.review.csv",
    "- db-audit/out/payment-import/payments-import.needs-review.csv",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "payments-import.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main();
