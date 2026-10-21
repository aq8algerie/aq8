import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { matchesCrmSearch, phoneSearchVariants } from '../src/lib/crmSearch';
import { matchesPaymentState, paymentEntryState } from '../src/lib/paymentRegister';
import { PaymentRegisterTable } from '../src/components/manager/PaymentRegisterTable';
import type { Client, Payment } from '../src/types';

const client = { id: 'client-a', firstName: 'Amélie', lastName: 'Test', phone: '+213 550 12 34 56' } as Client;
for (const query of ['0550123456', '0550', '+213550123456', '00213 550 12 34 56', '0550 12-34-56', 'Test amelie', 'amelie 0550']) {
  assert.equal(matchesCrmSearch(query, [client.firstName, client.lastName], client.phone), true, query);
}
assert.equal(matchesCrmSearch('+213550123456', [], '0550 12 34 56'), true);
assert.equal(matchesCrmSearch('0560123456', [], client.phone), false);
assert.deepEqual(phoneSearchVariants('+33123456789'), ['33123456789'], 'Do not invent an Algerian prefix for a foreign phone');
assert.equal(matchesCrmSearch('REC-2026-001', ['REC-2026-001'], ''), true);
assert.equal(matchesCrmSearch('2026-001', ['REC-2026-001'], ''), true);
const base = { clientId: client.id, packageId: 'p', centerId: 'center-1', amount: 12000, date: '2026-10-21', method: 'cash' } as Payment;
const rows: Payment[] = [
  { ...base, id: 'posted', receiptNumber: 'REC-001' },
  { ...base, id: 'original', status: 'reversed', reversedByPaymentId: 'counter' },
  { ...base, id: 'counter', amount: -12000, kind: 'reversal', reversalOfPaymentId: 'original' },
  { ...base, id: 'unknown', clientId: 'archived-or-unresolved' },
  { ...base, id: 'adjustment', amount: -100, reason: '<script>unsafe</script>' },
];
assert.deepEqual(rows.map(paymentEntryState), ['posted', 'reversed', 'reversal', 'posted', 'adjustment']);
assert.equal(matchesPaymentState(rows[1], client, 'reversed'), true);
assert.equal(matchesPaymentState(rows[2], client, 'posted'), false);
assert.equal(matchesPaymentState(rows[3], undefined, 'unresolved'), true);
assert.equal(matchesPaymentState(rows[0], client, 'unresolved'), false);
const before = JSON.stringify(rows);
const markup = renderToStaticMarkup(<PaymentRegisterTable payments={rows} clients={[client]} packages={[]} onReceipt={() => {}} onReverse={() => {}} onRelated={() => {}} />);
assert.match(markup, /Règlement annulé/);
assert.match(markup, /Contre-écriture d’annulation/);
assert.match(markup, /Voir le règlement d’origine/);
assert.match(markup, /Voir l’annulation/);
assert.match(markup, /Dossier client à retrouver/);
assert.match(markup, /archived-or-unresolved/);
assert.match(markup, /REC-001/);
assert.match(markup, /Espèces/);
assert.match(markup, /Régularisation/);
assert.equal((markup.match(/Annuler l’encaissement/g) || []).length, 2, 'Only posted positive entries expose the reversal action');
assert.ok(!markup.includes('hidden sm:block'), 'Payments remain visible on small screens');
assert.ok(!markup.includes('<script>'));
assert.equal(JSON.stringify(rows), before);
console.log('Payment register: states, linked reversals, unresolved references, signed amounts, mobile visibility, phone formats and immutable data passed.');
