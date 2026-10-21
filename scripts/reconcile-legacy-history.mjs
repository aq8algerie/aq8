/** Safe, resumable, create-only archives + additive metadata on previous imports.
 * Never changes amounts, appointment statuses or client credits. Source centers
 * are restored only on legacy imports, retaining their previous center in provenance.
 * Every update uses an updateTime precondition and has a durable pre-write backup.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const project = 'aq8algerie-4f675';
const dir = path.resolve('db-audit/out/legacy-reconciliation');
const execute = process.argv.includes('--execute');
const require = createRequire(import.meta.url);
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const owner = auth.getAllAccounts().find(a => a.user.email === 'aq8algerie@gmail.com');
if (!owner) throw new Error('Firebase owner account is not connected.');
const token = await auth.getAccessToken(owner.tokens.refresh_token, []);
const root = `projects/${project}/databases/(default)/documents`;
const request = async (url, body) => {
  const response = await fetch(`https://firestore.googleapis.com/v1/${url}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120000),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(`Firestore ${response.status}: ${JSON.stringify(data.error || data).slice(0, 500)}`);
  return data;
};
const decode = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? v.timestampValue : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])) : 'arrayValue' in v ? (v.arrayValue.values || []).map(decode) : null;
const encode = v => v === null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(encode) } } : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, v]) => [k, encode(v)])) } } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : { stringValue: String(v) };
const fields = data => encode(data).mapValue.fields;
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const sha = data => createHash('sha256').update(data).digest('hex');
const planBytes = await fs.readFile(path.join(dir, 'plan.json'));
const plan = JSON.parse(planBytes);
if (plan.version !== 'pdf-history-v1') throw new Error('Unexpected plan.');
for (const source of plan.sources) if (sha(await fs.readFile(source.path)) !== source.sha256) throw new Error('Source PDF changed.');
const read = async collection => {
  const rows = await request(`${root}:runQuery`, { structuredQuery: { from: [{ collectionId: collection }] } });
  if (rows.some(r => r.error)) throw new Error('Query failed.');
  const docs = rows.filter(r => r.document).map(r => r.document);
  console.log(JSON.stringify({ read: collection, count: docs.length }));
  return new Map(docs.map(d => [d.name.split('/').at(-1), { raw: d, data: Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)])) }]));
};
const db = {};
for (const name of ['centers', 'clients', 'payments', 'appointments', 'legacy_financial_operations', 'legacy_reservations']) db[name] = await read(name);
const writes = [];
const stats = { mode: execute ? 'execute' : 'dry-run', project, planSha256: sha(planBytes), creates: {}, updates: {}, identical: {}, noCenterExcluded: plan.unassignedFinance.length };
function add(collection, id, data, patch = false) {
  const existing = db[collection].get(id);
  const name = `${root}/${collection}/${id}`;
  if (existing && !patch) {
    if (!same(existing.data, data)) throw new Error(`Archive collision: ${collection}/${id}`);
    stats.identical[collection] = (stats.identical[collection] || 0) + 1; return;
  }
  if (patch && (!existing || Object.entries(data).every(([k, v]) => same(existing.data[k], v)))) {
    if (existing) stats.identical[collection] = (stats.identical[collection] || 0) + 1;
    return;
  }
  const write = { update: { name, fields: fields(data) }, currentDocument: existing ? { updateTime: existing.raw.updateTime } : { exists: false },
    ...(patch ? { updateMask: { fieldPaths: Object.keys(data) } } : {}) };
  writes.push({ collection, id, before: existing?.raw || null, write });
  const counter = existing ? stats.updates : stats.creates;
  counter[collection] = (counter[collection] || 0) + 1;
}
const financeById = new Map([...plan.finance, ...plan.unassignedFinance].map(r => [r.source.legacyId, r]));
const reservationsById = new Map(plan.reservations.map(r => [r.source.legacyId, r]));
for (const [collection, records] of [['legacy_financial_operations', plan.finance], ['legacy_reservations', plan.reservations]]) {
  for (const record of records) {
    if (!record.centerId || !db.centers.has(record.centerId)) throw new Error('Unknown or missing source center.');
    const previous = db[collection === 'legacy_reservations' ? 'appointments' : 'payments'].get(
      `${collection === 'legacy_reservations' ? 'legacy-reservation-' : 'legacy-payment-'}${record.source.legacyId}`);
    // Do not embed transient import metadata: the archive must remain identical on rerun.
    const enriched = { ...record, clientExists: db.clients.has(record.clientId) };
    const previousCenter = previous?.data.legacyReconciliation?.previousCenterId || previous?.data.centerId;
    if (previousCenter && previousCenter !== record.centerId) enriched.previousImportedCenterId = previousCenter;
    add(collection, record.id, enriched);
  }
}
for (const [id, existing] of db.payments) {
  if (!id.startsWith('legacy-payment-')) continue;
  const record = financeById.get(id.slice('legacy-payment-'.length));
  if (!record) throw new Error(`Payment has no PDF source: ${id}`);
  if (Number(existing.data.amount) !== record.amount || existing.data.clientId !== record.clientId) throw new Error(`Payment diverged: ${id}`);
  const reconciliation = { version: plan.version, archiveId: record.centerId ? record.id : null,
    source: record.source, sourceType: record.type, sourceCenterId: record.centerId,
    previousCenterId: existing.data.legacyReconciliation?.previousCenterId || existing.data.centerId, revenueTreatment: 'excluded_pending_historical_qualification',
    ...(record.centerId ? {} : { unassignedSourceRecord: { ...record, clientExists: db.clients.has(record.clientId) } }) };
  add('payments', id, { historicalOnly: true, ...(record.centerId ? { centerId: record.centerId } : {}), legacyReconciliation: reconciliation }, true);
}
for (const [id, existing] of db.appointments) {
  if (id.startsWith('legacy-event-')) {
    const event = plan.events[id.slice('legacy-event-'.length)];
    if (!event) throw new Error(`Event missing source: ${id}`);
    add('appointments', id, { historicalOnly: true, legacyReconciliation: { version: plan.version, ...event,
      reason: event.sourceState === 'Available' ? 'availability_not_client_booking' : 'planning_event_not_canonical_reservation' } }, true);
  } else if (id.startsWith('legacy-reservation-')) {
    const record = reservationsById.get(id.slice('legacy-reservation-'.length));
    if (!record) throw new Error(`Reservation missing source: ${id}`);
    const sourceDate = record.date.slice(0, 16);
    const existingDate = String(existing.data.dateTime || '').replace(' ', 'T');
    const dateCorrection = existingDate === sourceDate.slice(0, 13) ? { dateTime: sourceDate } : {};
    add('appointments', id, { historicalOnly: true, centerId: record.centerId, ...dateCorrection, legacyReconciliation: { version: plan.version,
      archiveId: record.id, source: record.source, sourceCenterId: record.centerId,
      sourceDateTime: record.date, sourceClientId: record.clientId,
      previousDateTime: existing.data.legacyReconciliation?.previousDateTime || existing.data.dateTime,
      previousCenterId: existing.data.legacyReconciliation?.previousCenterId || existing.data.centerId } }, true);
  }
}
stats.writes = writes.length;
stats.centerCorrections = writes.filter(r => r.before && r.write.update.fields.centerId && r.before.fields.centerId?.stringValue !== r.write.update.fields.centerId.stringValue).length;
stats.dateCorrections = writes.filter(r => r.write.update.fields.dateTime).length;
await fs.writeFile(path.join(dir, execute ? 'execution-plan-summary.json' : 'dry-run-summary.json'), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats));
if (!execute) process.exit(0);
const run = path.join(dir, `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(run, { recursive: true });
await fs.writeFile(path.join(run, 'manifest.json'), JSON.stringify(stats, null, 2));
let committed = 0;
for (let i = 0; i < writes.length; i += 200) {
  const batch = writes.slice(i, i + 200);
  const batchFile = path.join(run, `batch-${String(i / 200).padStart(4, '0')}.json`);
  // Backup BEFORE writing; preconditions make intervening changes abort the batch.
  await fs.writeFile(batchFile, JSON.stringify(batch));
  const response = await request(`${root}:commit`, { writes: batch.map(r => r.write) });
  if (response.writeResults?.length !== batch.length) throw new Error('Incomplete commit response.');
  await fs.appendFile(path.join(run, 'committed.jsonl'), JSON.stringify({ batchFile: path.basename(batchFile), commitTime: response.commitTime, results: response.writeResults }) + '\n');
  committed += batch.length;
  if (i % 2000 === 0 || committed === writes.length) console.log(JSON.stringify({ committed, total: writes.length }));
}
await fs.writeFile(path.join(run, 'completed.json'), JSON.stringify({ ...stats, committed, completedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ completed: true, committed, backup: run }));
