import assert from 'node:assert/strict';
import { filterLegacyHistory, isHistoricalRecord, summarizeLegacyHistory, type LegacyHistoryRecord } from './legacyHistory';
import { validatePaymentReversal } from './financialLedgerRules';

const source = { file: 'source.pdf', sha256: 'abc', page: 3, technicalPage: 20, legacyId: '1' };
const rows: LegacyHistoryRecord[] = [
  { id: 'op-1', centerId: 'center-1', clientId: 'a', clientName: 'Amélie', clientExists: true, date: '2026-01-31T23:50:00Z', type: 'Paiement', amount: -7000, comment: 'Séance débitée', source },
  { id: 'op-2', centerId: 'center-1', clientId: 'a', clientName: 'Amélie', clientExists: true, date: '2026-01-31T10:00:00Z', type: 'Paiement', amount: 14000, comment: '', source: { ...source, legacyId: '2' } },
  { id: 'op-3', centerId: 'center-1', clientId: 'b', clientName: 'B', clientExists: false, date: '2026-02-01', type: 'Bonus', amount: 3000, comment: '', originalCenterMissing: true, source: { ...source, legacyId: '3' } },
];
assert.equal(isHistoricalRecord({ id: 'legacy-payment-12' }), true);
assert.equal(isHistoricalRecord({ id: 'legacy-event-12' }), true);
assert.equal(isHistoricalRecord({ id: 'manual-payment-12' }), false);
assert.equal(isHistoricalRecord({ id: 'manual', historicalOnly: true }), true);
const january = filterLegacyHistory(rows, { clientId: 'a', from: '2026-01-31', to: '2026-01-31', search: 'amelie' });
assert.deepEqual(january.map(r => r.amount), [-7000, 14000], 'Preserve source signs and source calendar date');
assert.deepEqual(summarizeLegacyHistory(january).types.Paiement, { count: 2, positive: 14000, negative: -7000 });
assert.equal(summarizeLegacyHistory(rows).originalCenterMissing, 1);
assert.equal(filterLegacyHistory(rows, { search: 'seance debitee' }).length, 1);
assert.equal(filterLegacyHistory(rows, { type: 'Bonus', clientId: 'a' }).length, 0);
assert.equal(validatePaymentReversal({ payment: { id: 'legacy-payment-12', amount: 100, centerId: 'center-1' } as any, centerId: 'center-1', clientPackage: undefined }).valid, false, 'A historical entry must never create a new reversal');
assert.equal(rows[0].amount, -7000, 'Filtering never rewrites the source');
console.log('Historical ledger: signed amounts, boundaries, search, provenance and reversal protection passed.');
