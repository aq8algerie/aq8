const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const schemaPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "schema-summary.json");
const clientsCsvPath = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "extract", "clients.csv");
const reservationsReviewPath = process.argv[5] || path.join(process.cwd(), "db-audit", "out", "reservation-import", "reservations-import.review.csv");
const outDir = process.argv[6] || path.join(process.cwd(), "db-audit", "out", "client-import");

if (!dumpPath) {
  console.error("Usage: node prepare-clients-import.cjs <dump-path> [schema-summary] [clients.csv] [reservations-review.csv] [out-dir]");
  process.exit(1);
}

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

function cleanText(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
}
function titleCaseName(value) {
  const particles = new Set(["de", "du", "des", "ben", "bent", "el", "al"]);
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr-FR")
    .split(" ")
    .map((part) => {
      if (particles.has(part)) return part;
      return part.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("fr-FR"));
    })
    .join(" ");
}

function splitName(fullName, username) {
  const cleanFullName = String(fullName || "").trim();
  const cleanUsername = String(username || "").trim();
  const source = titleCaseName(cleanFullName.includes(" ") || !cleanUsername.includes(" ") ? cleanFullName || cleanUsername : cleanUsername);
  if (!source) return { firstName: "", lastName: "" };
  const parts = source.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : email;
}

function normalizePhone(value) {
  let phone = String(value || "").trim().replace(/[^\d+]/g, "");
  if (!phone) return "";
  if (phone.startsWith("00213")) phone = `+213${phone.slice(5)}`;
  if (phone.startsWith("0") && phone.length === 10) phone = `+213${phone.slice(1)}`;
  if (!phone.startsWith("+") && phone.length === 9 && /^[567]/.test(phone)) phone = `+213${phone}`;
  return phone;
}

function mapCenter(site, fallbackCenter) {
  const text = String(site || "").toLowerCase();
  if (text.includes("ouled")) return "center-2";
  if (text.includes("blida")) return "center-3";
  if (text.includes("tlemcen")) return "center-4";
  if (text.includes("sidi")) return "center-5";
  if (text.includes("birkhadem") || text.includes("bir khadem")) return "center-1";
  return fallbackCenter && fallbackCenter !== "center-unknown" ? fallbackCenter : "center-unknown";
}

function inferCenterByReservations(reservations) {
  const byUser = new Map();
  for (const reservation of reservations) {
    if (!reservation.legacyUserId || !reservation.centerId || reservation.centerId === "center-unknown") continue;
    const counts = byUser.get(reservation.legacyUserId) || {};
    counts[reservation.centerId] = (counts[reservation.centerId] || 0) + 1;
    byUser.set(reservation.legacyUserId, counts);
  }

  const result = new Map();
  for (const [uid, counts] of byUser.entries()) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) result.set(uid, sorted[0][0]);
  }
  return result;
}

async function loadUserSites(dump, schema) {
  const columns = schema.user__field_user_site.columns;
  const sites = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(dump, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.startsWith("INSERT INTO `user__field_user_site`")) continue;
    for (const tuple of parseInsertTuples(line)) {
      const record = makeRecord(columns, tuple);
      if (record.deleted === 0 && record.delta === 0) {
        sites.set(String(record.entity_id), record.field_user_site_value || "");
      }
    }
  }
  return sites;
}

function isLikelyAdmin(row) {
  const text = `${row.username} ${row.full_name} ${row.email}`.toLowerCase();
  return text.includes("admin");
}

