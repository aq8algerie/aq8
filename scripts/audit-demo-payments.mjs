/** Compare known sample payments with immutable Git fixtures. Default: read-only.
 * --execute adds provenance + reporting exclusion only after an exact whole-record
 * match and confirmation that its referenced client does not exist.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const project = 'aq8algerie-4f675';
const require = createRequire(import.meta.url);
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const owner = auth.getAllAccounts().find(a => a.user.email === 'aq8algerie@gmail.com');
if (!owner) throw new Error('Owner account unavailable.');
const token = await auth.getAccessToken(owner.tokens.refresh_token, []);
const get = async resource => {
  const response = await fetch('https://firestore.googleapis.com/v1/' + resource, { headers: { Authorization: 'Bearer ' + token.access_token }, signal: AbortSignal.timeout(45000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Firestore read: ' + response.status);
  return response.json();
};
const database = `projects/${project}/databases/(default)`;
const dbInfo = await get(database);
if (!dbInfo) throw new Error('Target database not found');
if (dbInfo?.databaseEdition !== 'STANDARD' && dbInfo?.databaseEdition !== undefined) throw new Error('Unexpected database edition');
const sourceCommit = execFileSync('git', ['rev-parse', '1eb8be1'], { encoding: 'utf8' }).trim();
const sourceText = execFileSync('git', ['show', `${sourceCommit}:src/mockData.ts`], { encoding: 'utf8' });
const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
const source = ts.createSourceFile('mockData.ts', sourceText, ts.ScriptTarget.Latest, true);
function literal(n) {
  if (ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return ts.isStringLiteral(n) ? n.text : Number(n.text);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.map(p => {
    if (!ts.isPropertyAssignment(p)) throw new Error('Only literal fixtures are allowed');
    return [p.name.text, literal(p.initializer)];
  }));
  throw new Error('Non-literal fixture refused');
}
let fixtures;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'INITIAL_PAYMENTS') fixtures = literal(node.initializer);
  ts.forEachChild(node, visit);
}
visit(source);
if (fixtures?.length !== 4) throw new Error('Unexpected fixture count');
const decode = value => 'stringValue' in value ? value.stringValue : 'integerValue' in value ? Number(value.integerValue) : 'doubleValue' in value ? value.doubleValue : 'booleanValue' in value ? value.booleanValue : 'mapValue' in value ? Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])) : null;
const encode = value => typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } } : { stringValue: String(value) };
const canonical = value => value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const evidence = { classification: 'confirmed_demo_fixture', sourceCommit, sourceFile: 'src/mockData.ts', sourceSha256 };
const rows = [];
for (const fixture of fixtures) {
  const current = await get(`${database}/documents/payments/${fixture.id}`);
  const client = await get(`${database}/documents/clients/${fixture.clientId}`);
  const data = current ? Object.fromEntries(Object.entries(current.fields || {}).map(([k, v]) => [k, decode(v)])) : null;
  const comparable = data ? Object.fromEntries(Object.entries(data).filter(([k]) => !['reportingExcluded', 'dataQuality'].includes(k))) : null;
  const eligible = same(comparable, fixture) && !client && (!data?.dataQuality || same(data.dataQuality, evidence));
  rows.push({ id: fixture.id, centerId: fixture.centerId, amount: fixture.amount, receiptNumber: fixture.receiptNumber,
    exactFixtureMatch: same(comparable, fixture), clientExists: !!client, eligible,
    alreadyClassified: data?.reportingExcluded === true && same(data.dataQuality, evidence), before: current });
}
const dir = path.resolve('db-audit/out/demo-payment-audit');
await fs.mkdir(dir, { recursive: true });
const report = { checkedAt: new Date().toISOString(), project, databaseEdition: dbInfo?.databaseEdition || 'STANDARD', evidence,
  rows, total: rows.reduce((s, r) => s + r.amount, 0), writes: 0 };
await fs.writeFile(path.join(dir, 'audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, rows: rows.map(({ before, ...r }) => r) }));
if (!rows.every(r => r.eligible)) throw new Error('A fixture has changed or has a client. No writes allowed.');
if (!process.argv.includes('--execute')) process.exit(0);
const pending = rows.filter(r => !r.alreadyClassified);
if (!pending.length) { console.log('Idempotent: zero writes'); process.exit(0); }
const backup = path.join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
await fs.writeFile(backup, JSON.stringify(report, null, 2));
const response = await fetch(`https://firestore.googleapis.com/v1/${database}/documents:commit`, {
  signal: AbortSignal.timeout(45000),
  method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ writes: pending.map(row => ({ update: { name: row.before.name, fields: { reportingExcluded: encode(true), dataQuality: encode(evidence) } },
    updateMask: { fieldPaths: ['reportingExcluded', 'dataQuality'] }, currentDocument: { updateTime: row.before.updateTime } })) }),
});
if (!response.ok) throw new Error('Atomic classification failed: ' + response.status);
const committed = await response.json();
if (committed.writeResults?.length !== pending.length) throw new Error('Incomplete commit');
for (const row of rows) {
  const current = await get(row.before.name);
  const data = Object.fromEntries(Object.entries(current.fields || {}).map(([k, v]) => [k, decode(v)]));
  const original = Object.fromEntries(Object.entries(row.before.fields).filter(([k]) => !['reportingExcluded', 'dataQuality'].includes(k)).map(([k, v]) => [k, decode(v)]));
  const preserved = Object.fromEntries(Object.entries(data).filter(([k]) => !['reportingExcluded', 'dataQuality'].includes(k)));
  if (!same(original, preserved) || data.reportingExcluded !== true || !same(data.dataQuality, evidence)) throw new Error('Post-write verification failed: ' + row.id);
}
await fs.writeFile(path.join(dir, 'execution.json'), JSON.stringify({ writes: pending.length, verified: true, commitTime: committed.commitTime, backup, evidence }, null, 2));
console.log(JSON.stringify({ writes: pending.length, verified: true, backup }));
