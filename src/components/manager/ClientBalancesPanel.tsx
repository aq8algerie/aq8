import React, { useEffect, useMemo, useState } from 'react';
import type { Client, Package } from '../../types';
import { balanceLabels, filterClientBalances, matchesBalanceFilter, type BalanceFilter, type BalanceSort, type ClientBalanceRow } from '../../lib/paymentBalances';
import { PACKAGE_VALIDITY_DAYS } from '../../lib/packageRules';

export function ClientBalancesPanel({ rows, packages, onOpen }: {
  rows: ClientBalanceRow[]; packages: Package[]; onOpen: (client: Client, history?: boolean) => void;
}) {
  const [filter, setFilter] = useState<BalanceFilter>('with_package');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<BalanceSort>('balance_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filtered = useMemo(() => filterClientBalances(rows, filter, search, sort), [rows, filter, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  useEffect(() => setPage(1), [filter, search, sort, pageSize]);
  const filters: Array<[BalanceFilter, string]> = [
    ['with_package', 'Avec forfait CRM'], ['available', 'Crédits disponibles'], ['low', 'À renouveler · 1–2'],
    ['expired', 'Expirés'], ['closed', 'Terminés / annulés'], ['none', 'Sans forfait CRM'], ['all', 'Tous les adhérents'],
  ];
  if (rows.some(r => r.statusCategory === 'suspended')) filters.splice(4, 0, ['suspended', 'Clients suspendus']);
  return <section className="space-y-4">
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h3 className="text-lg font-bold text-slate-900">Crédits de séances par adhérent</h3>
        <p className="mt-1 text-sm text-slate-600">Cette vue affiche par défaut les clients ayant un forfait CRM. Seuls les crédits de forfaits en cours et non expirés sont utilisables.</p>
        <p className="mt-1 text-xs text-slate-500">Validité : {PACKAGE_VALIDITY_DAYS} jours à compter de l’achat, selon les règles actuelles du CRM.</p>
      </div>
      <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>Sans forfait CRM ne signifie pas « solde épuisé ».</strong> Les anciens achats et abonnements restent consultables dans l’historique de chaque adhérent.
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filtrer les crédits">
        {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${filter === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
          {label} ({rows.filter(r => matchesBalanceFilter(r, value)).length})
        </button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Rechercher un adhérent
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, prénom ou téléphone" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Trier par
          <select value={sort} onChange={e => setSort(e.target.value as BalanceSort)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="balance_desc">Crédits disponibles : décroissant</option><option value="balance_asc">Crédits disponibles : croissant</option>
            <option value="alpha_asc">Nom : A à Z</option><option value="alpha_desc">Nom : Z à A</option><option value="spent_desc">Encaissements nets CRM : décroissant</option>
          </select>
        </label>
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
        <p role="status">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} sur {filtered.length} adhérent(s)</p>
        <label className="text-xs">Par page <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="ml-2 rounded-lg border p-1.5">{[20, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr>
          <th className="p-4">Adhérent</th><th className="p-4">Situation du forfait</th><th className="p-4 text-center">Crédits utilisables</th><th className="p-4 text-right">Encaissements nets CRM</th><th className="p-4">Dossier</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.slice(start, start + pageSize).map(row => {
          const shown = row.activePkgs.length ? row.activePkgs : row.pkgs.slice(0, 1);
          const color = row.totalRemaining > 2 ? 'bg-emerald-50 text-emerald-800' : row.totalRemaining > 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600';
          return <tr key={row.client.id} className="align-top hover:bg-slate-50/70">
            <td className="p-4"><strong className="text-slate-900">{row.client.firstName} {row.client.lastName}</strong><p className="mt-1 text-xs text-slate-500">{row.client.phone || 'Téléphone non renseigné'}</p></td>
            <td className="p-4"><p className="font-medium text-slate-800">{balanceLabels[row.statusCategory]}</p>
              {shown.map(p => <p key={p.id} className="mt-1 text-xs text-slate-500">{packages.find(def => def.id === p.packageId)?.name || 'Forfait enregistré'}</p>)}
              {row.nonUsableRemaining > 0 && <p className="mt-1 text-xs text-amber-700">{row.nonUsableRemaining} crédit(s) sur forfaits non utilisables</p>}
              {row.statusCategory === 'none' && <p className="mt-1 text-xs text-slate-500">Historique ancien à consulter séparément</p>}
            </td>
            <td className="p-4 text-center"><span className={`inline-block rounded-xl px-3 py-2 font-bold ${color}`}>{row.pkgsCount ? row.totalRemaining : '—'}</span>{row.activePkgs.length > 1 && <p className="mt-1 text-xs text-slate-500">Sur {row.activePkgs.length} forfaits</p>}</td>
            <td className="p-4 text-right"><p className="font-semibold text-slate-900">{row.hasPayments ? `${row.totalSpent.toLocaleString('fr-DZ')} DA` : '—'}</p><p className="mt-1 text-xs text-slate-500">{row.lastPaymentDate ? `Dernière écriture : ${row.lastPaymentDate.slice(0, 10).split('-').reverse().join('/')}` : 'Aucune écriture dans le CRM courant'}</p></td>
            <td className="p-4"><button type="button" onClick={() => onOpen(row.client, row.statusCategory === 'none' && !row.hasPayments)} className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">{row.statusCategory === 'none' && !row.hasPayments ? 'Voir l’historique' : 'Voir le dossier'}</button></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!filtered.length && <div className="p-8 text-center"><p className="font-semibold text-slate-700">Aucun adhérent ne correspond à ces critères.</p><button type="button" onClick={() => { setFilter('all'); setSearch(''); }} className="mt-3 text-sm font-semibold text-sky-700 underline">Afficher tous les adhérents</button></div>}
      <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Précédent</button><span>Page {currentPage} / {pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Suivant</button></div>
    </div>
  </section>;
}