async function main() {
  ensureDir(outDir);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const clients = parseCsv(fs.readFileSync(clientsCsvPath, "utf8"));
  const reservations = fs.existsSync(reservationsReviewPath)
    ? parseCsv(fs.readFileSync(reservationsReviewPath, "utf8"))
    : [];
  const sites = await loadUserSites(dumpPath, schema);
  const fallbackCenters = inferCenterByReservations(reservations);
  const clientsWithImportableReservations = new Set(
    reservations
      .filter((reservation) => reservation.clientId && reservation.centerId !== "center-unknown" && !String(reservation.importWarnings || "").includes("missing_client") && !String(reservation.importWarnings || "").includes("invalid_duration"))
      .map((reservation) => reservation.clientId)
  );

  const emailCounts = {};
  const phoneCounts = {};
  for (const client of clients) {
    const email = normalizeEmail(client.email);
    const phone = normalizePhone(client.phone);
    if (email) emailCounts[email] = (emailCounts[email] || 0) + 1;
    if (phone) phoneCounts[phone] = (phoneCounts[phone] || 0) + 1;
  }

  const prepared = clients.map((client) => {
    const uid = String(client.uid || "").trim();
    const site = sites.get(uid) || "";
    const centerId = mapCenter(site, fallbackCenters.get(uid));
    const { firstName, lastName } = splitName(client.full_name, client.username);
    const email = normalizeEmail(client.email);
    const phone = normalizePhone(client.phone);
    const warnings = [];

    if (!uid || uid === "0") warnings.push("system_or_missing_uid");
    if (!firstName && !lastName) warnings.push("missing_name");
    if (!phone) warnings.push("missing_phone");
    if (!email) warnings.push("missing_email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) warnings.push("invalid_email");
    if (phone && !/^\+\d{8,15}$/.test(phone)) warnings.push("phone_to_review");
    if (centerId === "center-unknown") warnings.push("unknown_center");
    if (client.status !== "1") warnings.push("inactive_legacy_user");
    if (isLikelyAdmin(client)) warnings.push("possible_admin_account");
    if (email && emailCounts[email] > 1) warnings.push("duplicate_email");
    if (phone && phoneCounts[phone] > 1) warnings.push("duplicate_phone");

    const notes = [
      cleanText(client.diseases) ? `Conditions medicales legacy: ${cleanText(client.diseases)}` : "",
      client.age ? `Age legacy: ${client.age}` : "",
      site ? `Site legacy: ${site}` : "",
      client.username ? `Identifiant legacy: ${client.username}` : "",
    ].filter(Boolean).join(" | ");

    return {
      id: `legacy-client-${uid}`,
      firstName,
      lastName,
      email,
      phone,
      centerId,
      createdAt: String(client.created_at || "").slice(0, 10),
      notes: cleanText(notes),
      gender: ["H", "F"].includes(client.sex) ? client.sex : "",
      medicalConditions: cleanText(client.diseases),
      legacyUid: uid,
      legacyUsername: client.username || "",
      legacyFullName: cleanText(client.full_name),
      legacyAge: client.age || "",
      legacySex: client.sex || "",
      legacySite: site,
      legacyStatus: client.status || "",
      legacyLastAccessAt: client.last_access_at || "",
      hasImportableReservation: clientsWithImportableReservations.has(`legacy-client-${uid}`) ? "1" : "0",
      importWarnings: warnings.join(";"),
    };
  }).sort((a, b) => {
    const centerCompare = a.centerId.localeCompare(b.centerId);
    if (centerCompare !== 0) return centerCompare;
    const nameCompare = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr");
    if (nameCompare !== 0) return nameCompare;
    return Number(a.legacyUid) - Number(b.legacyUid);
  });

  const isBlocking = (row) => {
    const warnings = row.importWarnings.split(";").filter(Boolean);
    return warnings.includes("system_or_missing_uid") ||
      warnings.includes("missing_name") ||
      warnings.includes("missing_phone") ||
      warnings.includes("unknown_center") ||
      (warnings.includes("inactive_legacy_user") && row.hasImportableReservation !== "1") ||
      (warnings.includes("possible_admin_account") && row.hasImportableReservation !== "1");
  };

  const crmColumns = ["id", "firstName", "lastName", "email", "phone", "centerId", "createdAt", "notes", "gender", "medicalConditions"];
  const reviewColumns = Object.keys(prepared[0] || {});
  const readyRows = prepared.filter((row) => !isBlocking(row));
  const blockedRows = prepared.filter(isBlocking);
  const warningRows = prepared.filter((row) => row.importWarnings);

  writeCsv(path.join(outDir, "clients-import.crm.csv"), readyRows, crmColumns);
  writeCsv(path.join(outDir, "clients-import.crm-ready.csv"), readyRows, crmColumns);
  writeCsv(path.join(outDir, "clients-import.crm-all.csv"), prepared, crmColumns);
  writeCsv(path.join(outDir, "clients-import.review.csv"), prepared, reviewColumns);
  writeCsv(path.join(outDir, "clients-import.needs-review.csv"), blockedRows, reviewColumns);
  writeCsv(path.join(outDir, "clients-import.warnings.csv"), warningRows, reviewColumns);

  const counts = {
    total: prepared.length,
    readyForImport: readyRows.length,
    blockedForReview: blockedRows.length,
    withWarnings: warningRows.length,
    byCenter: {},
    byGender: {},
    warnings: {},
  };

  for (const row of prepared) {
    counts.byCenter[row.centerId] = (counts.byCenter[row.centerId] || 0) + 1;
    counts.byGender[row.gender || "unknown"] = (counts.byGender[row.gender || "unknown"] || 0) + 1;
    for (const warning of row.importWarnings.split(";").filter(Boolean)) {
      counts.warnings[warning] = (counts.warnings[warning] || 0) + 1;
    }
  }

  fs.writeFileSync(path.join(outDir, "clients-import.summary.json"), JSON.stringify(counts, null, 2), "utf8");

  const report = [
    "# Clients - preparation import CRM",
    "",
    `- Total traite: ${counts.total}`,
    `- Pret a importer: ${counts.readyForImport}`,
    `- Bloque pour revue: ${counts.blockedForReview}`,
    `- Fichier CRM pret a importer: db-audit/out/client-import/clients-import.crm.csv`,
    `- Fichier complet de revue: db-audit/out/client-import/clients-import.review.csv`,
    `- Lignes bloquees a revoir: db-audit/out/client-import/clients-import.needs-review.csv`,
    "",
    "## Regles appliquees",
    "- ID CRM stable: legacy-client-{uid}.",
    "- Normalisation nom/prenom, email minuscule, telephone au format international quand possible.",
    "- Centre CRM depuis le site legacy, puis depuis les reservations deja mappees quand le site manque.",
    "- Comptes systeme, sans telephone, sans nom ou sans centre bloques pour revue; comptes admin/inactifs conserves si une reservation importable les reference.",
    "- Conservation des champs legacy dans le fichier de revue.",
    "",
    "## Points de controle",
    `- Centres: ${JSON.stringify(counts.byCenter)}`,
    `- Genres: ${JSON.stringify(counts.byGender)}`,
    `- Alertes: ${JSON.stringify(counts.warnings)}`,
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "clients-import.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
