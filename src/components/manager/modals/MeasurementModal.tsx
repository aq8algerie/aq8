/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client } from '../../../types';

interface MeasurementModalProps {
  clients: Client[];
  onClose: () => void;
  onSubmit: (data: {
    clientId: string;
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thighs?: number;
  }) => void;
  initialClientId?: string;
}

export function MeasurementModal({
  clients,
  onClose,
  onSubmit,
  initialClientId
}: MeasurementModalProps) {
  const [clientId, setClientId] = useState(initialClientId || '');
  const [weight, setWeight] = useState(70);
  const [bodyFat, setBodyFat] = useState<number | ''>('');
  const [muscleMass, setMuscleMass] = useState<number | ''>('');
  const [chest, setChest] = useState<number | ''>('');
  const [waist, setWaist] = useState<number | ''>('');
  const [hips, setHips] = useState<number | ''>('');
  const [thighs, setThighs] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || weight <= 0) return;

    onSubmit({
      clientId,
      weight,
      bodyFat: bodyFat === '' ? undefined : bodyFat,
      muscleMass: muscleMass === '' ? undefined : muscleMass,
      chest: chest === '' ? undefined : chest,
      waist: waist === '' ? undefined : waist,
      hips: hips === '' ? undefined : hips,
      thighs: thighs === '' ? undefined : thighs
    });
  };

  return (
    <div id="modal-measurement" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h4 className="font-bold text-slate-800 text-sm font-display">Saisie des Mensurations Adhérent</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Adhérent Concerné *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
              disabled={!!initialClientId}
            >
              <option value="">-- Choisir le client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Poids (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Masse Grasse (%)</label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ex: 22"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Masse Muscle (%)</label>
              <input
                type="number"
                step="0.1"
                value={muscleMass}
                onChange={(e) => setMuscleMass(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ex: 35"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Mensurations anatomiques (cm)</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Tour de poitrine</label>
                <input
                  type="number"
                  value={chest}
                  onChange={(e) => setChest(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="ex: 95"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Tour de taille</label>
                <input
                  type="number"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="ex: 78"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Tour de hanches</label>
                <input
                  type="number"
                  value={hips}
                  onChange={(e) => setHips(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="ex: 102"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Tour de cuisses</label>
                <input
                  type="number"
                  value={thighs}
                  onChange={(e) => setThighs(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="ex: 58"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
