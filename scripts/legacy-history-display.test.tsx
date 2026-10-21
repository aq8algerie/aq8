import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LegacyHistoryTable } from '../src/components/manager/LegacyHistoryTable';
import type { LegacyHistoryRecord } from '../src/lib/legacyHistory';
import fs from 'node:fs';
import path from 'node:path';

const base: LegacyHistoryRecord = {
  id: 'history-1', centerId: 'center-1', clientId: 'legacy-client-1', clientName: 'Client test', clientExists: false,
  date: '2024-02-06T18:00:00Z', end: '2024-02-06T19:00:00Z', type: 'Paiement', amount: -7000,
  comment: '<script>alert("unsafe")</script>', source: { file: 'historique.pdf', sha256: 'abc', page: 8, technicalPage: 100, legacyId: '8512' },
};
const finance = renderToStaticMarkup(<LegacyHistoryTable rows={[base, { ...base, id: 'history-2', amount: 14000, originalCenterMissing: true }]} finance />);
assert.match(finance, /06\/02\/2024 18:00/);
assert.match(finance.replace(/[\u00a0\u202f]/g, ''), /-7000 DA/);
assert.match(finance.replace(/[\u00a0\u202f]/g, ''), /\+14000 DA/);
assert.match(finance, /Client non repris/);
assert.match(finance, /Centre d’origine non renseigné/);
assert.match(finance, /historique.pdf/); assert.match(finance, /page 8/);
assert.ok(!finance.includes('<script>'));
const reservation = renderToStaticMarkup(<LegacyHistoryTable rows={[{ ...base, type: 'Annulée', refunded: true, service: 'Wonder Face', resource: 'Coach-BK', eventId: '123', relatedReservationIds: ['8512', '8513'], planningState: 'Booked' }]} finance={false} />);
assert.match(reservation, /Annulée/); assert.match(reservation, /Remboursée/);
assert.match(reservation, /Wonder Face/); assert.match(reservation, /Coach-BK/);
assert.match(reservation, /8512, 8513/); assert.ok(!reservation.includes('DA</div>'));
console.log('Historical display: source hours, signs, cancellations, refunds, related references and escaped comments passed.');
if (process.argv.includes('--preview')) {
  const css = fs.readdirSync('.next/static/css').filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join('.next/static/css', f), 'utf8')).join('\n');
  const output = 'db-audit/out/legacy-reconciliation';
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'display-preview.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body class="bg-slate-50 p-4 sm:p-8"><main class="mx-auto max-w-6xl space-y-6"><h1 class="text-2xl font-bold">Historique ancienne base — aperçu de contrôle</h1><section class="rounded-2xl border bg-white p-5"><h2 class="mb-4 text-lg font-bold">Journal financier historique</h2><p class="mb-4 rounded-xl bg-amber-50 p-3 text-sm">Montants signés d’origine, hors chiffre d’affaires validé. Données fictives de contrôle visuel.</p>${finance}</section><section class="rounded-2xl border bg-white p-5"><h2 class="mb-4 text-lg font-bold">Réservations historiques</h2>${reservation}</section></main></body></html>`);
}
