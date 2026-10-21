import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { reconciliationLabels, type ReconciliationIssue } from '../../lib/reconciliation';
type Result = { rows: ReconciliationIssue[]; total: number; page: number; pageSize: number; checkedAt: string; scope: string; counts: { current: number; legacy: number } };

export function ReconciliationRows({ rows }: { rows: ReconciliationIssue[] }) {
  return <div className="space-y-3">{rows.map(row => <article key={row.key} className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">{row.clientName || 'Dossier à retrouver'}</h4><p className="mt-1 break-all text-xs text-slate-500">Référence client : {row.clientId || 'Non renseignée'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.origin === 'current' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`}>{row.origin === 'current' ? 'CRM actuel' : 'Ancienne base'} · {row.kind === 'payment' ? 'Écriture financière' : row.kind === 'package' ? 'Forfait' : 'Réservation'}</span></div>
    <div className="mt-3 flex flex-wrap gap-2">{row.problems.map(problem => <span key={problem} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{reconciliationLabels[problem]}</span>)}</div>
    <p className="mt-3 text-sm text-slate-600">{row.explanation}</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-sky-700">Références et éléments à comparer</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-slate-500">Référence du document</dt><dd className="mt-1 break-all">{row.reference}</dd></div><div><dt className="text-slate-500">Écriture dans le CRM</dt><dd className="mt-1 break-all">{row.id}</dd></div><div><dt className="text-slate-500">Date</dt><dd className="mt-1">{row.date || 'Non renseignée'}</dd></div>{Number.isFinite(row.amount) && <div><dt className="text-slate-500">Montant conservé</dt><dd className="mt-1">{row.amount!.toLocaleString('fr-DZ')} DA</dd></div>}{row.relatedReferences?.length ? <div className="sm:col-span-2"><dt className="text-slate-500">Références associées à comparer</dt><dd className="mt-1 break-all">{row.relatedReferences.join(" · ")}</dd></div> : null}{row.source && <div className="sm:col-span-2"><dt className="text-slate-500">Preuve d’origine</dt><dd className="mt-1 break-all">{row.source.file} · page {row.source.page}<br />SHA-256 : {row.source.sha256}</dd></div>}</dl></details>
  </article>)}</div>;
}
export function ReconciliationPanel({ centerId }: { centerId: string }) {
  const [filters, setFilters] = useState({ origin: '', problem: '', search: '', page: 1 });
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setLoading(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Reconnectez-vous pour consulter les contrôles.');
        if (controller.signal.aborted) return;
        const response = await fetch('/api/crm-reconciliation', { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ centerId, ...filters }) });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.error || 'Contrôle indisponible.');
        if (!controller.signal.aborted) setResult(body);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Contrôle indisponible.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [centerId, filters, retry]);
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-slate-900">Contrôles et rapprochements</h3><p className="mt-1 text-sm text-slate-600">Retrouvez les références à vérifier avant toute correction. Clients archivés inclus ; démonstrations exclues des anomalies de paiement.</p></div><button disabled={loading} onClick={() => setRetry(r => r + 1)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-sky-700 disabled:opacity-50">Actualiser</button></div>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Vue de vérification en lecture seule. Aucun rapprochement automatique, aucune suppression et aucune création de client sans centre. Une référence absente du centre n’atteste pas sa disparition de toute la base.</p>
    {result && <><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => setFilters(f => ({ ...f, origin: 'current', page: 1 }))} className="rounded-xl border bg-white p-4 text-left text-sm"><strong className="block text-xl">{result.counts.current}</strong>Élément(s) du CRM actuel à vérifier</button><button onClick={() => setFilters(f => ({ ...f, origin: 'legacy', page: 1 }))} className="rounded-xl border bg-white p-4 text-left text-sm"><strong className="block text-xl">{result.counts.legacy}</strong>Référence(s) historiques à vérifier</button></div><p className="text-xs text-slate-500">Analyse du {new Date(result.checkedAt).toLocaleString('fr-FR')} · Résultats conservés jusqu’à 2 minutes pour limiter les lectures. {result.scope}</p></>}
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Rechercher<input value={filters.search} maxLength={200} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} placeholder="Nom, référence client, document…" className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Origine<select value={filters.origin} onChange={e => setFilters(f => ({ ...f, origin: e.target.value, page: 1 }))} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Toutes</option><option value="current">CRM actuel</option><option value="legacy">Ancienne base</option></select></label><label className="text-xs font-semibold text-slate-600">Contrôle<select value={filters.problem} onChange={e => setFilters(f => ({ ...f, problem: e.target.value, page: 1 }))} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Tous</option>{Object.entries(reconciliationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {(filters.search || filters.origin || filters.problem) && <button onClick={() => setFilters({ search: '', origin: '', problem: '', page: 1 })} className="text-xs font-semibold text-sky-700 underline">Réinitialiser les filtres</button>}
    {loading && <p role="status" className="text-sm text-slate-500">Analyse des références du centre…</p>}{error && <p role="alert" className="text-sm text-rose-700">{error} <button onClick={() => setRetry(r => r + 1)} className="underline">Réessayer</button></p>}
    {result && <><p className="text-sm">{result.total} élément(s) correspondant aux filtres. Un élément peut présenter plusieurs points à vérifier.</p><ReconciliationRows rows={result.rows} />{!result.total && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Aucun point détecté dans le périmètre et les filtres sélectionnés.</p>}<div className="flex items-center justify-between text-xs"><button disabled={result.page <= 1} onClick={() => setFilters(f => ({ ...f, page: result.page - 1 }))} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-50">Précédent</button><span>Page {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}</span><button disabled={result.page * result.pageSize >= result.total} onClick={() => setFilters(f => ({ ...f, page: result.page + 1 }))} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-50">Suivant</button></div></>}
  </section>;
}
