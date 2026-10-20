import React from 'react';
import type { Measurement } from '../../../types';
import { MeasurementDetails, formatMeasurement } from './MeasurementDetails';

export function MeasurementHistory({ measurements }: { measurements: Measurement[] }) {
  const sorted = [...measurements].sort((a, b) =>
    (b.historicalMeasurements?.measuredAt || b.date).localeCompare(a.historicalMeasurements?.measuredAt || a.date)
    || b.id.localeCompare(a.id));
  return <div className="space-y-2">
    <p className="text-xs text-slate-500">Ouvrez un relevé pour consulter toutes ses mensurations.</p>
    {sorted.map(m => <details key={m.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="grid cursor-pointer grid-cols-2 gap-3 p-4 text-xs hover:bg-slate-50 sm:grid-cols-4">
        <span className="font-bold text-slate-800">{m.date}<span className="mt-1 block text-[10px] font-normal text-slate-500 group-open:hidden">Voir le détail</span></span>
        <span><span className="block text-slate-500">Poids</span><strong className="text-[#0284c7]">{formatMeasurement(m.weight, 'kg')}</strong></span>
        <span><span className="block text-slate-500">Tour de taille</span><strong>{formatMeasurement(m.waist, 'cm')}</strong></span>
        <span><span className="block text-slate-500">Objectif</span><strong>{formatMeasurement(m.targetWeight, 'kg')}</strong></span>
      </summary>
      <div className="border-t border-slate-100 p-4"><MeasurementDetails measurement={m} /></div>
    </details>)}
  </div>;
}
