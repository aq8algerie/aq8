import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildReconciliation, filterReconciliation } from '../src/lib/reconciliation';
import { ReconciliationRows } from '../src/components/manager/ReconciliationPanel';
import type { Client, Payment, ClientPackage } from '../src/types';
import type { LegacyHistoryRecord } from '../src/lib/legacyHistory';
const own = { centerId: 'center-1', clientId: 'member' };
const input = { centerId: 'center-1', clients: [{ id: 'member', centerId: 'center-1', status: 'archived', firstName: 'Amélie' }, { id: 'foreign', centerId: 'center-2', firstName: 'FOREIGN_PRIVATE' }] as Client[],
  payments: [{ ...own, id: 'original', status: 'reversed', reversedByPaymentId: 'counter', amount: 100 }, { ...own, id: 'counter', kind: 'reversal', reversalOfPaymentId: 'original', amount: -100 },
    { ...own, id: 'demo', clientId: 'missing', reportingExcluded: true, amount: 107000 }, { ...own, id: 'legacy-payment-import', clientId: 'missing', amount: 900 },
    { ...own, id: 'orphan', clientId: 'foreign', amount: 200, receiptNumber: 'REC-ORPHAN' }, { ...own, id: 'broken', kind: 'reversal', reversalOfPaymentId: 'not-found', amount: -50 }] as Payment[],
  packages: [{ ...own, id: 'direct-activation', totalSessions: 4, sessionsRemaining: 3 }, { ...own, id: 'bad-package', totalSessions: 4, sessionsRemaining: 5, sourcePaymentId: 'missing-payment' }] as ClientPackage[],
  finance: [{ ...own, id: 'archive-valid', date: '2024-01-01' }, { ...own, id: 'archive-unknown', clientId: 'missing', clientName: '<script>unsafe</script>', date: '2024-01-01', originalCenterMissing: true,
    source: { legacyId: '123', file: 'archive.pdf', page: 3, sha256: 'proof' } }] as LegacyHistoryRecord[], reservations: [],
};
const before = JSON.stringify(input);
const rows = buildReconciliation(input);
assert.equal(rows.length, 4);
assert.ok(!rows.some(r => ['demo', 'legacy-payment-import', 'direct-activation', 'original', 'counter', 'archive-valid'].includes(r.id)));
assert.deepEqual(rows.find(r => r.id === 'archive-unknown')!.problems, ['client_reference', 'original_center']);
assert.deepEqual(rows.find(r => r.id === 'bad-package')!.problems, ['credits', 'package_payment']);
assert.equal(rows.find(r => r.id === 'orphan')!.clientName, '');
assert.equal(filterReconciliation(rows, { origin: 'legacy', problem: 'client_reference', search: 'archive 123' }).length, 1);
assert.equal(filterReconciliation(rows, { origin: 'current', problem: 'reversal_link' }).length, 1);
const html = renderToStaticMarkup(<ReconciliationRows rows={rows} />);
assert.match(html, /archive.pdf/); assert.match(html, /proof/); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('FOREIGN_PRIVATE'));
assert.equal(JSON.stringify(input), before);
console.log('Reconciliation: archived clients retained, demo and historical imports excluded, reciprocal reversal links, explicit package links, credit bounds, center isolation, grouped issues and immutable sources passed.');
