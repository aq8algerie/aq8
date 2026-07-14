import { useState } from 'react';
import { Building, Edit2, LayoutGrid, List, Plus, Trash2 } from 'lucide-react';
import { Center, CenterManager } from '../../types';

type ManagersManagementProps = {
  centers: Center[];
  managers: CenterManager[];
  onAddManager: () => void;
  onEditManager: (manager: CenterManager) => void;
  onDeleteManager: (email: string) => void;
  onToggleManagerActive: (email: string, active: boolean) => void;
};

export function ManagersManagement({
  centers,
  managers,
  onAddManager,
  onEditManager,
  onDeleteManager,
  onToggleManagerActive
}: ManagersManagementProps) {
  const [managersViewMode, setManagersViewMode] = useState<'grid' | 'list'>('grid');
  const [managersGridLimit, setManagersGridLimit] = useState<number>(3);
  const [managersListPage, setManagersListPage] = useState<number>(1);

  return (        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold font-display text-slate-800 text-base">Gérants de Centres & Accès CRM ({
                (() => {
                  const map: Record<string, boolean> = {};
                  managers.forEach(m => { map[m.email.toLowerCase().trim()] = true; });
                  return Object.keys(map).length;
                })()
              })</h3>
              <p className="text-[10px] text-slate-400 font-medium">Visualisez et configurez les droits d'accès des gérants de vos centres.</p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setManagersViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    managersViewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setManagersViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    managersViewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Liste"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Nouveau Manager Button */}
              <button
                type="button"
                onClick={() => onAddManager()}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Nouveau Manager
              </button>
            </div>
          </div>

          {/* Grouped Unique Managers list */}
          {(() => {
            const map: Record<string, {
              id: string;
              name: string;
              email: string;
              centersList: Array<{ id: string; name: string; city: string }>;
              active: boolean;
              rawManager: CenterManager;
            }> = {};

            managers.forEach(mgr => {
              const emailKey = mgr.email.toLowerCase().trim();
              const matchedCenter = centers.find(c => c.id === mgr.centerId);
              if (!map[emailKey]) {
                map[emailKey] = {
                  id: mgr.id,
                  name: mgr.name,
                  email: mgr.email,
                  centersList: [],
                  active: mgr.active,
                  rawManager: mgr
                };
              }
              if (matchedCenter) {
                map[emailKey].centersList.push({
                  id: matchedCenter.id,
                  name: matchedCenter.name,
                  city: matchedCenter.city
                });
              }
              // If at least one center assignment is active, keep active
              map[emailKey].active = map[emailKey].active || mgr.active;
            });

            const uniqueMgrs = Object.values(map);

            return (
              <>
                {/* GRID VIEW (Default) */}
                {managersViewMode === 'grid' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {uniqueMgrs.slice(0, managersGridLimit).map(mgr => {
                        const initial = mgr.name.trim().charAt(0).toUpperCase() || 'M';
                        return (
                          <div key={mgr.email} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
                            {/* Accent line on hover */}
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ff5757] to-amber-500 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>

                            <div className="space-y-3">
                              {/* Profile Header */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#353535] to-[#454545] text-white flex items-center justify-center font-bold font-display shadow-xs uppercase">
                                  {initial}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-[#353535]">{mgr.name}</h4>
                                  <span className="text-[10px] font-mono text-slate-400">{mgr.email}</span>
                                </div>
                              </div>

                              {/* Managed Centers List */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Centres Gérés</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {mgr.centersList.map(c => (
                                    <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-150">
                                      <Building className="h-3 w-3 text-[#ff5757]" />
                                      {c.name} ({c.city})
                                    </span>
                                  ))}
                                  {mgr.centersList.length === 0 && (
                                    <span className="text-slate-400 text-[10px] italic">Aucun centre affecté</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Footer Status & Actions */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                              <button
                                type="button"
                                onClick={() => onToggleManagerActive(mgr.email, mgr.active)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition border cursor-pointer ${
                                  mgr.active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${mgr.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {mgr.active ? 'Accès Actif' : 'Bloqué'}
                              </button>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onEditManager(mgr.rawManager)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteManager(mgr.email)}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-red-50 transition cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Voir Plus Button */}
                    {uniqueMgrs.length > managersGridLimit && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setManagersGridLimit(managersGridLimit + 3)}
                          className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
                        >
                          Afficher plus de gérants ({uniqueMgrs.length - managersGridLimit} restants)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* LIST VIEW (Table with pagination) */}
                {managersViewMode === 'list' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                            <tr>
                              <th className="p-4">Manager</th>
                              <th className="p-4">E-mail de Connexion</th>
                              <th className="p-4">Centres Affectés</th>
                              <th className="p-4">Statut d'Accès</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {(() => {
                              const pageSize = 4;
                              const startIndex = (managersListPage - 1) * pageSize;
                              const pageData = uniqueMgrs.slice(startIndex, startIndex + pageSize);

                              return (
                                <>
                                  {pageData.map(mgr => (
                                    <tr key={mgr.email} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-4 font-bold text-[#353535]">{mgr.name}</td>
                                      <td className="p-4 font-mono text-[11px] text-slate-500">{mgr.email}</td>
                                      <td className="p-4">
                                        <div className="flex gap-1 flex-wrap">
                                          {mgr.centersList.map(c => (
                                            <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-slate-150">
                                              {c.name}
                                            </span>
                                          ))}
                                          {mgr.centersList.length === 0 && (
                                            <span className="text-slate-400 text-[10px] italic">Non affecté</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <button
                                          type="button"
                                          onClick={() => onToggleManagerActive(mgr.email, mgr.active)}
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                                            mgr.active ? 'bg-green-50 text-green-600 border-green-150' : 'bg-slate-100 text-slate-400 border-slate-200'
                                          }`}
                                        >
                                          {mgr.active ? 'Actif' : 'Désactivé'}
                                        </button>
                                      </td>
                                      <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => onEditManager(mgr.rawManager)}
                                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-premium cursor-pointer"
                                            title="Modifier"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteManager(mgr.email)}
                                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-premium cursor-pointer"
                                            title="Supprimer"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {(() => {
                      const pageSize = 4;
                      const totalPages = Math.ceil(uniqueMgrs.length / pageSize);
                      if (totalPages <= 1) return null;

                      return (
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600">
                          <button
                            type="button"
                            disabled={managersListPage === 1}
                            onClick={() => setManagersListPage(managersListPage - 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          >
                            Précédent
                          </button>
                          <span>Page {managersListPage} sur {totalPages}</span>
                          <button
                            type="button"
                            disabled={managersListPage === totalPages}
                            onClick={() => setManagersListPage(managersListPage + 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          >
                            Suivant
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            );
          })()}
        </div>
  );
}