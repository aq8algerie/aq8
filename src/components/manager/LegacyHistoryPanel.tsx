import React, { useEffect, useState } from 'react';
import { LegacyHistoryTable } from './LegacyHistoryTable';
import { auth } from '../../lib/firebase';
import type { LegacyHistoryKind, LegacyHistoryRecord, summarizeLegacyHistory } from '../../lib/legacyHistory';

type Result = { rows: LegacyHistoryRecord[]; page: number; pageSize: number; total: number; types: string[];
  summary: ReturnType<typeof summarizeLegacyHistory> };
const money = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-DZ')} DA`;

export function LegacyHistoryPanel({ centerId, clientId, kind }: { centerId: string; clientId?: string; kind: LegacyHistoryKind }) {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(1); }, [centerId, clientId, kind, search, from, to, type]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(''); setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Reconnectez-vous pour consulter cet historique.');
        const response = await fetch('/api/crm-legacy-history', { method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ centerId, clientId, kind, search, from, to, type, page }),
        });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || 'Historique indisponible.');
        if (!controller.signal.aborted) setResult(body);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Historique indisponible.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [centerId, clientId, kind, search, from, to, type, page, retry]);
  const finance = kind === 'finance';
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div>
      <h3 className="text-lg font-bold text-slate-900">{finance ? 'Journal financier historique' : 'Réservations historiques'}</h3>
      <p className="mt-1 text-sm text-slate-600">{finance
        ? 'Toutes les écritures de l’ancienne base : paiements, abonnements, bonus et remboursements. Les montants gardent leur signe d’origine. Le mode de paiement n’est pas renseigné dans les PDF.'
        : 'Références de l’ancienne base, avec leurs annulations et remboursements. Une réservation passée ne prouve pas que la séance a été effectuée.'}</p>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{finance
        ? 'Ces archives sont consultables séparément des encaissements du CRM. Les totaux par type décrivent les anciennes écritures ; ils ne constituent ni un chiffre d’affaires validé ni un solde de séances.'
        : 'Ces archives restent en lecture seule. Elles ne bloquent pas le planning actuel et ne recréditent aucun abonnement.'}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">Client, référence ou commentaire
        <input value={search} onChange={e => setSearch(e.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Rechercher dans tout l’historique" /></label>
      <label className="text-xs font-semibold text-slate-600">Du<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Au<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Type<select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"><option value="">Tous les types</option>{(result?.types || (type ? [type] : [])).map(t => <option key={t}>{t}</option>)}</select></label>
    </div>
    {loading && <p role="status" className="text-sm text-slate-500">Chargement de l’historique…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error} <button className="underline" onClick={() => setRetry(r => r + 1)}>Réessayer</button></p>}
    {result && <>
      <p className="text-sm text-slate-700"><strong>{result.total.toLocaleString('fr-FR')}</strong> référence(s) correspondant aux filtres.</p>
      {result.summary.originalCenterMissing > 0 && <p className="text-sm text-amber-800">{result.summary.originalCenterMissing} ancien(s) import(s) n’ont pas de centre dans le PDF : leur rattachement antérieur est conservé et reste à valider.</p>}
      {finance && <div className="flex flex-wrap gap-2">{Object.entries(result.summary.types).map(([label, s]) => <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"><strong>{label}</strong> · {s.count}<br />Crédits : {money(s.positive)} · Débits : {money(s.negative)}</div>)}</div>}
      <LegacyHistoryTable rows={result.rows} finance={finance} />
      {result.total === 0 && <p className="py-4 text-center text-sm text-slate-500">Aucune référence pour ces filtres.</p>}
      <div className="flex items-center justify-between text-sm"><button disabled={result.page <= 1} onClick={() => setPage(result.page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Précédent</button><span>Page {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><button disabled={result.page * result.pageSize >= result.total} onClick={() => setPage(result.page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Suivant</button></div>
    </>}
  </section>;
}
