import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildClientStatement } from '../src/lib/clientStatement';
import { ClientStatementDocument } from '../src/components/manager/ClientStatement';
import type { Client, ClientPackage, Payment, Appointment } from '../src/types';
import type { LegacyHistoryRecord } from '../src/lib/legacyHistory';

const own = { clientId: 'member', centerId: 'center-1' };
const client = { id: 'member', centerId: 'center-1', firstName: '<script>unsafe</script>', lastName: 'Test', status: 'active', pin: 'PRIVATE_PIN', medicalConditions: 'PRIVATE_HEALTH' } as Client;
const input = { client, centerId: 'center-1', financialVisible: true, now: new Date('2026-10-21T10:00:00Z'),
  packages: [{ ...own, id: 'usable', purchaseDate: '2026-10-20', totalSessions: 4, sessionsRemaining: 3, status: 'active' },
    { ...own, id: 'expired', purchaseDate: '2024-01-01', totalSessions: 8, sessionsRemaining: 5, status: 'active' }] as ClientPackage[],
  payments: [{ ...own, id: 'paid', date: '2026-10-21', amount: 12000 }, { ...own, id: 'counter', date: '2026-10-21', amount: -2000, kind: 'reversal' },
    { ...own, id: 'demo', date: '2026-10-21', amount: 107000, reportingExcluded: true }, { ...own, id: 'legacy-payment-old', date: '2024-01-01', amount: 900000 },
    { ...own, id: 'foreign', centerId: 'center-2', date: '2026-10-21', amount: 999999 }] as Payment[],
  appointments: Array.from({ length: 37 }, (_, i) => ({ ...own, id: `appointment-${i}`, dateTime: '2026-10-20T10:00', status: 'completed' })) as Appointment[],
  finance: [{ ...own, id: 'historic', date: '2024-01-01', type: 'Paiement', amount: 900000, source: { legacyId: '1', file: 'old.pdf', page: 2, sha256: 'evidence' } }] as LegacyHistoryRecord[], reservations: [],
};
const before = JSON.stringify(input);
const data = buildClientStatement(input, { name: 'Centre test' });
assert.equal(data.summary.availableCredits, 3);
assert.equal(data.summary.nonUsableCredits, 5);
assert.equal(data.summary.netReceipts, 10000);
assert.equal(data.summary.completedSessions, 37);
assert.ok(!JSON.stringify(data).includes('PRIVATE_PIN'));
assert.ok(!JSON.stringify(data).includes('PRIVATE_HEALTH'));
const html = renderToStaticMarkup(<ClientStatementDocument data={data} />);
assert.match(html, /appointment-36/);
assert.match(html, /old.pdf/);
assert.match(html, /evidence/);
assert.match(html, /solde financier historique/);
assert.ok(!html.includes('<script>'));
const staff = buildClientStatement({ ...input, financialVisible: false }, { name: 'Centre test' });
assert.ok(!('netReceipts' in staff.summary));
assert.ok(staff.events.every(e => !('amount' in e) && e.kind !== 'payment'));
assert.ok(!renderToStaticMarkup(<ClientStatementDocument data={staff} />).includes('Encaissements nets'));
assert.equal(buildClientStatement({ ...input, payments: [] }, {}).summary.netReceipts, null, 'Missing records must not become a lifetime spend of zero');
assert.equal(buildClientStatement({ ...input, client: { ...client, status: 'suspended' } }, {}).summary.availableCredits, 0);
assert.equal(buildClientStatement({ ...input, client: { ...client, status: 'archived' } }, {}).summary.availableCredits, 0);
assert.throws(() => buildClientStatement({ ...input, centerId: 'center-2' }, {}));
assert.equal(JSON.stringify(input), before);
console.log('Client statement: complete history beyond one page, usable credits, signed receipts, demo exclusion, unknown totals, privacy, escaped output and immutable data passed.');
