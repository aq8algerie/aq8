/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  Clock,
  Layers,
  Activity,
  Package2,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  RotateCcw,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import { Service, Package, Center } from '../../types';
import { CrmActionResult } from '../../lib/crmTransactions';

interface ManagerServicesViewProps {
  centerServices?: Service[];
  centerPackages?: Package[];
  allServices?: Service[];
  allPackages?: Package[];
  currentCenter?: Center;
  onSaveCenterServicesAndPackages?: (updates: {
    customActiveServices?: string[];
    customActivePackages?: string[];
    customServicePrices?: Record<string, number>;
    customPackagePrices?: Record<string, number>;
  }) => Promise<CrmActionResult>;
}

export function ManagerServicesView({
  centerServices = [],
  centerPackages = [],
  allServices = [],
  allPackages = [],
  currentCenter,
  onSaveCenterServicesAndPackages
}: ManagerServicesViewProps) {
  const [activeSection, setActiveSection] = useState<'services' | 'packages'>('services');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Derive available master lists
  const availableServices = allServices.length > 0 ? allServices : centerServices;
  const availablePackages = allPackages.length > 0 ? allPackages : centerPackages;

  // Active state lists
  const [activeServiceIds, setActiveServiceIds] = useState<string[]>([]);
  const [activePackageIds, setActivePackageIds] = useState<string[]>([]);

  // Custom price maps (ID -> Price in DZD)
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});

  // Editing price state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  // Initialize or re-sync states when currentCenter changes
  useEffect(() => {
    if (currentCenter) {
      // Services active list
      if (currentCenter.customActiveServices && currentCenter.customActiveServices.length > 0) {
        setActiveServiceIds(currentCenter.customActiveServices);
      } else {
        const defaultActiveSrvs = availableServices
          .filter(s => currentCenter.services?.includes(s.type as any))
          .map(s => s.id);
        setActiveServiceIds(defaultActiveSrvs.length > 0 ? defaultActiveSrvs : availableServices.map(s => s.id));
      }

      // Packages active list
      if (currentCenter.customActivePackages && currentCenter.customActivePackages.length > 0) {
        setActivePackageIds(currentCenter.customActivePackages);
      } else {
        const defaultActivePkgs = availablePackages
          .filter(p => {
            if (p.type === 'mix') {
              return currentCenter.services?.includes('aq8') && currentCenter.services?.includes('wonder');
            }
            return currentCenter.services?.includes(p.type as any);
          })
          .map(p => p.id);
        setActivePackageIds(defaultActivePkgs.length > 0 ? defaultActivePkgs : availablePackages.map(p => p.id));
      }

      // Custom price maps
      setServicePrices(currentCenter.customServicePrices || {});
      setPackagePrices(currentCenter.customPackagePrices || {});
    } else {
      setActiveServiceIds(availableServices.map(s => s.id));
      setActivePackageIds(availablePackages.map(p => p.id));
      setServicePrices({});
      setPackagePrices({});
    }
  }, [currentCenter, availableServices, availablePackages]);

  // Format DZD currency
  const formatDZD = (amount: number) =>
    amount > 0 ? `${amount.toLocaleString('fr-DZ')} DA` : '0 DA';

  // Toggle active service
  const toggleServiceActive = (id: string) => {
    setActiveServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle active package
  const togglePackageActive = (id: string) => {
    setActivePackageIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Start editing price
  const startEditingPrice = (id: string, currentPrice: number) => {
    setEditingItemId(id);
    setEditingPriceValue(String(currentPrice));
  };

  // Save price edit
  const savePriceEdit = (id: string, isService: boolean) => {
    const num = Math.max(0, Math.round(Number(editingPriceValue) || 0));
    if (isService) {
      setServicePrices(prev => ({ ...prev, [id]: num }));
    } else {
      setPackagePrices(prev => ({ ...prev, [id]: num }));
    }
    setEditingItemId(null);
  };

  // Reset custom price to catalog default
  const resetCustomPrice = (id: string, isService: boolean) => {
    if (isService) {
      setServicePrices(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } else {
      setPackagePrices(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  // Save all changes to backend
  const handleSaveAll = async () => {
    if (!onSaveCenterServicesAndPackages) return;
    setIsSaving(true);
    try {
      await onSaveCenterServicesAndPackages({
        customActiveServices: activeServiceIds,
        customActivePackages: activePackageIds,
        customServicePrices: servicePrices,
        customPackagePrices: packagePrices
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter lists by search query
  const filteredServices = availableServices.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPackages = availablePackages.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tag && p.tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="manager-services-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0284c7] animate-pulse" />
            <h3 className="font-bold font-display text-[#353535] text-lg">
              Prestations &amp; Forfaits — {currentCenter?.name || 'Gestion Centre'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Activez ou désactivez les offres et personnalisez la tarification officielle en DZD pour votre centre.
          </p>
        </div>

        {/* Global Save Button */}
        {onSaveCenterServicesAndPackages && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer le catalogue
              </>
            )}
          </button>
        )}
      </div>

      {/* Control Bar: Section Tabs & Search & View Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Section Toggle */}
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 w-full md:w-fit">
          <button
            type="button"
            onClick={() => setActiveSection('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'services'
                ? 'bg-white text-[#0284c7] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            Prestations ({activeServiceIds.length}/{availableServices.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('packages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'packages'
                ? 'bg-white text-[#353535] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package2 className="h-4 w-4" />
            Forfaits ({activePackageIds.length}/{availablePackages.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0284c7]"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#0284c7] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-[#0284c7] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vue Liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SERVICES TAB */}
      {activeSection === 'services' && (
        <div className="space-y-4">
          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-xs italic shadow-xs">
              Aucune prestation ne correspond à la recherche.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(srv => {
                const isActive = activeServiceIds.includes(srv.id);
                const customPrice = servicePrices[srv.id];
                const displayPrice = customPrice !== undefined ? customPrice : srv.price;
                const isCustom = customPrice !== undefined && customPrice !== srv.price;
                const isEditingThis = editingItemId === srv.id;

                return (
                  <div
                    key={srv.id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between space-y-4 transition-all relative ${
                      isActive
                        ? 'border-slate-200 hover:border-[#0284c7]/40 hover:shadow-md'
                        : 'border-slate-200/60 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                          srv.type === 'aq8'
                            ? 'bg-[#0284c7]/10 text-[#0284c7]'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {srv.type === 'aq8' ? '⚡ AQ8 EMS' : '✨ Wonder'}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleServiceActive(srv.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-200/80 text-slate-600 border border-slate-300/60'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-slate-400" /> Désactivé
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#353535] font-display text-base leading-tight">
                          {srv.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {srv.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-semibold">
                        <Clock className="h-3.5 w-3.5 text-[#0284c7]" />
                        {srv.duration} minutes encadrées
                      </div>
                    </div>

                    {/* Pricing Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="number"
                            value={editingPriceValue}
                            onChange={e => setEditingPriceValue(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-[#0284c7] rounded-lg font-mono font-bold text-[#353535] focus:outline-none"
                            placeholder="Tarif DZD"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => savePriceEdit(srv.id, true)}
                            className="p-1.5 bg-[#0284c7] text-white rounded-lg hover:bg-[#0369a1] cursor-pointer shrink-0"
                            title="Valider"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-sm text-[#353535]">
                                {formatDZD(displayPrice)}
                              </span>
                              {isCustom && (
                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                                  Tarif personnalisé
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isCustom ? `Catalogue : ${formatDZD(srv.price)}` : 'Tarif standard'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => resetCustomPrice(srv.id, true)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Rétablir tarif catalogue"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditingPrice(srv.id, displayPrice)}
                              className="p-1.5 text-[#0284c7] hover:bg-[#0284c7]/10 rounded-lg cursor-pointer transition-all"
                              title="Modifier le tarif"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW SERVICES */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Prestation</th>
                    <th className="p-4">Durée</th>
                    <th className="p-4 text-right">Tarif Centre</th>
                    <th className="p-4 text-center">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredServices.map(srv => {
                    const isActive = activeServiceIds.includes(srv.id);
                    const customPrice = servicePrices[srv.id];
                    const displayPrice = customPrice !== undefined ? customPrice : srv.price;
                    const isCustom = customPrice !== undefined && customPrice !== srv.price;
                    const isEditingThis = editingItemId === srv.id;

                    return (
                      <tr key={srv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#353535]">{srv.name}</div>
                          <div className="text-[10px] text-slate-400">{srv.description}</div>
                        </td>
                        <td className="p-4 font-mono font-semibold">
                          {srv.duration} min
                        </td>
                        <td className="p-4 text-right">
                          {isEditingThis ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editingPriceValue}
                                onChange={e => setEditingPriceValue(e.target.value)}
                                className="w-24 px-2 py-1 text-xs border border-[#0284c7] rounded-lg font-mono font-bold text-right"
                              />
                              <button
                                type="button"
                                onClick={() => savePriceEdit(srv.id, true)}
                                className="p-1 bg-[#0284c7] text-white rounded cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-bold text-[#353535]">
                                {formatDZD(displayPrice)}
                              </span>
                              {isCustom && (
                                <span className="block text-[9px] text-amber-600 font-medium">Personnalisé</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleServiceActive(srv.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Actif' : 'Désactivé'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => startEditingPrice(srv.id, displayPrice)}
                            className="p-1.5 text-[#0284c7] hover:bg-sky-50 rounded-lg cursor-pointer"
                            title="Modifier tarif"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PACKAGES TAB */}
      {activeSection === 'packages' && (
        <div className="space-y-4">
          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-xs italic shadow-xs">
              Aucun forfait ne correspond à la recherche.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPackages.map(pkg => {
                const isActive = activePackageIds.includes(pkg.id);
                const customPrice = packagePrices[pkg.id];
                const displayPrice = customPrice !== undefined ? customPrice : pkg.price;
                const isCustom = customPrice !== undefined && customPrice !== pkg.price;
                const isEditingThis = editingItemId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between space-y-4 transition-all relative overflow-hidden ${
                      isActive
                        ? 'border-slate-200 hover:border-[#0284c7]/40 hover:shadow-md'
                        : 'border-slate-200/60 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${
                            pkg.type === 'aq8'
                              ? 'bg-[#0284c7]/10 text-[#0284c7]'
                              : pkg.type === 'wonder'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {pkg.type === 'aq8' ? '⚡ AQ8' : pkg.type === 'wonder' ? '✨ Wonder' : '🔀 Mix'}
                          </span>
                          {pkg.tag && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                              {pkg.tag}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => togglePackageActive(pkg.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-200/80 text-slate-600 border border-slate-300/60'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-slate-400" /> Désactivé
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#353535] font-display text-base leading-tight">
                          {pkg.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>

                      {/* Sessions Breakdown Badges */}
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold pt-1">
                        {pkg.aq8Sessions ? (
                          <span className="bg-sky-50 text-[#0284c7] border border-sky-100 px-2 py-0.5 rounded-md">
                            {pkg.aq8Sessions} séance{pkg.aq8Sessions > 1 ? 's' : ''} AQ8
                          </span>
                        ) : null}
                        {pkg.wonderSessions ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md">
                            {pkg.wonderSessions} séance{pkg.wonderSessions > 1 ? 's' : ''} Wonder
                          </span>
                        ) : null}
                      </div>

                      {pkg.details && pkg.details.length > 0 && (
                        <ul className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                          {pkg.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#0284c7] font-bold shrink-0">✓</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Pricing Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="number"
                            value={editingPriceValue}
                            onChange={e => setEditingPriceValue(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-[#0284c7] rounded-lg font-mono font-bold text-[#353535] focus:outline-none"
                            placeholder="Tarif DZD"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => savePriceEdit(pkg.id, false)}
                            className="p-1.5 bg-[#0284c7] text-white rounded-lg hover:bg-[#0369a1] cursor-pointer shrink-0"
                            title="Valider"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-base text-[#353535]">
                                {formatDZD(displayPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">/ pack</span>
                            </div>
                            {isCustom && (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                                Tarif personnalisé (Catalogue : {formatDZD(pkg.price)})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => resetCustomPrice(pkg.id, false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Rétablir tarif catalogue"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditingPrice(pkg.id, displayPrice)}
                              className="p-1.5 text-[#0284c7] hover:bg-[#0284c7]/10 rounded-lg cursor-pointer transition-all"
                              title="Modifier le tarif"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW PACKAGES */
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Forfait</th>
                    <th className="p-4">Composition</th>
                    <th className="p-4 text-right">Tarif Centre</th>
                    <th className="p-4 text-center">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPackages.map(pkg => {
                    const isActive = activePackageIds.includes(pkg.id);
                    const customPrice = packagePrices[pkg.id];
                    const displayPrice = customPrice !== undefined ? customPrice : pkg.price;
                    const isCustom = customPrice !== undefined && customPrice !== pkg.price;
                    const isEditingThis = editingItemId === pkg.id;

                    return (
                      <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#353535] flex items-center gap-2">
                            {pkg.name}
                            {pkg.tag && (
                              <span className="text-[9px] bg-slate-900 text-white px-2 py-0.3 rounded-full font-bold uppercase">
                                {pkg.tag}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{pkg.description}</div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-[#0284c7]">
                          {pkg.aq8Sessions ? `${pkg.aq8Sessions} AQ8` : ''}
                          {pkg.aq8Sessions && pkg.wonderSessions ? ' + ' : ''}
                          {pkg.wonderSessions ? `${pkg.wonderSessions} Wonder` : ''}
                        </td>
                        <td className="p-4 text-right">
                          {isEditingThis ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editingPriceValue}
                                onChange={e => setEditingPriceValue(e.target.value)}
                                className="w-24 px-2 py-1 text-xs border border-[#0284c7] rounded-lg font-mono font-bold text-right"
                              />
                              <button
                                type="button"
                                onClick={() => savePriceEdit(pkg.id, false)}
                                className="p-1 bg-[#0284c7] text-white rounded cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-bold text-[#353535]">
                                {formatDZD(displayPrice)}
                              </span>
                              {isCustom && (
                                <span className="block text-[9px] text-amber-600 font-medium">Personnalisé</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePackageActive(pkg.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Actif' : 'Désactivé'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => startEditingPrice(pkg.id, displayPrice)}
                            className="p-1.5 text-[#0284c7] hover:bg-sky-50 rounded-lg cursor-pointer"
                            title="Modifier tarif"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
