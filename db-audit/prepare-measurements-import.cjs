const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const schemaPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "schema-summary.json");
const clientsPath = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "client-import", "clients-import.crm.csv");
const outDir = process.argv[5] || path.join(process.cwd(), "db-audit", "out", "measurement-import");

if (!dumpPath) {
  console.error("Usage: node prepare-measurements-import.cjs <dump-path> [schema-summary] [clients.csv] [out-dir]");
  process.exit(1);
}

const targetTables = new Set([
  "node_field_data",
  "node__field_user",
  "node__field_date",
  "node__field_weight",
  "node__field_height",
  "node__field_chest",
  "node__field_buttocks",
  "node__field_thighs_h",
  "node__field_thighs_m",
  "node__field_target",
]);

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

function unescapeSqlString(value) {
  return value
    .replace(/\\0/g, "\0")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\Z/g, "\x1a")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function parseValue(raw) {
  const value = raw.trim();
  if (value.toUpperCase() === "NULL") return null;
  if (value.startsWith("_binary ")) return parseValue(value.slice(8));
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return unescapeSqlString(value.slice(1, -1));
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseInsertTuples(line) {
  const valuesAt = line.indexOf(" VALUES ");
  if (valuesAt === -1) return [];
  const tuples = [];
  let tuple = [];
  let token = "";
  let depth = 0;
  let quote = null;
  let escaped = false;
  const sql = line.slice(valuesAt + 8).replace(/;$/, "");
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quote) {
      token += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      token += ch;
      continue;
    }
    if (ch === "(" && depth === 0) {
      depth = 1;
      tuple = [];
      token = "";
      continue;
    }
    if (ch === "(") {
      depth += 1;
      token += ch;
      continue;
    }
    if (ch === ")" && depth === 1) {
      tuple.push(parseValue(token));
      tuples.push(tuple);
      tuple = [];
      token = "";
      depth = 0;
      continue;
    }
    if (ch === ")" && depth > 1) {
      depth -= 1;
      token += ch;
      continue;
    }
    if (ch === "," && depth === 1) {
      tuple.push(parseValue(token));
      token = "";
      continue;
    }
    if (depth > 0) token += ch;
  }
  return tuples;
}

function makeRecord(columns, values) {
  return Object.fromEntries(columns.map((column, index) => [column.name, values[index] ?? null]));
}

function oneByEntity(rows, valueColumn) {
  const map = new Map();
  for (const row of rows) {
    if (row.deleted === 0 && row.delta === 0) map.set(row.entity_id, row[valueColumn]);
  }
  return map;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
}

