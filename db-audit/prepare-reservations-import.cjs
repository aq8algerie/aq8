const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const schemaPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "schema-summary.json");
const reservationCsvPath = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "extract", "reservations.csv");
const outDir = process.argv[5] || path.join(process.cwd(), "db-audit", "out", "reservation-import");

if (!dumpPath) {
  console.error("Usage: node prepare-reservations-import.cjs <dump-path> [schema-summary] [reservations.csv] [out-dir]");
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

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
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
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
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
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
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

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr-FR"));
}

function inferService(row, serviceTitle) {
  const text = `${row.title} ${serviceTitle}`.toLowerCase();
  if (text.includes("wonder")) {
    return { crmServiceId: "srv-3", serviceFamily: "wonder", duration: 60 };
  }
  if (text.includes("combin")) {
    return { crmServiceId: "srv-4", serviceFamily: "mix", duration: 60 };
  }
  return { crmServiceId: "srv-1", serviceFamily: "aq8", duration: 60 };
}

function inferCenterId(row, userSite) {
  const text = `${userSite || ""} ${row.title} ${row.comment}`.toLowerCase();
  if (text.includes("ouled")) return "center-2";
  if (text.includes("blida")) return "center-3";
  if (text.includes("tlemcen")) return "center-4";
  if (text.includes("sidi")) return "center-5";
  if (text.includes("birkhadem") || text.includes("bir khadem")) return "center-1";
  return "center-unknown";
}

function minutesBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

function toCrmDateTime(value) {
  return String(value || "").replace(/:00$/, "");
}

