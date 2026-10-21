import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildClientBalances, filterClientBalances, netReceipts, packageStatusLabel } from '../src/lib/paymentBalances';
import { ClientBalancesPanel } from '../src/components/manager/ClientBalancesPanel';
import type { Client, ClientPackage, Payment } from '../src/types';
import { validatePaymentReversal } from '../src/lib/financialLedgerRules';

const now = new Date('2026-10-21T00:00:00Z');
const client = (id: string, extra = {}) => ({ id, firstName: id, lastName: 'Test', centerId: 'center-1', phone: '0550 12 34 56', status: 'active', ...extra }) as Client;
const pkg = (id: string, clientId: string, extra = {}) => ({ id, clientId, centerId: 'center-1', packageId: 'custom', totalSessions: 4, sessionsRemaining: 3, status: 'active', purchaseDate: '2026-10-19', ...extra }) as ClientPackage;
const pay = (id: string, amount: number, extra = {}) => ({ id, clientId: 'a', centerId: 'center-1', amount, date: '2026-10-20', ...extra }) as Payment;
const input = { centerId: 'center-1', now, clients: [client('a', { firstName: 'Amélie' }), client('b'), client('none'), client('cancelled'), client('suspended', { status: 'suspended' }), client('foreign', { centerId: 'center-2' })],
  clientPackages: [pkg('a1', 'a'), pkg('a2', 'a', { totalSessions: 12, sessionsRemaining: 8 }), pkg('b1', 'b', { purchaseDate: '2026-08-01', sessionsRemaining: 5 }), pkg('c1', 'cancelled', { status: 'cancelled', sessionsRemaining: 10 }), pkg('s1', 'suspended')],
  payments: [pay('paid', 100), pay('original', 200, { status: 'reversed' }), pay('counter', -200, { kind: 'reversal' }), pay('legacy-payment-1', 900000), pay('foreign-payment', 10000, { centerId: 'center-2' })],
  appointments: [],
};
const snapshot = JSON.stringify(input);
const rows = buildClientBalances(input);
const a = rows.find(r => r.client.id === 'a')!;
assert.equal(a.totalRemaining, 11, 'Sum all usable packages');
assert.equal(a.activePkgs.length, 2);
assert.equal(a.totalAcquired, 16, 'Use purchased package snapshot, not catalog quantity');
assert.equal(a.totalSpent, 100, 'Include the original reversed entry AND its negative counterpart');
assert.equal(rows.find(r => r.client.id === 'b')!.statusCategory, 'expired');
assert.equal(rows.find(r => r.client.id === 'b')!.nonUsableRemaining, 5);
assert.equal(rows.find(r => r.client.id === 'b')!.totalRemaining, 0);
assert.equal(rows.find(r => r.client.id === 'none')!.statusCategory, 'none', 'No package is not an exhausted package');
assert.equal(rows.find(r => r.client.id === 'none')!.hasPayments, false, 'No current payment is not a lifetime spend of zero');
assert.equal(rows.find(r => r.client.id === 'cancelled')!.statusCategory, 'closed');
assert.equal(rows.find(r => r.client.id === 'cancelled')!.totalAcquired, 0);
assert.equal(rows.find(r => r.client.id === 'suspended')!.statusCategory, 'suspended');
assert.equal(rows.find(r => r.client.id === 'suspended')!.totalRemaining, 0);
assert.equal(rows.some(r => r.client.id === 'foreign'), false);
assert.equal(filterClientBalances(rows, 'closed', '', 'alpha_asc').some(r => r.client.id === 'none'), false);
assert.equal(filterClientBalances(rows, 'all', 'amelie 0550123456', 'alpha_asc').length, 1);
assert.equal(filterClientBalances(rows, 'with_package', '', 'balance_desc').length, 4);
assert.equal(packageStatusLabel(pkg('boundary', 'a', { purchaseDate: '2026-09-06' }), now), 'En cours');
assert.equal(packageStatusLabel(pkg('expired', 'a', { purchaseDate: '2026-09-05' }), now), 'Expiré');
assert.equal(netReceipts([pay('original', 200, { status: 'reversed' }), pay('reversal', -200, { kind: 'reversal' })]), 0);
const demo = pay('demo', 107000, { reportingExcluded: true });
assert.equal(netReceipts([pay('real', 12000), pay('counter', -2000), demo]), 10000);
assert.equal(netReceipts([demo]), 0);
assert.equal(validatePaymentReversal({ payment: demo, clientPackage: undefined, centerId: 'center-1' }).valid, false, 'Excluded demonstration must never generate a financial counter-entry');
assert.equal(JSON.stringify(input), snapshot, 'Display changes never modify source data');
const markup = renderToStaticMarkup(<ClientBalancesPanel rows={rows} packages={[]} onOpen={() => {}} />);
assert.match(markup, /Sans forfait CRM \(1\)/);
assert.match(markup, /Expirés \(1\)/);
assert.match(markup, /Sur 2 forfaits/);
assert.ok(!markup.includes('none Test'), 'Default list hides clients without a current CRM package');
assert.ok(!markup.includes('Total Investi'));
const many = Array.from({ length: 25 }, (_, i) => client(`Patient${String(i).padStart(2, '0')}`));
const paged = buildClientBalances({ centerId: 'center-1', now, clients: many, clientPackages: many.map(c => pkg(`p-${c.id}`, c.id)), payments: [], appointments: [] });
const page = renderToStaticMarkup(<ClientBalancesPanel rows={paged} packages={[]} onOpen={() => {}} />);
assert.equal((page.match(/<tr /g) || []).length, 20);
assert.match(page, /Page 1 \/ 2/);
assert.ok(!page.includes('Patient24 Test'));
console.log('Payment balances: missing vs exhausted, expiry, multiple packages, purchased quantities, net reversals, isolation, search and pagination passed.');
