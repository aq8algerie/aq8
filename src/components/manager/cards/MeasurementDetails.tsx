import React from 'react';
import type { Measurement } from '../../../types';

export function formatMeasurement(value: number | undefined, unit: string): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${unit}` : '—';
}

/** The historical source is retained when a value cannot safely be interpreted. */
export function MeasurementDetails({ measurement: m }: { measurement: Measurement }) {
  const fields: [string, number | undefined, string][] = [
    ['Poids', m.weight, 'kg'], ['Taille corporelle', m.heightCm, 'cm'],
    ['Objectif de poids', m.targetWeight, 'kg'], ['Tour de taille', m.waist, 'cm'],
    ['Poitrine', m.chest, 'cm'], ['Hanches / fessier', m.hips, 'cm'],
    ['Bras gauche', m.leftArm, 'cm'], ['Bas abdomen', m.lowerAbdomen, 'cm'],
    ['Nombril', m.navel, 'cm'], ['Cuisses H (haut)', m.thighHigh, 'cm'],
    ['Cuisses M (milieu)', m.thighMid, 'cm'], ['Cuisses (mesure synthétique)', m.thighs, 'cm'],
    ['Masse grasse', m.bodyFat, '%'], ['Masse musculaire', m.muscleMass, '%'],
  ];
  const historical = m.historicalMeasurements;
  const unresolved = historical ? [
    !m.heightCm && Number(historical.height) > 0 ? `Taille : ${historical.height}` : '',
    !m.targetWeight && Number(historical.targetWeight) > 0 ? `Objectif : ${historical.targetWeight}` : '',
    ...([['waist', 'Tour de taille'], ['leftArm', 'Bras gauche'], ['lowerAbdomen', 'Bas abdomen'],
      ['navel', 'Nombril'], ['thighHigh', 'Cuisses H'], ['thighMid', 'Cuisses M']] as const)
      .filter(([key]) => !Object.hasOwn(m, key) && Number(historical[key]) > 0)
      .map(([key, label]) => `${label} : ${historical[key]}`),
  ].filter(Boolean) : [];
  return <div className="space-y-3">
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {fields.filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0).map(([label, value, unit]) =>
        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-slate-800">{formatMeasurement(value, unit)}</dd>
        </div>)}
    </dl>
    {unresolved.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
      Valeurs historiques à vérifier : {unresolved.join(' · ')}. L’unité ou la valeur ne peut pas être confirmée.
    </p>}
    {historical && <p className="text-[11px] text-slate-500">Relevé historique du {historical.measuredAt.replace('T', ' à ')}.
      {' '}Les cuisses H/M sont conservées séparément ; la mesure synthétique provient de l’ancien import.</p>}
  </div>;
}
