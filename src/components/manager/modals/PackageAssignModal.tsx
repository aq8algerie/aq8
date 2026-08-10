/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Client, Package } from '../../../types';

interface PackageAssignModalProps {
  clients: Client[];
  packages: Package[];
  onClose: () => void;
  onSubmit: (data: {
    clientPackageId: string;
    clientId: string;
    packageId: string;
  }) => Promise<{ ok: boolean }>;
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
  const clientPackageIdRef = useRef(`clipkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !packageId || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        clientPackageId: clientPackageIdRef.current,
        clientId,
        packageId,
      });

      if (!result.ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    } catch {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  return (
    <div id="modal-package-assign" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h4 className="font-bold text-slate-800 text-sm font-display">Ajouter un Paiement / Forfait Adhérent</h4>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">✕</button>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl cursor-pointer disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? 'Validation...' : "Ajouter le paiement & activer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
