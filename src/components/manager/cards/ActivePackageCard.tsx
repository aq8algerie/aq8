/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { ClientPackage, Package } from '../../../types';
import { isPackageExpired } from '../../../lib/packageRules';

interface ActivePackageCardProps {
  clientPackages: ClientPackage[];
  packages: Package[];
  onAssignClick: () => void;
}

export function ActivePackageCard({
  clientPackages,
  packages,
  onAssignClick
}: ActivePackageCardProps) {
  return (
    <div id="client-active-package-card" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Abonnement & Forfaits</h4>
        
        {clientPackages.length > 0 ? (
          <div className="space-y-3">
            {clientPackages.map(cp => {
              const pack = packages.find(p => p.id === cp.packageId);
              const expired = isPackageExpired(cp);
              const statusLabel = expired ? 'Expiré' : cp.status === 'active' ? 'Actif' : cp.status === 'completed' ? 'Consommé' : cp.status;
              const statusColor = expired ? 'bg-rose-100 text-rose-700' : cp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500';
              const sessionsRemaining = expired ? 0 : cp.sessionsRemaining;
              
              return (
                <div key={cp.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 font-display">{pack?.name || 'Forfait'}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 font-medium">Séances restantes:</span>
                    <span className="font-mono font-bold text-sm text-[#ff5757]">{sessionsRemaining} / {cp.totalSessions}</span>
                  </div>
                  {/* Visual progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(sessionsRemaining / cp.totalSessions) * 100}%` }} 
                      className="bg-[#ff5757] h-full transition-all"
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
        className="w-full mt-4 py-2.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Affecter un forfait
      </button>
    </div>
  );
}
