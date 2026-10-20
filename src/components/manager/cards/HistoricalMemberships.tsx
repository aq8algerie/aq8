import React from 'react';
import type { Client } from '../../../types';

export function HistoricalMemberships({ client }: { client: Client }) {
  const memberships = Object.values(client.legacyMemberships || {})
    .filter(m => m.clientId === client.id && m.centerId === client.centerId)
    .sort((a,b) => b.validFrom.localeCompare(a.validFrom));
  if (!memberships.length) return null;
  const date = (value: string) => value.slice(0,10).split('-').reverse().join('/');
  return <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">Adhésions historiques ({memberships.length})</h4>
    <p className="text-xs leading-relaxed text-slate-500">Archives de l’ancienne base. Ces adhésions sont closes et n’ajoutent aucun crédit de séances aux forfaits actuels.</p>
    <div className="space-y-3">
      {memberships.map(m => <article key={m.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-slate-800">{m.centerName}</strong>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Inactive · échue</span>
        </div>
        <p className="mt-2 font-medium text-slate-700">Du {date(m.validFrom)} au {date(m.validTo)}</p>
        <p className="mt-1 text-[10px] text-slate-500">Référence historique : {m.id}</p>
      </article>)}
    </div>
  </section>;
}
