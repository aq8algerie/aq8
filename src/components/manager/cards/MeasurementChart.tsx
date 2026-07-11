/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, TrendingDown, Scale } from 'lucide-react';
import { Measurement } from '../../../types';

interface MeasurementChartProps {
  measurements: Measurement[];
  onLogMeasurementClick: () => void;
}

export function MeasurementChart({
  measurements,
  onLogMeasurementClick
}: MeasurementChartProps) {
  // Sort measurements by date ascending to plot chronologically
  const sortedMeas = [...measurements].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div id="client-measurement-chart" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
          <TrendingDown className="h-4 w-4 text-[#ff5757]" /> Évolution de la Masse Grasse vs Poids
        </h4>
        <button
          id="btn-fiche-log-measurements"
          onClick={onLogMeasurementClick}
          className="px-2.5 py-1 text-[11px] bg-[#353535] text-white font-semibold rounded-lg hover:bg-slate-800 transition-premium flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3 w-3" /> Loguer mensurations
        </button>
      </div>

      {sortedMeas.length > 1 ? (
        /* Responsive SVG Line Chart */
        <div className="pt-4">
          <div className="h-44 relative">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              {/* Grid lines */}
              <line x1="0" y1="20" x2="400" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="75" x2="400" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="130" x2="400" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />

              {/* Weight Line curve */}
              {(() => {
                const points = sortedMeas.map((m, idx) => {
                  const x = (idx / (sortedMeas.length - 1)) * 360 + 20;
                  // Assume weight bounds roughly from 40 to 120, let's normalize nicely
                  const weights = sortedMeas.map(ms => ms.weight);
                  const minWeight = Math.min(...weights, 50) - 5;
                  const maxWeight = Math.max(...weights, 90) + 5;
                  const weightRange = maxWeight - minWeight || 10;
                  
                  const y = 130 - ((m.weight - minWeight) / weightRange) * 100;
                  return { x, y, val: m.weight, date: m.date };
                });

                const pathD = points.reduce((acc, curr, idx) => {
                  return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                }, '');

                return (
                  <>
                    <path d={pathD} fill="none" stroke="#ff5757" strokeWidth="3" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#ff5757" stroke="white" strokeWidth="1.5" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700">{p.val} kg</text>
                        <text x={p.x} y="145" textAnchor="middle" className="text-[8px] font-mono fill-slate-400">{p.date.slice(5)}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <p className="text-[10px] text-slate-400 text-center italic mt-2">Évolution continue du poids corporel (kg) sur les séances validées.</p>
        </div>
      ) : (
        <div className="h-44 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
          <Scale className="h-8 w-8 mb-2 stroke-1" />
          <p>Pas assez d'historique de mesures pour tracer la courbe.</p>
          <p className="text-[10px] text-slate-400 mt-1">Ajoutez au moins 2 mesures de mensurations pour voir le graphique d'amincissement.</p>
        </div>
      )}
    </div>
  );
}
