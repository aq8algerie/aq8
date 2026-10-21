import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { timelineKindLabels, timelineOriginLabels, type TimelineResult } from '../../lib/clientTimeline';

const displayDate = (value: string) => value ? `${value.slice(0, 10).split('-').reverse().join('/')}${value.length > 10 ? ` · ${value.slice(11, 16)}` : ''}` : 'Date non renseignée';

export function ClientTimelineEntries({ result }: { result: TimelineResult }) {
  return <ol className="space-y-4" aria-label="Événements du dossier adhérent">
    {result.rows.map(event => <li key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-500">{displayDate(event.date)}</p><h4 className="mt-1 font-bold text-slate-900">{event.title}</h4></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.origin === 'legacy' ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-800'}`}>{timelineOriginLabels[event.origin]}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">{timelineKindLabels[event.kind]}</span><span className="font-semibold text-slate-700">{event.status}</span>
        {result.financialVisible && Number.isFinite(event.amount) && <strong className="ml-auto text-base text-slate-900">{event.amount! > 0 ? '+' : ''}{event.amount!.toLocaleString('fr-DZ')} DA</strong>}
      </div>
      <p className="mt-2 break-all text-xs text-slate-500">Référence : {event.reference}</p>
      <details className="mt-3 border-t border-slate-100 pt-3 text-sm"><summary className="cursor-pointer font-semibold text-sky-700">Détail et justificatifs</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">{event.details.map((d, i) => <div key={`${d.label}-${i}`} className="min-w-0"><dt className="text-xs text-slate-500">{d.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-800 [overflow-wrap:anywhere]">{d.value}</dd></div>)}</dl>
      </details>
    </li>)}
  </ol>;
}

export function ClientTimeline({ centerId, clientId }: { centerId: string; clientId: string }) {
  const [filters, setFilters] = useState({ search: '', kind: '', origin: '', from: '', to: '', page: 1 });
  const [result, setResult] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Reconnectez-vous pour consulter la chronologie.');
        if (controller.signal.aborted) return;
        const response = await fetch('/api/crm-client-timeline', { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ centerId, clientId, ...filters }) });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || 'Chronologie indisponible.');
        if (!controller.signal.aborted) setResult(body);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chronologie indisponible.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [centerId, clientId, filters, retry]);
  const change = (key: 'search' | 'kind' | 'origin' | 'from' | 'to', value: string) => setFilters(f => ({ ...f, [key]: value, page: 1 }));
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
    <div><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold text-slate-900">Chronologie adhérent</h3><button disabled={loading} onClick={() => setRetry(r => r + 1)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-40">Actualiser</button></div><p className="mt-1 text-sm text-slate-600">Réservations, séances, abonnements et écritures autorisées, du plus récent au plus ancien. Ouvrez un événement pour retrouver ses références. Pour une réservation, la date affichée est celle de la séance prévue.</p>
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Les archives expliquent le passé : une ancienne réservation ne prouve pas une séance réalisée. Les anciennes adhésions n’ajoutent aucun crédit actuel. Cette chronologie ne calcule pas de solde financier cumulé.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-xs font-semibold text-slate-600">Rechercher<input value={filters.search} maxLength={200} onChange={e => change('search', e.target.value)} placeholder="Référence, prestation, commentaire…" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Événements<select value={filters.kind} onChange={e => change('kind', e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Tous</option>{Object.entries(timelineKindLabels).filter(([key]) => key !== 'payment' || result?.financialVisible).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Origine<select value={filters.origin} onChange={e => change('origin', e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Toutes</option>{Object.entries(timelineOriginLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Du<input type="date" value={filters.from} onChange={e => change('from', e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Au<input type="date" value={filters.to} onChange={e => change('to', e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
    </div>
    {(filters.search || filters.kind || filters.origin || filters.from || filters.to) && <button className="text-xs font-semibold text-sky-700 underline" onClick={() => setFilters({ search: '', kind: '', origin: '', from: '', to: '', page: 1 })}>Réinitialiser les filtres</button>}
    {loading && <p role="status" className="text-sm text-slate-500">Chargement de la chronologie…</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error} <button onClick={() => setRetry(r => r + 1)} className="underline">Réessayer</button></p>}
    {result && <><p className="text-sm text-slate-700">{result.total} événement(s) correspondant aux filtres.{!result.financialVisible && ' Les données financières sont réservées au gérant.'}</p>
      <ClientTimelineEntries result={result} />
      {!result.total && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Aucun événement pour ces filtres.</p>}
      <div className="flex items-center justify-between gap-2 text-xs"><button disabled={result.page <= 1} onClick={() => setFilters(f => ({ ...f, page: result.page - 1 }))} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Précédent</button><span>Page {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><button disabled={result.page * result.pageSize >= result.total} onClick={() => setFilters(f => ({ ...f, page: result.page + 1 }))} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Suivant</button></div>
    </>}
  </section>;
}