async function main() {
  ensureDir(outDir);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const clients = parseCsv(fs.readFileSync(clientsPath, "utf8"));
  const clientsById = new Map(clients.map((row) => [row.id, row]));
  const extracted = Object.fromEntries([...targetTables].map((table) => [table, []]));

  const rl = readline.createInterface({
    input: fs.createReadStream(dumpPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const match = line.match(/^INSERT INTO `([^`]+)`/);
    if (!match || !targetTables.has(match[1])) continue;
    const table = match[1];
    for (const tuple of parseInsertTuples(line)) {
      extracted[table].push(makeRecord(schema[table].columns, tuple));
    }
  }

  const userByNode = oneByEntity(extracted.node__field_user, "field_user_target_id");
  const dateByNode = oneByEntity(extracted.node__field_date, "field_date_value");
  const weightByNode = oneByEntity(extracted.node__field_weight, "field_weight_value");
  const heightByNode = oneByEntity(extracted.node__field_height, "field_height_value");
  const chestByNode = oneByEntity(extracted.node__field_chest, "field_chest_value");
  const buttocksByNode = oneByEntity(extracted.node__field_buttocks, "field_buttocks_value");
  const thighHighByNode = oneByEntity(extracted.node__field_thighs_h, "field_thighs_h_value");
  const thighMidByNode = oneByEntity(extracted.node__field_thighs_m, "field_thighs_m_value");
  const targetByNode = oneByEntity(extracted.node__field_target, "field_target_value");

  const allRows = extracted.node_field_data
    .filter((node) => node.type === "measurement")
    .map((node) => {
      const legacyUserId = String(userByNode.get(node.nid) || "");
      const clientId = legacyUserId ? `legacy-client-${legacyUserId}` : "";
      const client = clientsById.get(clientId);
      const thighH = num(thighHighByNode.get(node.nid));
      const thighM = num(thighMidByNode.get(node.nid));
      const thighs = thighH && thighM ? Number(((thighH + thighM) / 2).toFixed(2)) : thighH || thighM || "";
      const warnings = [];

      if (!clientId || !client) warnings.push("client_not_imported");
      if (!client?.centerId || client.centerId === "center-unknown") warnings.push("unknown_center");
      if (!dateByNode.get(node.nid)) warnings.push("missing_date");
      if (!weightByNode.get(node.nid)) warnings.push("missing_weight");

      const notes = [
        heightByNode.get(node.nid) ? `Taille legacy: ${heightByNode.get(node.nid)} cm` : "",
        targetByNode.get(node.nid) ? `Objectif poids legacy: ${targetByNode.get(node.nid)} kg` : "",
        thighH || thighM ? `Cuisses legacy H/M: ${thighH || "-"} / ${thighM || "-"}` : "",
      ].filter(Boolean).join(" | ");

      return {
        id: `legacy-measurement-${node.nid}`,
        clientId,
        centerId: client?.centerId || "center-unknown",
        date: String(dateByNode.get(node.nid) || "").slice(0, 10),
        weight: num(weightByNode.get(node.nid)),
        chest: num(chestByNode.get(node.nid)),
        hips: num(buttocksByNode.get(node.nid)),
        thighs,
        loggedBy: "legacy-import",
        notes,
        legacyNodeId: node.nid,
        legacyUserId,
        height: num(heightByNode.get(node.nid)),
        targetWeight: num(targetByNode.get(node.nid)),
        thighHigh: thighH,
        thighMid: thighM,
        importWarnings: warnings.join(";"),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.legacyNodeId) - Number(b.legacyNodeId));

  const ready = allRows.filter((row) => !row.importWarnings);
  const review = allRows.filter((row) => row.importWarnings);
  const crmColumns = ["id", "clientId", "centerId", "date", "weight", "chest", "hips", "thighs", "loggedBy"];
  const reviewColumns = Object.keys(allRows[0] || {});

  writeCsv(path.join(outDir, "measurements-import.crm.csv"), ready, crmColumns);
  writeCsv(path.join(outDir, "measurements-import.review.csv"), allRows, reviewColumns);
  writeCsv(path.join(outDir, "measurements-import.needs-review.csv"), review, reviewColumns);

  const summary = {
    totalMeasurements: allRows.length,
    readyForImport: ready.length,
    blockedForReview: review.length,
    byCenter: ready.reduce((acc, row) => {
      acc[row.centerId] = (acc[row.centerId] || 0) + 1;
      return acc;
    }, {}),
    warnings: review.reduce((acc, row) => {
      for (const warning of row.importWarnings.split(";").filter(Boolean)) {
        acc[warning] = (acc[warning] || 0) + 1;
      }
      return acc;
    }, {}),
  };

  fs.writeFileSync(path.join(outDir, "measurements-import.summary.json"), JSON.stringify(summary, null, 2), "utf8");
  const report = [
    "# Mesures corporelles - preparation import CRM",
    "",
    `- Mesures source: ${summary.totalMeasurements}`,
    `- Pretes a importer: ${summary.readyForImport}`,
    `- Bloquees/revue: ${summary.blockedForReview}`,
    "",
    "## Mapping",
    "- weight -> poids.",
    "- chest -> tour de poitrine.",
    "- buttocks -> hips dans le CRM.",
    "- thighs_h/thighs_m -> moyenne vers thighs.",
    "- height et target conserves dans le fichier de revue, car le CRM n'a pas de champs dedies.",
    "",
    "## Fichiers",
    "- db-audit/out/measurement-import/measurements-import.crm.csv",
    "- db-audit/out/measurement-import/measurements-import.review.csv",
    "- db-audit/out/measurement-import/measurements-import.needs-review.csv",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "measurements-import.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
