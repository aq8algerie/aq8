import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { auth } from '../../lib/firebase';
import type { ClientStatementData } from '../../lib/clientStatement';
import { timelineKindLabels, timelineOriginLabels } from '../../lib/clientTimeline';

const date = (value: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Non renseignée';
const money = (value: number) => `${value.toLocaleString('fr-DZ')} DA`;
export function ClientStatementDocument({ data }: { data: ClientStatementData }) {
  const sources = [...new Set(data.events.flatMap(e => e.details.filter(d => d.label === 'Document source').map(d => d.value)))];
  return <article className="client-statement-document space-y-5 bg-white p-5 text-slate-900 sm:p-8">
    <header className="border-b-2 border-slate-800 pb-4"><p className="text-xs font-bold uppercase tracking-wide">{data.center.name}</p><h2 className="mt-2 text-2xl font-bold">Relevé adhérent</h2><p className="mt-1 text-xs text-slate-600">Édité le {date(data.generatedAt)} à {data.generatedAt.slice(11, 16)} UTC · Dossier complet</p><p className="mt-1 text-xs text-slate-500">{[data.center.address, data.center.phone].filter(Boolean).join(' · ')}</p></header>
    <section><h3 className="text-lg font-bold">{data.client.name}</h3><p className="mt-1 break-all text-xs">Référence adhérent : {data.client.id}</p>{data.client.phone && <p className="mt-1 text-xs">Téléphone : {data.client.phone}</p>}</section>
    <section aria-label="Situation du CRM actuel" className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">Situation du CRM actuel</h3><p className="text-sm">{data.summary.balanceLabel}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Forfaits enregistrés</dt><dd className="font-bold">{data.summary.packageCount}</dd></div><div><dt className="text-xs text-slate-500">Crédits utilisables</dt><dd className="font-bold">{data.summary.availableCredits}</dd></div><div><dt className="text-xs text-slate-500">Crédits non utilisables</dt><dd className="font-bold">{data.summary.nonUsableCredits}</dd></div><div><dt className="text-xs text-slate-500">Séances validées</dt><dd className="font-bold">{data.summary.completedSessions}</dd></div></dl>
      {data.financialVisible && <p className="border-t pt-3 text-sm"><strong>Encaissements nets du CRM actuel : </strong>{data.summary.netReceipts === null || data.summary.netReceipts === undefined ? 'Aucun encaissement CRM enregistré' : money(data.summary.netReceipts)}<span className="mt-1 block text-xs text-slate-600">Règlements et contre-écritures inclus ; archives et démonstrations exclues. Ce total ne constitue pas un montant restant à payer.</span></p>}
      {!data.financialVisible && <p className="text-xs text-slate-600">Version sans données financières. Les montants sont réservés au gérant.</p>}
    </section>
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">Les archives ne sont pas additionnées aux encaissements actuels et ne recréditent aucun forfait. Une réservation historique ne prouve pas la réalisation d’une séance. Le solde financier historique et les éventuels impayés ne sont pas établis par ce relevé.</p>
    <section><h3 className="mb-3 font-bold">Historique du dossier · {data.events.length} événement(s)</h3>
      <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-y bg-slate-50"><th className="p-2">Date</th><th className="p-2">Événement / état</th><th className="p-2">Origine</th><th className="p-2">Références</th>{data.financialVisible && <th className="p-2 text-right">Montant</th>}</tr></thead><tbody>
        {data.events.map(e => <tr key={e.id} className="border-b align-top"><td className="p-2">{date(e.date)}{e.date.length > 10 && <span className="block">{e.date.slice(11, 16)}</span>}</td><td className="p-2"><strong>{e.title}</strong><p className="mt-1">{e.status}</p><p className="mt-1 text-slate-500">{timelineKindLabels[e.kind]}</p></td><td className="p-2">{timelineOriginLabels[e.origin]}</td><td className="max-w-[260px] break-words p-2 [overflow-wrap:anywhere]"><p>{e.reference}</p>{e.details.filter(d => ['Document source', 'Page du PDF', 'Règlement d’origine', 'Contre-écriture', 'Paiement associé', 'Forfait associé', 'Début', 'Fin', 'Motif d’annulation', 'Centre d’origine', 'Hors indicateurs financiers'].includes(d.label)).map(d => <p key={d.label} className="mt-1 text-slate-600">{d.label} : {d.value}</p>)}</td>{data.financialVisible && <td className="p-2 text-right">{Number.isFinite(e.amount) ? `${e.amount! > 0 ? '+' : ''}${money(e.amount!)}` : '—'}</td>}</tr>)}
      </tbody></table></div>{!data.events.length && <p className="py-4 text-sm text-slate-500">Aucun événement enregistré pour cet adhérent.</p>}
    </section>
    {sources.length > 0 && <section className="space-y-2 text-xs"><h3 className="font-bold">Traçabilité des archives</h3>{sources.map(file => { const e = data.events.find(e => e.details.some(d => d.label === 'Document source' && d.value === file)); const hash = e?.details.find(d => d.label === 'Empreinte du document')?.value; return <p key={file} className="break-all">{file}{hash && <span className="block text-[10px] text-slate-500">SHA-256 : {hash}</span>}</p>; })}</section>}
    <footer className="border-t pt-3 text-[10px] text-slate-500">Centre : {data.center.name} · Adhérent : {data.client.id} · Les dates des réservations correspondent aux séances prévues. Crédits non utilisables : forfaits expirés ou clos, ou client suspendu. Document de suivi, à distinguer d’un reçu de paiement.</footer>
  </article>;
}

export function ClientStatementButton({ centerId, clientId }: { centerId: string; clientId: string }) {
  const [data, setData] = useState<ClientStatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!data) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setData(null);
      if (event.key === 'Tab') {
        const buttons = document.querySelectorAll<HTMLButtonElement>('#client-statement-print-root button');
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handle);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', handle); trigger.current?.focus(); };
  }, [data]);
  const load = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Reconnectez-vous pour préparer le relevé.');
      if (controller.signal.aborted) return;
      const response = await fetch('/api/crm-client-timeline', { method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ centerId, clientId, mode: 'statement' }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || 'Relevé indisponible.');
      if (!controller.signal.aborted) setData(body.statement);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Relevé indisponible.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  return <div><button ref={trigger} type="button" disabled={loading} onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:opacity-50">{loading ? 'Préparation du relevé…' : 'Préparer le relevé adhérent'}</button>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    {data && createPortal(<div id="client-statement-print-root" role="dialog" aria-modal="true" aria-label="Aperçu du relevé adhérent" className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/70 p-3 sm:p-6"><div className="statement-shell mx-auto max-w-5xl rounded-2xl bg-white shadow-xl"><div className="statement-toolbar sticky top-0 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b bg-white p-4"><div><h2 className="font-bold">Aperçu du relevé complet</h2><p className="text-xs text-slate-500">Tous les événements autorisés ; les filtres de la chronologie ne s’appliquent pas.</p></div><div className="flex gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white">Imprimer / PDF</button><button ref={close} type="button" onClick={() => setData(null)} className="rounded-lg border px-3 py-2 text-sm">Fermer</button></div></div><ClientStatementDocument data={data} /></div></div>, document.body)}
  </div>;
}
