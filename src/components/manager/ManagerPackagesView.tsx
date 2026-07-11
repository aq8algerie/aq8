/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { Client, ClientPackage, Package } from '../../types';

interface ManagerPackagesViewProps {
  centerId: string;
  clients: Client[];
  clientPackages: ClientPackage[];
  packages: Package[];
  onAssignPackageClick: () => void;
}

export function ManagerPackagesView({
  centerId,
  clients,
  clientPackages,
  packages,
  onAssignPackageClick
}: ManagerPackagesViewProps) {
  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerClientPackages = clientPackages.filter(cp => cp.centerId === centerId);

  return (
    <div id="manager-packages-view" className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold font-display text-slate-800 text-base">Suivi des Forfaits Adhérents</h3>
        <button
          id="btn-packages-assign"
          onClick={onAssignPackageClick}
          className="px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl transition-premium text-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Affecter un forfait
        </button>
      </div>

      {/* Desktop View Table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
              <tr>
                <th className="p-4">Adhérent</th>
                <th className="p-4">Nom du Forfait</th>
                <th className="p-4">Séances restantes</th>
                <th className="p-4">Date d'affectation</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {centerClientPackages.length > 0 ? (
                centerClientPackages.map(cp => {
                  const cl = centerClients.find(c => c.id === cp.clientId);
                  const pack = packages.find(p => p.id === cp.packageId);
                  return (
                    <tr key={cp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-[#353535]">
                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                      </td>
                      <td className="p-4 font-medium">{pack?.name || 'Forfait'}</td>
                      <td className="p-4 font-mono font-bold text-[#ff5757]">
                        {cp.sessionsRemaining} / {cp.totalSessions}
                      </td>
                      <td className="p-4 text-slate-500 font-mono">{cp.purchaseDate}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          cp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {cp.status === 'active' ? 'Actif' : 'Consommé'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    Aucun forfait affecté à ce jour.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View Cards */}
      <div className="sm:hidden space-y-3">
        {centerClientPackages.length > 0 ? (
          centerClientPackages.map(cp => {
            const cl = centerClients.find(c => c.id === cp.clientId);
            const pack = packages.find(p => p.id === cp.packageId);
            return (
              <div key={cp.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-[#353535]">
                      {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                    </h4>
                    <span className="text-[11px] text-slate-500 block mt-1 font-semibold">{pack?.name || 'Forfait'}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    cp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {cp.status === 'active' ? 'Actif' : 'Consommé'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 text-xs">
                  <span className="text-[11px] text-slate-500">Affecté le {cp.purchaseDate}</span>
                  <div className="font-mono font-bold text-xs">
                    Séances: <span className="text-[#ff5757]">{cp.sessionsRemaining} / {cp.totalSessions}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 italic text-xs">
            Aucun forfait affecté à ce jour.
          </div>
        )}
      </div>
    </div>
  );
}
