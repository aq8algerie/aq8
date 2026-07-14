/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Plus, Eye, LayoutGrid, List, User, Venus, Mars, Calendar, Award } from 'lucide-react';
import { Client, ClientPackage } from '../../types';

interface ManagerClientsViewProps {
  centerId: string;
  clients: Client[];
  clientPackages: ClientPackage[];
  onSelectClient: (clientId: string) => void;
  onRegisterClientClick: () => void;
}

export function ManagerClientsView({
  centerId,
  clients,
  clientPackages,
  onSelectClient,
  onRegisterClientClick
}: ManagerClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridLimit, setGridLimit] = useState(3);
  const [listPage, setListPage] = useState(1);

  // Filters state
  const [genderFilter, setGenderFilter] = useState<'all' | 'H' | 'F'>('all');
  const [subFilter, setSubFilter] = useState<'all' | 'has_active' | 'no_active'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'this_year'>('all');

  const centerClients = clients.filter(c => c.centerId === centerId);

  const safeText = (value: unknown) => String(value ?? '').trim();
  const getClientDisplayName = (client: Client) => {
    const fullName = [safeText(client.firstName), safeText(client.lastName)].filter(Boolean).join(' ');
    return fullName || safeText(client.phone) || safeText(client.email) || 'Client sans nom';
  };
  const getClientInitials = (client: Client) => {
    const first = safeText(client.firstName).charAt(0);
    const last = safeText(client.lastName).charAt(0);
    const fallback = getClientDisplayName(client).charAt(0);
    return `${first}${last || (!first ? fallback : '')}`.toUpperCase() || 'C';
  };

  // Apply filters
  const filteredClients = centerClients.filter(c => {
    // 1. Search Query
    const fullName = getClientDisplayName(c).toLowerCase();
    const query = searchQuery.toLowerCase();
    const phone = safeText(c.phone).toLowerCase();
    const email = safeText(c.email).toLowerCase();
    const matchesSearch = fullName.includes(query) || phone.includes(query) || email.includes(query);
    if (!matchesSearch) return false;

    // 2. Gender Filter
    if (genderFilter !== 'all' && c.gender !== genderFilter) return false;

    // 3. Subscription status
    if (subFilter !== 'all') {
      const hasActive = clientPackages.some(cp => cp.clientId === c.id && cp.status === 'active' && cp.centerId === centerId);
      if (subFilter === 'has_active' && !hasActive) return false;
      if (subFilter === 'no_active' && hasActive) return false;
    }

    // 4. Period filter
    if (periodFilter !== 'all') {
      const createdDate = new Date(c.createdAt);
      const now = new Date();
      if (periodFilter === 'this_month') {
        const isThisMonth = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return false;
      } else if (periodFilter === 'this_year') {
        const isThisYear = createdDate.getFullYear() === now.getFullYear();
        if (!isThisYear) return false;
      }
    }

    return true;
  });

  return (
    <div id="manager-clients-view" className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold font-display text-slate-800 text-base">
            Fichier Clients Adhérents ({centerClients.length})
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Recherchez et gérez les fiches de vos membres.</p>
        </div>
        
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Register Button */}
          <button
            id="btn-register-client"
            onClick={onRegisterClientClick}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Enregistrer un Client
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:border-[#ff5757]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            id="client-list-search"
            type="text"
            placeholder="Rechercher par prénom, nom, e-mail ou téléphone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setListPage(1); // Reset page on filter change
            }}
            className="w-full text-xs bg-transparent focus:outline-none text-slate-800"
          />
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Gender */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Genre</label>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value as any);
                setListPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none text-slate-700 text-[11px]"
            >
              <option value="all">Tous les genres</option>
              <option value="H">Homme</option>
              <option value="F">Femme</option>
            </select>
          </div>

          {/* Subscription */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abonnement</label>
            <select
              value={subFilter}
              onChange={(e) => {
                setSubFilter(e.target.value as any);
                setListPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none text-slate-700 text-[11px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="has_active">Avec abonnement actif</option>
              <option value="no_active">Sans abonnement actif</option>
            </select>
          </div>

          {/* Period */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Période d'inscription</label>
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value as any);
                setListPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none text-slate-700 text-[11px]"
            >
              <option value="all">Toutes les périodes</option>
              <option value="this_month">Ce mois-ci</option>
              <option value="this_year">Cette année</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW: GRID MODE (Default) */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.slice(0, gridLimit).map(client => {
              const activePkg = clientPackages.find(cp => cp.clientId === client.id && cp.status === 'active' && cp.centerId === centerId);
              const initials = getClientInitials(client);
              const displayName = getClientDisplayName(client);
              
              const isFemale = client.gender === 'F';
              const genderColor = isFemale 
                ? 'from-rose-400 to-pink-500 shadow-rose-100 text-white' 
                : 'from-blue-400 to-indigo-500 shadow-indigo-100 text-white';

              return (
                <div key={client.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold font-display shadow-md uppercase relative shrink-0 ${genderColor}`}>
                        {initials}
                        <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-slate-100 shadow-xs">
                          {isFemale ? (
                            <Venus className="h-2.5 w-2.5 text-pink-500" />
                          ) : (
                            <Mars className="h-2.5 w-2.5 text-blue-500" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-[#353535] truncate">{displayName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{safeText(client.phone) || '-'}</span>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-2 pt-3 border-t border-slate-50 text-[11px] text-slate-600">
                      {client.email && (
                        <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate font-mono">{client.email}</span></div>
                      )}
                      <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Membre depuis : {client.createdAt}</div>
                      
                      <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {activePkg ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[9px] border border-emerald-100">
                            Abonnement actif ({activePkg.sessionsRemaining} s. rest)
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-bold text-[9px] border border-slate-150">
                            Sans abonnement actif
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectClient(client.id)}
                    className="w-full py-2 bg-slate-50 hover:bg-[#353535] text-slate-700 hover:text-white font-bold rounded-xl text-center text-[10px] border border-slate-150 transition-premium cursor-pointer"
                  >
                    Voir la Fiche Client
                  </button>
                </div>
              );
            })}
          </div>

          {/* Voir plus Button */}
          {filteredClients.length > gridLimit && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setGridLimit(gridLimit + 3)}
                className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
              >
                Voir plus de clients ({filteredClients.length - gridLimit} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW: LIST MODE WITH PAGINATION */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Adhérent</th>
                    <th className="p-4">Genre</th>
                    <th className="p-4">Téléphone</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Créé le</th>
                    <th className="p-4">Abonnement</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(() => {
                    const pageSize = 4;
                    const startIndex = (listPage - 1) * pageSize;
                    const pageData = filteredClients.slice(startIndex, startIndex + pageSize);

                    return (
                      <>
                        {pageData.length > 0 ? (
                          pageData.map(client => {
                            const activePkg = clientPackages.find(cp => cp.clientId === client.id && cp.status === 'active' && cp.centerId === centerId);
                            return (
                              <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-bold text-[#353535]">{getClientDisplayName(client)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    client.gender === 'F' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {client.gender === 'F' ? 'Femme' : 'Homme'}
                                  </span>
                                </td>
                                <td className="p-4 font-mono">{safeText(client.phone) || '-'}</td>
                                <td className="p-4 font-mono text-slate-500">{safeText(client.email) || '-'}</td>
                                <td className="p-4 text-slate-500">{safeText(client.createdAt) || '-'}</td>
                                <td className="p-4">
                                  {activePkg ? (
                                    <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[9px] font-bold border border-green-100">
                                      Actif ({activePkg.sessionsRemaining} s. rest)
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-slate-200">
                                      Sans forfait
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => onSelectClient(client.id)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-[#353535] hover:text-white rounded-lg text-[10px] font-semibold text-slate-700 transition-premium inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="h-3 w-3" /> Fiche
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                              Aucun client ne correspond à vos filtres.
                            </td>
                          </tr>
                        )}
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
            const totalPages = Math.ceil(filteredClients.length / pageSize);
            if (totalPages <= 1) return null;

            return (
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600 animate-fade-in">
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
