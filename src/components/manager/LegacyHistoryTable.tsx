import React from 'react';
import type { LegacyHistoryRecord } from '../../lib/legacyHistory';

const money = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-DZ')} DA`;
// Show the calendar and hour written in the source, without a browser timezone conversion.
const dateLabel = (value: string) => {
  const [date, time] = value.split(/[T ]/);
  return `${date.split('-').reverse().join('/')}${time ? ` ${time.slice(0, 5)}` : ''}`;
};

export function LegacyHistoryTable({ rows, finance }: { rows: LegacyHistoryRecord[]; finance: boolean }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[740px] text-left text-sm">
      <thead className="border-b text-xs text-slate-500">
        <tr>
          <th className="p-2">Date / référence</th>
          <th className="p-2">Client d’origine</th>
          <th className="p-2">{finance ? 'Type / montant signé' : 'Service / état'}</th>
          <th className="p-2">Traçabilité</th>
        </tr>
      </thead>
      <tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-100 align-top">
        <td className="p-2">
          <strong>{dateLabel(row.date)}</strong>
          <div className="text-xs text-slate-500">N° {row.source.legacyId}</div>
          {row.end && <div className="text-xs text-slate-500">Fin : {dateLabel(row.end)}</div>}
        </td>
        <td className="p-2">
          {row.clientName || 'Nom absent de la source'}
          <div className="text-xs text-slate-500">{row.clientId}</div>
          {!row.clientExists && <div className="text-xs text-amber-700">Client non repris dans le CRM</div>}
        </td>
        <td className="p-2">
          <strong>{finance ? row.type : row.service}</strong>
          {finance ? <div className="font-mono">{money(row.amount || 0)}</div>
            : <div>{row.type}{row.refunded ? ' · Remboursée' : ''}</div>}
          {row.originalCenterMissing && <div className="text-xs text-amber-700">Centre d’origine non renseigné</div>}
        </td>
        <td className="max-w-md p-2">
          <details>
            <summary className="cursor-pointer text-sky-700">Voir la source et le commentaire</summary>
            <div className="mt-2 space-y-1 break-words text-xs text-slate-600">
              <p className="whitespace-pre-wrap">{row.comment || 'Aucun commentaire dans la source.'}</p>
              <p>{row.source.file} · page {row.source.page} · références techniques page {row.source.technicalPage}</p>
              <p>Référence source : {row.source.legacyId}{row.eventId ? ` · Événement : ${row.eventId}` : ''}</p>
              {row.relatedReservationIds && row.relatedReservationIds.length > 1 && <p>
                Autres références du même événement : {row.relatedReservationIds.join(', ')}. Conservées pour la traçabilité.
              </p>}
              {row.previousImportedCenterId && row.previousImportedCenterId !== row.centerId && <p>
                Ancien import : {row.previousImportedCenterId}. Cette archive reprend le centre du PDF.
              </p>}
              {row.resource && <p>Coach / ressource : {row.resource}</p>}
              {row.planningState && <p>État du planning source : {row.planningState}</p>}
              <p className="break-all">Empreinte du PDF : {row.source.sha256}</p>
            </div>
          </details>
        </td>
      </tr>)}</tbody>
    </table>
  </div>;
}
