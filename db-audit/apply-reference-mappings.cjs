const fs = require("fs");
const path = require("path");

const reservationsReviewPath = process.argv[2] || path.join(process.cwd(), "db-audit", "out", "reservation-import", "reservations-import.review.csv");
const serviceMappingPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "reference-mapping", "service-mapping.csv");
const outDir = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "final-import");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
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
    } else if (ch !== "\r") {
      cell += ch;
    }
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

function isBlocking(row) {
  const warnings = String(row.importWarnings || "").split(";").filter(Boolean);
  return warnings.includes("missing_client") || warnings.includes("unknown_center") || warnings.includes("invalid_duration");
}

function main() {
  ensureDir(outDir);
  const reservations = parseCsv(fs.readFileSync(reservationsReviewPath, "utf8"));
  const serviceMappings = parseCsv(fs.readFileSync(serviceMappingPath, "utf8"));
  const servicesByLegacyId = new Map(serviceMappings.map((row) => [row.legacyServiceId, row]));

  const mapped = reservations.map((row) => {
    const mapping = servicesByLegacyId.get(row.legacyServiceId);
    const serviceId = mapping?.suggestedCrmServiceId || row.serviceId;
    const notes = [
      row.notes,
      row.legacyCoachId ? `Coach legacy ID: ${row.legacyCoachId}` : "",
      row.legacyCoachTitle ? `Coach legacy: ${row.legacyCoachTitle}` : "",
      mapping?.confidence === "medium" ? `Mapping service a valider: ${mapping.legacyServiceTitle}` : "",
    ].filter(Boolean).join(" | ");

    return {
      id: row.id,
      clientId: row.clientId,
      serviceId,
      centerId: row.centerId,
      dateTime: row.dateTime,
      duration: row.duration,
      status: row.status,
      notes,
      legacyNodeId: row.legacyNodeId,
      legacyServiceId: row.legacyServiceId,
      legacyServiceTitle: row.legacyServiceTitle,
      legacyCoachId: row.legacyCoachId,
      importWarnings: row.importWarnings,
    };
  });

  const ready = mapped.filter((row) => !isBlocking(row));
  const needsReview = mapped.filter(isBlocking);
  const crmColumns = ["id", "clientId", "serviceId", "centerId", "dateTime", "duration", "status", "notes"];
  const reviewColumns = Object.keys(mapped[0] || {});

  writeCsv(path.join(outDir, "appointments-import.crm.csv"), ready, crmColumns);
  writeCsv(path.join(outDir, "appointments-import.review.csv"), mapped, reviewColumns);
  writeCsv(path.join(outDir, "appointments-import.needs-review.csv"), needsReview, reviewColumns);

  const summary = {
    total: mapped.length,
    readyForImport: ready.length,
    blockedForReview: needsReview.length,
    byService: ready.reduce((acc, row) => {
      acc[row.serviceId] = (acc[row.serviceId] || 0) + 1;
      return acc;
    }, {}),
    byCenter: ready.reduce((acc, row) => {
      acc[row.centerId] = (acc[row.centerId] || 0) + 1;
      return acc;
    }, {}),
  };

  fs.writeFileSync(path.join(outDir, "appointments-import.summary.json"), JSON.stringify(summary, null, 2), "utf8");
  const report = [
    "# Import final rendez-vous CRM",
    "",
    `- Total reservations legacy: ${summary.total}`,
    `- Rendez-vous prets a importer: ${summary.readyForImport}`,
    `- Rendez-vous a revoir: ${summary.blockedForReview}`,
    "",
    "## Regles",
    "- Mapping service applique depuis service-mapping.csv.",
    "- Coachs conserves en note legacy uniquement, pas convertis en managers CRM.",
    "- Lignes sans client, sans centre ou avec duree invalide bloquees.",
    "",
    "## Fichiers",
    "- db-audit/out/final-import/appointments-import.crm.csv",
    "- db-audit/out/final-import/appointments-import.review.csv",
    "- db-audit/out/final-import/appointments-import.needs-review.csv",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "appointments-import.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main();
