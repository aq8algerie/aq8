/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Package } from '../../../types';

interface PackageAssignModalProps {
  clients: Client[];
  packages: Package[];
  onClose: () => void;
  onSubmit: (clientId: string, packageId: string) => void;
  initialClientId?: string;
}

export function PackageAssignModal({
  clients,
  packages,
  onClose,
  onSubmit,
  initialClientId
}: PackageAssignModalProps) {
  const [clientId, setClientId] = useState(initialClientId || '');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !packageId) return;
    onSubmit(clientId, packageId);
  };

  return (
    <div id="modal-package-assign" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h4 className="font-bold text-slate-800 text-sm font-display">Affecter un Forfait Adhérent</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Sélectionner l'Adhérent *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
              disabled={!!initialClientId}
            >
              <option value="">-- Choisir un client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Type de Forfait disponible *</label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sessionsCount} sessions - {p.price.toLocaleString('fr-DZ')} DZD)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              Confirmer l'affectation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
