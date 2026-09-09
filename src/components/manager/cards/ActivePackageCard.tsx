/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ban, Plus } from 'lucide-react';
import { ClientPackage, Package } from '../../../types';
import { isPackageExpired } from '../../../lib/packageRules';

interface ActivePackageCardProps {
  clientPackages: ClientPackage[];
  packages: Package[];
  onAssignClick: () => void;
  onCancelPackageClick?: (clientPackageId: string) => void;
}

export function ActivePackageCard({
  clientPackages,
  packages,
  onAssignClick,
  onCancelPackageClick,
}: ActivePackageCardProps) {
  return (
    <div id="client-active-package-card" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Abonnement & Forfaits</h4>
        
        {clientPackages.length > 0 ? (
          <div className="space-y-3">
            {clientPackages.map(cp => {
              const pack = packages.find(p => p.id === cp.packageId);
              const isCancelled = cp.status === 'cancelled';
              const expired = !isCancelled && isPackageExpired(cp);
              const statusLabel = isCancelled
                ? 'Annulé'
                : expired
                ? 'Expiré'
                : cp.status === 'active'
                ? 'Actif'
                : cp.status === 'completed'
                ? 'Consommé'
                : cp.status;

              const statusColor = isCancelled
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : expired
                ? 'bg-amber-100 text-amber-800'
                : cp.status === 'active'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600';

              const sessionsRemaining = (expired || isCancelled) ? 0 : cp.sessionsRemaining;
              
              return (
                <div key={cp.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800 font-display block">{pack?.name || 'Forfait'}</span>
                      {isCancelled && cp.cancellationReason && (
                        <span className="text-[10px] text-rose-600 font-semibold block">
                          Motif: {cp.cancellationReason}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {!isCancelled && onCancelPackageClick && (
                        <button
                          type="button"
                          onClick={() => onCancelPackageClick(cp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Annuler ce forfait"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Séances restantes:</span>
                    <span className="font-mono font-bold text-sm text-[#0284c7]">{sessionsRemaining} / {cp.totalSessions}</span>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(sessionsRemaining / cp.totalSessions) * 100}%` }} 
                      className={`h-full transition-all ${isCancelled ? 'bg-rose-500' : 'bg-[#0284c7]'}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-500 space-y-2">
            <p>Aucun forfait enregistré sur ce client.</p>
          </div>
        )}
      </div>

      <button
        id="btn-assign-package"
        onClick={onAssignClick}
        className="w-full mt-4 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Ajouter un paiement / Forfait
      </button>
    </div>
  );
}
