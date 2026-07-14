const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const schemaPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "schema-summary.json");
const clientsPath = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "client-import", "clients-import.review.csv");
const outDir = process.argv[5] || path.join(process.cwd(), "db-audit", "out", "finance-extract");

if (!dumpPath) {
  console.error("Usage: node extract-finance.cjs <dump-path> [schema-summary] [clients-review.csv] [out-dir]");
  process.exit(1);
}

const targetTables = new Set(["node_field_data", "node__field_amount", "node__field_user"]);

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

function unixDate(seconds) {
  if (!seconds && seconds !== 0) return "";
  return new Date(Number(seconds) * 1000).toISOString();
}

function classifyOperation(title, amount) {
  const text = String(title || "").toLowerCase();
  if (amount < 0 || text.includes("refund") || text.includes("rembours")) return "refund";
  if (text.includes("reservation")) return "reservation_payment";
  if (text.includes("membership") || text.includes("abonnement") || text.includes("forfait")) return "package_payment";
  return "payment";
}

async function main() {
  ensureDir(outDir);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const clients = fs.existsSync(clientsPath) ? parseCsv(fs.readFileSync(clientsPath, "utf8")) : [];
  const clientsById = new Map(clients.map((row) => [row.legacyUid, row]));
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

  const amountByNode = oneByEntity(extracted.node__field_amount, "field_amount_value");
  const userByNode = oneByEntity(extracted.node__field_user, "field_user_target_id");

  const operations = extracted.node_field_data
    .filter((node) => node.type === "operation")
    .map((node) => {
      const legacyUserId = String(userByNode.get(node.nid) || "");
      const client = clientsById.get(legacyUserId);
      const amount = Number(amountByNode.get(node.nid) ?? 0);
      return {
        legacyNodeId: node.nid,
        title: node.title,
        clientId: legacyUserId ? `legacy-client-${legacyUserId}` : "",
        legacyUserId,
        clientName: client ? `${client.firstName} ${client.lastName}`.trim() || client.legacyFullName : "",
        centerId: client?.centerId || "center-unknown",
        amount,
        operationType: classifyOperation(node.title, amount),
        date: unixDate(node.created).slice(0, 10),
        createdAt: unixDate(node.created),
        changedAt: unixDate(node.changed),
        status: node.status,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.legacyNodeId) - Number(b.legacyNodeId));

  const summary = {
    totalOperations: operations.length,
    withClient: operations.filter((row) => row.clientId).length,
    withKnownCenter: operations.filter((row) => row.centerId !== "center-unknown").length,
    totalAmount: operations.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    byType: {},
    byCenter: {},
    topTitles: {},
  };

  for (const row of operations) {
    summary.byType[row.operationType] = (summary.byType[row.operationType] || 0) + 1;
    summary.byCenter[row.centerId] = (summary.byCenter[row.centerId] || 0) + 1;
    summary.topTitles[row.title] = (summary.topTitles[row.title] || 0) + 1;
  }

  summary.topTitles = Object.fromEntries(
    Object.entries(summary.topTitles).sort((a, b) => b[1] - a[1]).slice(0, 30)
  );

  writeCsv(path.join(outDir, "operations.csv"), operations, Object.keys(operations[0] || {}));
  fs.writeFileSync(path.join(outDir, "finance-summary.json"), JSON.stringify(summary, null, 2), "utf8");

  const report = [
    "# Audit finance legacy",
    "",
    `- Operations detectees: ${summary.totalOperations}`,
    `- Operations avec client: ${summary.withClient}`,
    `- Operations avec centre connu: ${summary.withKnownCenter}`,
    `- Montant total brut: ${summary.totalAmount}`,
    "",
    "## Lecture initiale",
    "- Les operations ont un montant et un client, mais pas de champ forfait/package explicite dans le schema extrait.",
    "- Le type exact de paiement doit etre valide depuis les titres et les montants avant import dans `payments`.",
    "- Les `membership` ne sont que 5 lignes; elles ne suffisent pas a reconstruire tout l'historique des forfaits.",
    "",
    "## Fichiers",
    "- db-audit/out/finance-extract/operations.csv",
    "- db-audit/out/finance-extract/finance-summary.json",
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "finance-report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
