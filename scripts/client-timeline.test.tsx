import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildClientTimeline, filterClientTimeline } from '../src/lib/clientTimeline';
import { ClientTimelineEntries } from '../src/components/manager/ClientTimeline';
import type { Client, Appointment, ClientPackage, Payment } from '../src/types';
import type { LegacyHistoryRecord } from '../src/lib/legacyHistory';

const owner = { clientId: 'member', centerId: 'center-1' };
const source = { file: 'archive.pdf', page: 3, technicalPage: 4, sha256: 'proof', legacyId: '17' };
const client = { id: 'member', centerId: 'center-1', legacyMemberships: { old: { ...owner, id: 'old', validFrom: '2024-01-01', validTo: '2024-12-31', source } } } as unknown as Client;
const input = { client, centerId: 'center-1', financialVisible: true, now: new Date('2026-10-21'),
  appointments: [{ ...owner, id: 'appointment', dateTime: '2026-10-21T10:00', status: 'completed', completedWithClientPackageId: 'package', deductedCredits: 1 },
    { ...owner, id: 'legacy-reservation-17', historicalOnly: true, dateTime: '2024-02-01', status: 'booked' },
    { ...owner, id: 'foreign', centerId: 'center-2', dateTime: '2026-10-22' }] as Appointment[],
  packages: [{ ...owner, id: 'package', purchaseDate: '2026-10-20', status: 'active', sessionsRemaining: 3, totalSessions: 4, sourcePaymentId: 'paid' }] as ClientPackage[],
  payments: [{ ...owner, id: 'paid', amount: 12000, date: '2026-10-20', status: 'reversed', reversedByPaymentId: 'counter' },
    { ...owner, id: 'counter', amount: -12000, date: '2026-10-21', kind: 'reversal', reversalOfPaymentId: 'paid' },
    { ...owner, id: 'legacy-payment-17', amount: 800, date: '2024-02-01' }] as Payment[],
  finance: [{ ...owner, id: 'history-paid', date: '2024-02-01', type: 'Remboursement', amount: -800, comment: '<script>secret</script>', source }] as LegacyHistoryRecord[],
  reservations: [{ ...owner, id: 'history-booking', date: '2024-02-01', type: 'Réservation', cancelled: true, source, comment: 'FINANCIAL_SECRET' }] as LegacyHistoryRecord[],
};
const before = JSON.stringify(input);
const events = buildClientTimeline(input);
assert.equal(events.length, 7, 'Do not duplicate legacy operational imports alongside their source archives');
assert.equal(events.some(e => e.reference === 'foreign'), false);
assert.equal(events.find(e => e.reference === 'counter')?.amount, -12000);
assert.equal(events.find(e => e.reference === 'old')?.status, 'Inactive · échue');
assert.equal(filterClientTimeline(events, { origin: 'legacy', kind: 'reservation', search: 'reservation', from: '2024-02-01', to: '2024-02-01' }).length, 1);
assert.equal(filterClientTimeline(events, { search: 'aucun-resultat' }).length, 0);
const staff = buildClientTimeline({ ...input, financialVisible: false });
assert.ok(staff.every(e => e.kind !== 'payment' && !('amount' in e)));
assert.ok(!JSON.stringify(staff).includes('FINANCIAL_SECRET'));
assert.ok(!JSON.stringify(staff).includes('Paiement associé'));
assert.deepEqual(buildClientTimeline({ ...input, centerId: 'center-2' }), []);
const markup = renderToStaticMarkup(<ClientTimelineEntries result={{ ok: true, rows: events, total: events.length, page: 1, pageSize: 30, financialVisible: true }} />);
assert.match(markup, /Ancienne base/);
assert.match(markup, /CRM actuel/);
assert.match(markup, /Détail et justificatifs/);
assert.match(markup, /archive.pdf/);
assert.ok(!markup.includes('<script>'));
assert.equal(JSON.stringify(input), before);
console.log('Client timeline: merged archives without duplicates, signed reversals, ownership, permission redaction, source evidence, search, dates and immutable data passed.');
