import { useRef, useState } from 'react';
import type { Client, FollowUpOutcome } from '../../types';
import { mutateClientRecords } from '../../lib/clientRecordsClient';
import { FOLLOW_UP_LABELS, getLatestFollowUp } from '../../lib/clientFollowUpRules';
import { getTodayDateString } from '../../lib/centerManagerUtils';

export function ClientFollowUpPanel({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<FollowUpOutcome>('reached');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  const operationId = useRef('');
  const latest = getLatestFollowUp(client);
  const disabled = client.status === 'archived' || client.status === 'suspended';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true); setError(''); setSaved(false);
    if (!operationId.current) operationId.current = crypto.randomUUID();
    try {
      await mutateClientRecords({ action: 'log_follow_up', centerId: client.centerId, clientId: client.id,
        operationId: operationId.current, expectedLastId: latest?.id || null, outcome, notes, nextContactDate: nextDate || null });
      setSaved(true); setOpen(false); setNotes(''); setNextDate('');
      operationId.current = '';
    } catch (err) { setError(err instanceof Error ? err.message : 'Enregistrement impossible.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" aria-label="Suivi commercial">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div><h3 className="text-sm font-bold text-slate-800">Suivi des contacts</h3><p className="mt-1 text-xs text-slate-500">Historique des 50 derniers contacts, réservé à votre équipe.</p></div>
        {!disabled && <button type="button" onClick={() => { setOpen(!open); setSaved(false); setError(''); }} disabled={saving} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 cursor-pointer disabled:opacity-50">{open ? 'Fermer' : 'Noter un contact'}</button>}
      </div>
      {saved && <p role="status" className="mt-3 text-xs text-emerald-700">Contact enregistré.</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {open && <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Résultat
            <select value={outcome} disabled={saving} onChange={event => { setOutcome(event.target.value as FollowUpOutcome); if (event.target.value === 'declined') setNextDate(''); }} className="mt-1 block w-full rounded-xl border border-slate-200 p-2">
              {Object.entries(FOLLOW_UP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Prochain rappel (facultatif)
            <input type="date" min={getTodayDateString()} value={nextDate} disabled={saving || outcome === 'declined'} onChange={event => setNextDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 p-2 disabled:bg-slate-50" />
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Note de suivi
          <textarea value={notes} maxLength={1000} disabled={saving} onChange={event => setNotes(event.target.value)} rows={3} className="mt-1 block w-full rounded-xl border border-slate-200 p-3" placeholder="Résumé du contact et prochaine action…" />
        </label>
        {outcome === 'declined' && <p className="text-xs text-slate-500">Les suggestions de relance sont suspendues. Un nouveau contact enregistré pourra les réactiver.</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">{saving ? 'Enregistrement…' : 'Enregistrer le contact'}</button>
      </form>}
      {!client.followUps?.length && !open && <p className="mt-4 text-xs text-slate-500">Aucun contact enregistré.</p>}
      <ul className="mt-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {[...(client.followUps || [])].reverse().map(entry => <li key={entry.id} className="py-3 text-xs">
          <p className="font-semibold text-slate-800">{FOLLOW_UP_LABELS[entry.outcome]} <span className="font-normal text-slate-500">· {new Date(entry.createdAt).toLocaleString('fr-FR')} · {entry.createdByUserName}</span></p>
          {entry.notes && <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{entry.notes}</p>}
          {entry.nextContactDate && <p className="mt-1 text-sky-700">Rappel prévu le {entry.nextContactDate.split('-').reverse().join('/')}</p>}
        </li>)}
      </ul>
    </section>
  );
}
