/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Scale } from 'lucide-react';
import { Client, Measurement } from '../../types';

interface ManagerMeasurementsViewProps {
  centerId: string;
  clients: Client[];
  measurements: Measurement[];
  onLogMeasurementClick: () => void;
}

export function ManagerMeasurementsView({
  centerId,
  clients,
  measurements,
  onLogMeasurementClick
}: ManagerMeasurementsViewProps) {
  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerClientsIds = new Set(centerClients.map(c => c.id));
  
  // Filter measurements belonging to clients of this center
  const centerMeasurements = measurements.filter(m => centerClientsIds.has(m.clientId));

  return (
    <div id="manager-measurements-view" className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="font-bold font-display text-slate-800 text-base">Suivi Général des Mensurations</h3>
          <p className="text-xs text-slate-500">Consultez les bilans morphologiques globaux des adhérents.</p>
        </div>
        <button
          id="btn-measurements-log"
          onClick={onLogMeasurementClick}
          className="px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl transition-premium text-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Loguer des mensurations
        </button>
      </div>

      {/* Desktop View Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
              <tr>
                <th className="p-4">Adhérent</th>
                <th className="p-4">Date de saisie</th>
                <th className="p-4 font-mono">Poids (kg)</th>
                <th className="p-4 font-mono">Grasse / Muscle (%)</th>
                <th className="p-4">Poitrine / Taille (cm)</th>
                <th className="p-4">Hanches / Cuisses (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {centerMeasurements.length > 0 ? (
                [...centerMeasurements].sort((a, b) => b.date.localeCompare(a.date)).map(meas => {
                  const cl = centerClients.find(c => c.id === meas.clientId);
                  return (
                    <tr key={meas.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-[#353535]">
                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                      </td>
                      <td className="p-4 font-mono text-slate-500">{meas.date}</td>
                      <td className="p-4 font-mono font-bold text-slate-800">{meas.weight} kg</td>
                      <td className="p-4 font-mono text-slate-600">
                        {meas.bodyFat !== undefined ? `${meas.bodyFat}%` : '-'} / {meas.muscleMass !== undefined ? `${meas.muscleMass}%` : '-'}
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {meas.chest !== undefined ? `${meas.chest}cm` : '-'} / {meas.waist !== undefined ? `${meas.waist}cm` : '-'}
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {meas.hips !== undefined ? `${meas.hips}cm` : '-'} / {meas.thighs !== undefined ? `${meas.thighs}cm` : '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Aucune fiche de mensuration enregistrée pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View Cards */}
      <div className="sm:hidden space-y-3">
        {centerMeasurements.length > 0 ? (
          [...centerMeasurements].sort((a, b) => b.date.localeCompare(a.date)).map(meas => {
            const cl = centerClients.find(c => c.id === meas.clientId);
            return (
              <div key={meas.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-[#353535]">
                      {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 block mt-1">Bilan du: {meas.date}</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#ff5757] bg-[#ff5757]/10 px-2.5 py-1 rounded-xl">
                    {meas.weight} kg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-2.5 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Composition</span>
                    <span className="font-mono font-medium">MG: {meas.bodyFat !== undefined ? `${meas.bodyFat}%` : '-'} | MM: {meas.muscleMass !== undefined ? `${meas.muscleMass}%` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Haut du corps</span>
                    <span className="font-mono font-medium">Poitrine: {meas.chest !== undefined ? `${meas.chest}cm` : '-'} | Taille: {meas.waist !== undefined ? `${meas.waist}cm` : '-'}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-50 pt-1">
                    <span className="text-slate-400 block text-[10px] uppercase">Bas du corps</span>
                    <span className="font-mono font-medium">Hanches: {meas.hips !== undefined ? `${meas.hips}cm` : '-'} | Cuisses: {meas.thighs !== undefined ? `${meas.thighs}cm` : '-'}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 italic text-xs">
            Aucune fiche de mensuration enregistrée pour l'instant.
          </div>
        )}
      </div>
    </div>
  );
}
