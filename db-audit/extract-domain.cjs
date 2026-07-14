const fs = require("fs");
const path = require("path");
const readline = require("readline");

const dumpPath = process.argv[2];
const summaryPath = process.argv[3] || path.join(process.cwd(), "db-audit", "out", "schema-summary.json");
const outDir = process.argv[4] || path.join(process.cwd(), "db-audit", "out", "extract");

if (!dumpPath) {
  console.error("Usage: node extract-domain.cjs <dump-path> [schema-summary-path] [out-dir]");
  process.exit(1);
}

const tablesToExtract = new Set([
  "node_field_data",
  "node__field_reservation_date",
  "node__field_user",
  "node__field_service",
  "node__field_amount",
  "node__field_cancelled",
  "node__field_refunded",
  "node__field_coach",
  "node__field_comment",
  "node__field_validity",
  "node__field_membership_status",
  "users_field_data",
  "user__field_nom_et_prenom",
  "user__field_phone",
  "user__field_sexe",
  "user__field_age",
  "user__field_diseases",
  "user__field_user_site",
  "event",
  "bat_event__event_dates",
  "bat_event__event_bat_unit_reference",
  "bat_event__event_state_reference",
  "unit",
  "unit_type",
  "webform_submission",
  "webform_submission_data",
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

function oneByEntity(rows, valueColumn) {
  const byId = new Map();
  for (const row of rows) {
    if (row.deleted === 0 && row.delta === 0) byId.set(row.entity_id, row[valueColumn]);
  }
  return byId;
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

function unixDate(seconds) {
  if (!seconds && seconds !== 0) return "";
  return new Date(Number(seconds) * 1000).toISOString();
}

async function main() {
  ensureDir(outDir);
  const schema = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const extracted = Object.fromEntries([...tablesToExtract].map((table) => [table, []]));

  const rl = readline.createInterface({
    input: fs.createReadStream(dumpPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const match = line.match(/^INSERT INTO `([^`]+)`/);
    if (!match) continue;
    const table = match[1];
    if (!tablesToExtract.has(table)) continue;

    const columns = schema[table]?.columns;
    if (!columns) continue;

    for (const tuple of parseInsertTuples(line)) {
      extracted[table].push(makeRecord(columns, tuple));
    }
  }

  const nodes = new Map(extracted.node_field_data.map((row) => [row.nid, row]));
  const users = new Map(extracted.users_field_data.map((row) => [row.uid, row]));
  const nodeTypeCounts = {};
  for (const node of extracted.node_field_data) {
    nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
  }

  const reservationDateByNode = new Map();
  for (const row of extracted.node__field_reservation_date) {
    if (row.deleted === 0 && row.delta === 0) {
      reservationDateByNode.set(row.entity_id, {
        start: row.field_reservation_date_value,
        end: row.field_reservation_date_end_value,
      });
    }
  }

  const userByNode = oneByEntity(extracted.node__field_user, "field_user_target_id");
  const serviceByNode = oneByEntity(extracted.node__field_service, "field_service_target_id");
  const amountByNode = oneByEntity(extracted.node__field_amount, "field_amount_value");
  const cancelledByNode = oneByEntity(extracted.node__field_cancelled, "field_cancelled_value");
  const refundedByNode = oneByEntity(extracted.node__field_refunded, "field_refunded_value");
  const coachByNode = oneByEntity(extracted.node__field_coach, "field_coach_target_id");
  const commentByNode = oneByEntity(extracted.node__field_comment, "field_comment_value");
  const validityByNode = oneByEntity(extracted.node__field_validity, "field_validity_value");
  const membershipStatusByNode = oneByEntity(extracted.node__field_membership_status, "field_membership_status_value");

  const fullNameByUser = oneByEntity(extracted.user__field_nom_et_prenom, "field_nom_et_prenom_value");
  const phoneByUser = oneByEntity(extracted.user__field_phone, "field_phone_value");
  const siteByUser = oneByEntity(extracted.user__field_user_site, "field_user_site_target_id");
  const ageByUser = oneByEntity(extracted.user__field_age, "field_age_value");
  const sexByUser = oneByEntity(extracted.user__field_sexe, "field_sexe_value");
  const diseasesByUser = oneByEntity(extracted.user__field_diseases, "field_diseases_value");

  const clients = [...users.values()].map((user) => ({
    uid: user.uid,
    username: user.name,
    email: user.mail,
    full_name: fullNameByUser.get(user.uid) || "",
    phone: phoneByUser.get(user.uid) || "",
    age: ageByUser.get(user.uid) || "",
    sex: sexByUser.get(user.uid) || "",
    diseases: diseasesByUser.get(user.uid) || "",
    site_id: siteByUser.get(user.uid) || "",
    status: user.status,
    created_at: unixDate(user.created),
    last_access_at: unixDate(user.access),
  }));

  const reservations = [...reservationDateByNode.entries()].map(([nodeId, dates]) => {
    const node = nodes.get(nodeId) || {};
    const uid = userByNode.get(nodeId);
    const user = uid ? users.get(uid) : null;
    return {
      node_id: nodeId,
      type: node.type || "",
      title: node.title || "",
      user_id: uid || "",
      client_name: uid ? fullNameByUser.get(uid) || user?.name || "" : "",
      client_email: user?.mail || "",
      client_phone: uid ? phoneByUser.get(uid) || "" : "",
      reservation_start: dates.start,
      reservation_end: dates.end,
      service_id: serviceByNode.get(nodeId) || "",
      amount: amountByNode.get(nodeId) ?? "",
      coach_id: coachByNode.get(nodeId) || "",
      cancelled: cancelledByNode.get(nodeId) ?? "",
      refunded: refundedByNode.get(nodeId) ?? "",
      comment: commentByNode.get(nodeId) || "",
      created_at: unixDate(node.created),
      changed_at: unixDate(node.changed),
    };
  });

  const subscriptions = [...nodes.values()]
    .filter((node) => membershipStatusByNode.has(node.nid) || validityByNode.has(node.nid))
    .map((node) => {
      const uid = userByNode.get(node.nid);
      const user = uid ? users.get(uid) : null;
      return {
        node_id: node.nid,
        type: node.type,
        title: node.title,
        user_id: uid || "",
        client_name: uid ? fullNameByUser.get(uid) || user?.name || "" : "",
        client_email: user?.mail || "",
        amount: amountByNode.get(node.nid) ?? "",
        membership_status: membershipStatusByNode.get(node.nid) || "",
        validity: validityByNode.get(node.nid) || "",
        created_at: unixDate(node.created),
        changed_at: unixDate(node.changed),
      };
    });

  const eventDates = new Map();
  for (const row of extracted.bat_event__event_dates) {
    if (row.deleted === 0 && row.delta === 0) {
      eventDates.set(row.entity_id, {
        start: row.event_dates_value,
        end: row.event_dates_end_value,
      });
    }
  }
  const eventUnitById = oneByEntity(extracted.bat_event__event_bat_unit_reference, "event_bat_unit_reference_target_id");
  const eventStateById = oneByEntity(extracted.bat_event__event_state_reference, "event_state_reference_target_id");

  const events = extracted.event.map((event) => {
    const dates = eventDates.get(event.id) || {};
    return {
      event_id: event.id,
      type: event.type,
      uid: event.uid,
      label: event.label,
      start: dates.start || "",
      end: dates.end || "",
      unit_id: eventUnitById.get(event.id) || "",
      state_id: eventStateById.get(event.id) || "",
      created_at: unixDate(event.created),
      changed_at: unixDate(event.changed),
    };
  });

  writeCsv(path.join(outDir, "clients.csv"), clients, Object.keys(clients[0] || { uid: "" }));
  writeCsv(path.join(outDir, "reservations.csv"), reservations, Object.keys(reservations[0] || { node_id: "" }));
  writeCsv(path.join(outDir, "subscriptions.csv"), subscriptions, Object.keys(subscriptions[0] || { node_id: "" }));
  writeCsv(path.join(outDir, "events.csv"), events, Object.keys(events[0] || { event_id: "" }));

  fs.writeFileSync(path.join(outDir, "node-type-counts.json"), JSON.stringify(nodeTypeCounts, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "domain-summary.json"), JSON.stringify({
    extractedRows: Object.fromEntries(Object.entries(extracted).map(([table, rows]) => [table, rows.length])),
    outputs: {
      clients: clients.length,
      reservations: reservations.length,
      subscriptions: subscriptions.length,
      events: events.length,
    },
    nodeTypeCounts,
  }, null, 2), "utf8");

  console.log(JSON.stringify({
    outDir,
    clients: clients.length,
    reservations: reservations.length,
    subscriptions: subscriptions.length,
    events: events.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
