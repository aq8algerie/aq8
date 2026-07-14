import { useState } from 'react';
import { Briefcase, Clock, Edit2, LayoutGrid, List, Mail, MapPin, Phone, Plus, Sliders, Trash2 } from 'lucide-react';
import { Center, Client } from '../../types';

type CentersManagementProps = {
  centers: Center[];
  clients: Client[];
  onAddCenter: () => void;
  onEditCenter: (center: Center) => void;
  onDeleteCenter: (centerId: string) => void;
};

export function CentersManagement({
  centers,
  clients,
  onAddCenter,
  onEditCenter,
  onDeleteCenter
}: CentersManagementProps) {
  const [centersViewMode, setCentersViewMode] = useState<'grid' | 'list'>('grid');
  const [gridLimit, setGridLimit] = useState<number>(3);
  const [listPage, setListPage] = useState<number>(1);

  return (
    <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold font-display text-slate-800 text-base">Réseau des Centres AQ8 ({centers.length})</h3>
              <p className="text-[10px] text-slate-400">Gérez les implantations géographiques et le statut des établissements.</p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setCentersViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    centersViewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCentersViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    centersViewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Liste"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Nouveau Centre Button */}
              <button
                type="button"
                onClick={() => onAddCenter()}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Nouveau Centre
              </button>
            </div>
          </div>

          {/* VIEW: GRID MODE (Default) */}
          {centersViewMode === 'grid' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {centers.slice(0, gridLimit).map(center => {
                  const clientCount = clients.filter(c => c.centerId === center.id).length;
                  const statusColors: Record<string, string> = {
                    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
                    construction: 'bg-blue-50 text-blue-700 border-blue-100'
                  };
                  const statusLabel: Record<string, string> = {
                    active: 'Opérationnel',
                    maintenance: 'En Maintenance',
                    construction: 'En Construction'
                  };

                  return (
                    <div key={center.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col group">
                      {/* Image Header with Badge */}
                      <div className="h-40 relative bg-slate-100 overflow-hidden">
                        <img
                          src={center.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'}
                          alt={center.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'; }}
                        />
                        <span className={`absolute top-3 left-3 border text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[center.status || 'active']}`}>
                          {statusLabel[center.status || 'active']}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-[#353535]">{center.name}</h4>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px]">{center.city}</span>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-2">{center.description || 'Aucune description disponible.'}</p>

                          <div className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{center.address}</span></div>
                            <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {center.phone}</div>
                            <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {center.email}</div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-50">
                          {/* Services */}
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Services</span>
                            <div className="flex gap-1">
                              {center.services.map(s => (
                                <span key={s} className={`px-1.5 py-0.5 rounded-sm uppercase ${s === 'aq8' ? 'bg-[#ff5757]/10 text-[#ff5757]' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Member count */}
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Membres</span>
                            <span className="font-mono text-slate-700">{clientCount} adhérents</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => onEditCenter(center)}
                              className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-[10px] border border-slate-150 transition-premium cursor-pointer text-center"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCenter(center.id)}
                              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-[10px] border border-red-100 transition-premium cursor-pointer text-center"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid "Voir Plus" Button */}
              {centers.length > gridLimit && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setGridLimit(gridLimit + 3)}
                    className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
                  >
                    Afficher plus de centres ({centers.length - gridLimit} restants)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: LIST/TABLE MODE WITH PAGINATION */}
          {centersViewMode === 'list' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                      <tr>
                        <th className="p-4">Centre</th>
                        <th className="p-4">Ville</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Prestations</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(() => {
                        const pageSize = 4;
                        const startIndex = (listPage - 1) * pageSize;
                        const pageData = centers.slice(startIndex, startIndex + pageSize);

                        return (
                          <>
                            {pageData.map(center => {
                              const statusLabel: Record<string, string> = {
                                active: 'Opérationnel',
                                maintenance: 'Maintenance',
                                construction: 'En Construction'
                              };
                              const statusClass: Record<string, string> = {
                                active: 'bg-emerald-50 text-emerald-700',
                                maintenance: 'bg-amber-50 text-amber-700',
                                construction: 'bg-blue-50 text-blue-700'
                              };

                              return (
                                <tr key={center.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-[#353535]">{center.name}</td>
                                  <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px]">{center.city}</span>
                                  </td>
                                  <td className="p-4 space-y-0.5 text-[11px]">
                                    <div className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3 shrink-0" /> {center.phone}</div>
                                    <div className="flex items-center gap-1 text-slate-500"><Mail className="h-3 w-3 shrink-0" /> {center.email}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-1">
                                      {center.services.map(s => (
                                        <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${s === 'aq8' ? 'bg-[#ff5757]/15 text-[#ff5757]' : 'bg-amber-500/15 text-amber-600'}`}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusClass[center.status || 'active']}`}>
                                      {statusLabel[center.status || 'active']}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => onEditCenter(center)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-premium cursor-pointer"
                                        title="Modifier"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteCenter(center.id)}
                                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-premium cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* List Pagination Controls */}
              {(() => {
                const pageSize = 4;
                const totalPages = Math.ceil(centers.length / pageSize);
                if (totalPages <= 1) return null;

                return (
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      disabled={listPage === 1}
                      onClick={() => setListPage(listPage - 1)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      Précédent
                    </button>
                    <span>Page {listPage} sur {totalPages}</span>
                    <button
                      type="button"
                      disabled={listPage === totalPages}
                      onClick={() => setListPage(listPage + 1)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      Suivant
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
  );
}