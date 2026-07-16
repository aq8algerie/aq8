/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutGrid,
  List,
  Clock,
  Layers,
  Zap,
  Activity,
  Package2,
  CheckCircle2
} from 'lucide-react';
import { Service, Package } from '../../types';

interface ManagerServicesViewProps {
  centerServices: Service[];
  centerPackages: Package[];
}

export function ManagerServicesView({
  centerServices,
  centerPackages
}: ManagerServicesViewProps) {
  const [activeSection, setActiveSection] = useState<'services' | 'packages'>('services');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridLimit, setGridLimit] = useState(4);
  const [listPage, setListPage] = useState(1);

  const PAGE_SIZE = 5;

  const formatDZD = (amount: number) =>
    amount > 0 ? `${amount.toLocaleString('fr-DZ')} DZD` : 'Tarif défini par le centre';

  // Reset page/limit on tab/mode switch
  const switchSection = (s: 'services' | 'packages') => {
    setActiveSection(s);
    setGridLimit(4);
    setListPage(1);
  };
  const switchViewMode = (m: 'grid' | 'list') => {
    setViewMode(m);
    setGridLimit(4);
    setListPage(1);
  };

  const services = centerServices;
  const packs = centerPackages;

  const currentData = activeSection === 'services' ? services : packs;
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);

  return (
    <div id="manager-services-view" className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold font-display text-slate-800 text-base">Prestations & Forfaits du Centre</h3>
          <p className="text-[10px] text-slate-400 font-medium">Catalogue activé et tarifé pour votre centre.</p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => switchViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => switchViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Section Toggle: Prestations / Forfaits */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/40 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => switchSection('services')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'services'
              ? 'bg-white text-[#ff5757] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Prestations ({services.length})
        </button>
        <button
          type="button"
          onClick={() => switchSection('packages')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'packages'
              ? 'bg-white text-[#353535] shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package2 className="h-3.5 w-3.5" />
          Forfaits ({packs.length})
        </button>
      </div>

      {/* Empty state */}
      {currentData.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-xs italic shadow-xs">
          Aucun{activeSection === 'services' ? 'e prestation activée' : ' forfait activé'} pour ce centre.<br />
          <span className="text-[11px]">Configurez le catalogue dans les paramètres du centre (Super Admin).</span>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && currentData.length > 0 && (
        <div className="space-y-5">
          {activeSection === 'services' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.slice(0, gridLimit).map(srv => (
                <div key={srv.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                        srv.type === 'aq8'
                          ? 'bg-[#ff5757]/10 text-[#ff5757]'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {srv.type === 'aq8' ? '⚡ AQ8 EMS' : '✨ Wonder'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono font-semibold">
                        <Clock className="h-3 w-3" />
                        {srv.duration} min
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 font-display text-sm leading-tight">{srv.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#ff5757]">
                      {formatDZD(srv.price)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Actif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.slice(0, gridLimit).map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                        pkg.type === 'aq8'
                          ? 'bg-[#ff5757]/10 text-[#ff5757]'
                          : pkg.type === 'wonder'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-slate-200/80 text-slate-700'
                      }`}>
                        {pkg.type === 'aq8' ? '⚡ AQ8' : pkg.type === 'wonder' ? '✨ Wonder' : '🔀 Mix'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono font-semibold">
                        <Layers className="h-3 w-3" />
                        {pkg.sessionsCount} séances
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 font-display text-sm leading-tight">{pkg.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{pkg.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#353535]">
                      {formatDZD(pkg.price)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Actif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Afficher plus */}
          {currentData.length > gridLimit && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setGridLimit(g => g + 4)}
                className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
              >
                Afficher plus ({currentData.length - gridLimit} restant{currentData.length - gridLimit > 1 ? 's' : ''})
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && currentData.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-4">
                      {activeSection === 'services' ? 'Prestation' : 'Forfait'}
                    </th>
                    <th className="p-4">Technologie</th>
                    <th className="p-4">
                      {activeSection === 'services' ? 'Durée' : 'Séances'}
                    </th>
                    <th className="p-4 text-right">Tarif Centre</th>
                    <th className="p-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentData
                    .slice((listPage - 1) * PAGE_SIZE, listPage * PAGE_SIZE)
                    .map(item => {
                      const isSrv = activeSection === 'services';
                      const srv = item as Service;
                      const pkg = item as Package;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-[#353535]">{item.name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[260px]">{item.description}</div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              item.type === 'aq8'
                                ? 'bg-[#ff5757]/10 text-[#ff5757]'
                                : item.type === 'wonder'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-slate-200/80 text-slate-700'
                            }`}>
                              {item.type === 'aq8' ? 'AQ8 EMS' : item.type === 'wonder' ? 'Wonder' : 'Mixte'}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-semibold text-slate-700">
                            {isSrv ? `${srv.duration} min` : `${pkg.sessionsCount} séances`}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-[#353535]">
                            {formatDZD(item.price)}
                          </td>
                          <td className="p-4 text-center">
                            <span className="flex items-center justify-center gap-1 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full w-fit mx-auto">
                              <CheckCircle2 className="h-3 w-3" /> Actif
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/50 text-xs font-bold text-slate-600">
              <button
                type="button"
                disabled={listPage === 1}
                onClick={() => setListPage(p => p - 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Précédent
              </button>
              <span>Page {listPage} sur {totalPages}</span>
              <button
                type="button"
                disabled={listPage === totalPages}
                onClick={() => setListPage(p => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
