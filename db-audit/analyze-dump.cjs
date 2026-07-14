const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const outDir = process.argv[3] || path.join(process.cwd(), "db-audit", "out");

if (!dumpPath) {
  console.error("Usage: node analyze-dump.js <dump-path> [out-dir]");
  process.exit(1);
}

const targetTables = new Set([
  "booking",
  "bat_booking__booking_start_date",
  "bat_booking__booking_end_date",
  "bat_booking__booking_event_reference",
  "event",
  "event_series",
  "bat_event__event_dates",
  "bat_event__event_bat_unit_reference",
  "bat_event__event_state_reference",
  "bat_event__field_event_webform_submission",
  "unit",
  "unit_type",
  "node",
  "node_field_data",
  "node__field_user",
  "node__field_service",
  "node__field_reservation_date",
  "node__field_date",
  "node__field_amount",
  "node__field_membership_status",
  "node__field_validity",
  "node__field_refunded",
  "node__field_cancelled",
  "node__field_coach",
  "node__field_comment",
  "node__field_reser",
  "users",
  "users_field_data",
  "user__field_nom_et_prenom",
  "user__field_phone",
  "user__field_sexe",
  "user__field_age",
  "user__field_diseases",
  "user__field_user_site",
  "webform_submission",
  "webform_submission_data",
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function countInsertRows(line) {
  const valuesAt = line.indexOf(" VALUES ");
  if (valuesAt === -1) return 0;

  let rows = 0;
  let depth = 0;
  let quote = null;
  let escaped = false;
  const sql = line.slice(valuesAt + 8);

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "(") {
      if (depth === 0) rows += 1;
      depth += 1;
    } else if (ch === ")" && depth > 0) {
      depth -= 1;
    }
  }

  return rows;
}

function extractColumns(ddl) {
  return ddl
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*`([^`]+)`\s+(.+?)(?:,)?$/))
    .filter(Boolean)
    .map((match) => ({
      name: match[1],
      type: match[2].replace(/\s+COMMENT\s+'.*$/i, "").trim(),
    }));
}

async function main() {
  ensureDir(outDir);
  const ddlDir = path.join(outDir, "ddl");
  ensureDir(ddlDir);

  const tables = {};
  const relevant = {};
  let currentTable = null;
  let ddlLines = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(dumpPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const createMatch = line.match(/^CREATE TABLE `([^`]+)`/);
    if (createMatch) {
      currentTable = createMatch[1];
      ddlLines = [line];
      tables[currentTable] = tables[currentTable] || { insertStatements: 0, estimatedRows: 0 };
      continue;
    }

    if (currentTable) {
      ddlLines.push(line);
      if (/^\)\s*(ENGINE|;)/.test(line)) {
        const ddl = ddlLines.join("\n");
        tables[currentTable].columns = extractColumns(ddl);
        tables[currentTable].columnCount = tables[currentTable].columns.length;

        if (targetTables.has(currentTable)) {
          fs.writeFileSync(path.join(ddlDir, `${currentTable}.sql`), `${ddl}\n`, "utf8");
          relevant[currentTable] = tables[currentTable];
        }

        currentTable = null;
        ddlLines = [];
      }
      continue;
    }

    const insertMatch = line.match(/^INSERT INTO `([^`]+)`/);
    if (insertMatch) {
      const table = insertMatch[1];
      tables[table] = tables[table] || { insertStatements: 0, estimatedRows: 0 };
      tables[table].insertStatements += 1;
      tables[table].estimatedRows += countInsertRows(line);
      if (targetTables.has(table)) {
        relevant[table] = tables[table];
      }
    }
  }

  const allTables = Object.fromEntries(Object.entries(tables).sort(([a], [b]) => a.localeCompare(b)));
  const relevantTables = Object.fromEntries(Object.entries(relevant).sort(([a], [b]) => a.localeCompare(b)));

  fs.writeFileSync(path.join(outDir, "schema-summary.json"), JSON.stringify(allTables, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "relevant-tables.json"), JSON.stringify(relevantTables, null, 2), "utf8");

  const lines = [
    "# Audit initial de la sauvegarde MySQL",
    "",
    `- Fichier source: ${dumpPath}`,
    `- Tables detectees: ${Object.keys(allTables).length}`,
    `- Tables candidates metier: ${Object.keys(relevantTables).length}`,
    "",
    "| Table | Lignes estimees | Colonnes | Role probable |",
    "| --- | ---: | ---: | --- |",
  ];

  const roleHints = [
    [/^booking$/, "Reservation BAT"],
    [/^bat_booking__/, "Champs de reservation BAT"],
    [/^event$/, "Planning / evenement BAT"],
    [/^event_series$/, "Series de planning BAT"],
    [/^bat_event__/, "Champs de planning BAT"],
    [/^unit/, "Ressource / unite reservable"],
    [/^node(_field_data)?$/, "Contenu Drupal"],
    [/^node__field_/, "Champs metier Drupal"],
    [/^users(_field_data)?$/, "Comptes utilisateurs"],
    [/^user__field_/, "Profil client"],
    [/^webform_/, "Soumissions formulaires"],
  ];

  for (const [table, info] of Object.entries(relevantTables)) {
    const hint = roleHints.find(([pattern]) => pattern.test(table));
    lines.push(`| \`${table}\` | ${info.estimatedRows || 0} | ${info.columnCount || 0} | ${hint ? hint[1] : ""} |`);
  }

  fs.writeFileSync(path.join(outDir, "relevant-tables.md"), `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({
    outDir,
    totalTables: Object.keys(allTables).length,
    relevantTables: Object.keys(relevantTables).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