async function loadReferences(dump, schema) {
  const columns = schema.node_field_data.columns;
  const userSiteColumns = schema.user__field_user_site.columns;
  const titles = new Map();
  const types = new Map();
  const userSites = new Map();

  const rl = readline.createInterface({
    input: fs.createReadStream(dump, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.startsWith("INSERT INTO `node_field_data`")) {
      for (const tuple of parseInsertTuples(line)) {
        const record = makeRecord(columns, tuple);
        titles.set(Number(record.nid), record.title || "");
        types.set(Number(record.nid), record.type || "");
      }
      continue;
    }

    if (line.startsWith("INSERT INTO `user__field_user_site`")) {
      for (const tuple of parseInsertTuples(line)) {
        const record = makeRecord(userSiteColumns, tuple);
        if (record.deleted === 0 && record.delta === 0) {
          userSites.set(Number(record.entity_id), record.field_user_site_value || "");
        }
      }
    }
  }

  return { titles, types, userSites };
}

async function main() {
  ensureDir(outDir);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const reservations = parseCsv(fs.readFileSync(reservationCsvPath, "utf8"));
  const { titles: nodeTitles, types: nodeTypes, userSites } = await loadReferences(dumpPath, schema);

  const enriched = reservations.map((row) => {
    const serviceId = Number(row.service_id);
    const coachId = Number(row.coach_id);
    const serviceTitle = nodeTitles.get(serviceId) || "";
    const coachTitle = nodeTitles.get(coachId) || "";
    const legacyUserSite = userSites.get(Number(row.user_id)) || "";
    const inferred = inferService(row, serviceTitle);
    const realDuration = minutesBetween(row.reservation_start, row.reservation_end);
    const warnings = [];
    const centerId = inferCenterId(row, legacyUserSite);

    if (row.cancelled === "1") warnings.push("legacy_cancelled");
    if (row.refunded === "1") warnings.push("legacy_refunded");
    if (!row.user_id) warnings.push("missing_client");
    if (centerId === "center-unknown") warnings.push("unknown_center");
    if (!serviceTitle) warnings.push("unknown_legacy_service_title");
    if (!coachTitle) warnings.push("unknown_legacy_coach_title");
    if (!realDuration || realDuration <= 0) warnings.push("invalid_duration");
    if (realDuration && realDuration !== inferred.duration) warnings.push(`legacy_duration_${realDuration}_min`);

    const status = row.cancelled === "1" ? "cancelled" : row.refunded === "1" ? "cancelled" : "booked";
    const clientName = normalizeName(row.client_name);
    const noteParts = [
      row.comment ? `Commentaire legacy: ${row.comment}` : "",
      serviceTitle ? `Service legacy: ${serviceTitle}` : "",
      coachTitle ? `Coach legacy: ${coachTitle}` : "",
      row.refunded === "1" ? "Ancien statut: rembourse" : "",
    ].filter(Boolean);

    return {
      id: `legacy-reservation-${row.node_id}`,
      clientId: row.user_id ? `legacy-client-${row.user_id}` : "",
      serviceId: inferred.crmServiceId,
      centerId,
      dateTime: toCrmDateTime(row.reservation_start),
      duration: realDuration || inferred.duration,
      status,
      notes: noteParts.join(" | "),
      legacyNodeId: row.node_id,
      legacyUserId: row.user_id,
      legacyClientName: clientName,
      legacyClientEmail: String(row.client_email || "").trim().toLowerCase(),
      legacyClientPhone: String(row.client_phone || "").trim().replace(/\s+/g, ""),
      legacyUserSite,
      legacyServiceId: row.service_id,
      legacyServiceTitle: serviceTitle,
      legacyServiceType: nodeTypes.get(serviceId) || "",
      legacyCoachId: row.coach_id,
      legacyCoachTitle: coachTitle,
      legacyTitle: row.title,
      originalStart: row.reservation_start,
      originalEnd: row.reservation_end,
      legacyCancelled: row.cancelled,
      legacyRefunded: row.refunded,
      importWarnings: warnings.join(";"),
    };
  });

  enriched.sort((a, b) => {
    const dateCompare = a.dateTime.localeCompare(b.dateTime);
    if (dateCompare !== 0) return dateCompare;
    const centerCompare = a.centerId.localeCompare(b.centerId);
    if (centerCompare !== 0) return centerCompare;
    return Number(a.legacyNodeId) - Number(b.legacyNodeId);
  });

  const slotCounts = new Map();
  for (const row of enriched) {
    const key = [row.centerId, row.dateTime, row.clientId, row.serviceId].join("|");
    slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
  }

  for (const row of enriched) {
    const key = [row.centerId, row.dateTime, row.clientId, row.serviceId].join("|");
    if (slotCounts.get(key) > 1) {
      row.importWarnings = [row.importWarnings, "possible_duplicate_same_client_slot"].filter(Boolean).join(";");
    }
  }

  const appointmentColumns = ["id", "clientId", "serviceId", "centerId", "dateTime", "duration", "status", "notes"];
  const reviewColumns = Object.keys(enriched[0] || {});
  const isBlocking = (row) => {
    const warnings = row.importWarnings.split(";").filter(Boolean);
    return warnings.includes("missing_client") || warnings.includes("unknown_center") || warnings.includes("invalid_duration");
  };
  const readyRows = enriched.filter((row) => !isBlocking(row));
  const blockedRows = enriched.filter(isBlocking);
  const reviewRows = enriched.filter((row) => row.importWarnings);

  writeCsv(path.join(outDir, "reservations-import.crm-all.csv"), enriched, appointmentColumns);
  writeCsv(path.join(outDir, "reservations-import.crm-ready.csv"), readyRows, appointmentColumns);
  writeCsv(path.join(outDir, "reservations-import.crm.csv"), readyRows, appointmentColumns);
  writeCsv(path.join(outDir, "reservations-import.review.csv"), enriched, reviewColumns);
  writeCsv(path.join(outDir, "reservations-import.needs-review.csv"), blockedRows, reviewColumns);
  writeCsv(path.join(outDir, "reservations-import.warnings.csv"), reviewRows, reviewColumns);

  const counts = {
    total: enriched.length,
    byStatus: {},
    byCenter: {},
    byService: {},
    readyForImport: readyRows.length,
    blockedForReview: blockedRows.length,
    withWarnings: reviewRows.length,
    warnings: {},
  };

  for (const row of enriched) {
    counts.byStatus[row.status] = (counts.byStatus[row.status] || 0) + 1;
    counts.byCenter[row.centerId] = (counts.byCenter[row.centerId] || 0) + 1;
    counts.byService[row.serviceId] = (counts.byService[row.serviceId] || 0) + 1;
    for (const warning of row.importWarnings.split(";").filter(Boolean)) {
      counts.warnings[warning] = (counts.warnings[warning] || 0) + 1;
    }
  }

  fs.writeFileSync(path.join(outDir, "reservations-import.summary.json"), JSON.stringify(counts, null, 2), "utf8");

  const report = [
    "# Reservations - preparation import CRM",
    "",
    `- Total traite: ${counts.total}`,
    `- Fichier CRM pret a importer: db-audit/out/reservation-import/reservations-import.crm-ready.csv`,
    `- Fichier CRM complet audit: db-audit/out/reservation-import/reservations-import.crm-all.csv`,
    `- Fichier complet de revue: db-audit/out/reservation-import/reservations-import.review.csv`,
    `- Lignes bloquees a revoir: db-audit/out/reservation-import/reservations-import.needs-review.csv`,
    `- Toutes alertes non bloquantes incluses: db-audit/out/reservation-import/reservations-import.warnings.csv`,
    "",
    "## Regles appliquees",
    "- Tri chronologique par date, centre, puis ID legacy.",
    "- ID CRM stable: legacy-reservation-{node_id}.",
    "- Client CRM stable: legacy-client-{user_id}.",
    "- Statut CRM: cancelled si annule ou rembourse, sinon booked.",
    "- Service CRM derive: Wonder -> srv-3, AQ8 -> srv-1, combine -> srv-4.",
    "- Centre CRM infere depuis le site client legacy en priorite, puis depuis le titre legacy en secours.",
    "- Conservation des IDs et libelles legacy dans le fichier de revue.",
    "",
    "## Points de controle",
    `- Pret a importer: ${counts.readyForImport}`,
    `- Bloque pour revue: ${counts.blockedForReview}`,
    `- Avec alertes de revue: ${counts.withWarnings}`,
    `- Centres: ${JSON.stringify(counts.byCenter)}`,
    `- Services CRM: ${JSON.stringify(counts.byService)}`,
    `- Statuts: ${JSON.stringify(counts.byStatus)}`,
    `- Alertes: ${JSON.stringify(counts.warnings)}`,
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "reservations-import.report.md"), `${report}\n`, "utf8");
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
