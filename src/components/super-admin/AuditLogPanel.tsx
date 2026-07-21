import React, { useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { Center } from '../../types';

export function AuditLogPanel({
  centers,
  logs,
  loading
}: {
  centers: Center[];
  logs: any[];
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [centerId, setCenterId] = useState('');
  const [actionCategory, setActionCategory] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Categories helper
  const getActionCategory = (action: string): string => {
    if (action.includes('CLIENT')) return 'client';
    if (action.includes('APPOINTMENT')) return 'appointment';
    if (action.includes('PAYMENT') || action.includes('PACKAGE')) return 'payment';
    if (action.includes('BOOKING_REQUEST')) return 'booking';
    return 'security';
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (log.userName || '').toLowerCase().includes(searchLower) ||
      (log.details || '').toLowerCase().includes(searchLower) ||
      (log.action || '').toLowerCase().includes(searchLower);
    
    // Center filter
    const matchesCenter = !centerId || log.centerId === centerId;

    // Action Category filter
    const category = getActionCategory(log.action || '');
    const matchesCategory = !actionCategory || category === actionCategory;

    // Date filter
    const matchesDate = !dateFilter || (log.timestamp || '').startsWith(dateFilter);

    return matchesSearch && matchesCenter && matchesCategory && matchesDate;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ff5757]" />
            Journal d'Audit & Sécurité
          </h3>
          <p className="text-xs text-slate-400">Historique en temps réel des actions effectuées par les managers de centres et les administrateurs.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#ff5757] bg-[#ff5757]/10 px-3 py-1.5 rounded-xl self-start">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span>Flux d'activités synchrone</span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un gérant, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50"
          />
        </div>

        <select
          value={centerId}
          onChange={(e) => setCenterId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50 cursor-pointer"
        >
          <option value="">Tous les centres</option>
          {centers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={actionCategory}
          onChange={(e) => setActionCategory(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50 cursor-pointer"
        >
          <option value="">Toutes les catégories</option>
          <option value="client">Fiches Clients & Adhérents</option>
          <option value="appointment">Planning & Réservations CRM</option>
          <option value="payment">Forfaits & Paiements (Caisse)</option>
          <option value="booking">Demandes publiques (Site Web)</option>
          <option value="security">Configuration & Sécurité</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50 cursor-pointer"
        />
      </div>

      {/* LOGS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-8 w-8 border-4 border-slate-100 border-t-[#ff5757] rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold">Chargement des données d'audit...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
          <ShieldCheck className="h-10 w-10 text-slate-300" />
          <div className="text-center">
            <h5 className="font-bold text-slate-700 text-sm">Aucun log d'activité trouvé</h5>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ajustez vos critères de filtrage ou effectuez des actions d'administration pour générer des entrées.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold">
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Utilisateur / Rôle</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Centre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => {
                const category = getActionCategory(log.action || '');
                let badgeColor = 'bg-slate-100 text-slate-600';
                let actionLabel = log.action;

                if (category === 'client') {
                  badgeColor = 'bg-blue-50 text-blue-600 border border-blue-100';
                  actionLabel = log.action === 'CREATE_CLIENT' ? 'Création Client' : log.action === 'UPDATE_CLIENT' ? 'Modif Client' : 'Action Client';
                } else if (category === 'appointment') {
                  badgeColor = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                  actionLabel = log.action === 'CREATE_APPOINTMENT' ? 'Nouveau RDV' : log.action === 'COMPLETE_APPOINTMENT' ? 'Séance Validée' : 'Modif RDV';
                } else if (category === 'payment') {
                  badgeColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                  actionLabel = log.action === 'RECORD_PAYMENT' ? 'Encaissement' : 'Forfait Affecté';
                } else if (category === 'booking') {
                  badgeColor = 'bg-violet-50 text-violet-600 border border-violet-100';
                  actionLabel = log.action === 'ACCEPT_BOOKING_REQUEST' ? 'Résa Validée' : 'Résa Refusée';
                } else if (category === 'security') {
                  badgeColor = 'bg-amber-50 text-amber-600 border border-amber-100';
                  actionLabel = log.action?.startsWith('CREATE_') ? 'Nouveau Module' : 'Modif Sécurité';
                }

                // Format Time
                const dateObj = new Date(log.timestamp);
                const formattedDate = isNaN(dateObj.getTime())
                  ? log.timestamp
                  : `${dateObj.toLocaleDateString('fr-FR')} ${dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{formattedDate}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{log.role === 'super_admin' ? 'Super Admin' : 'Manager'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-wider ${badgeColor}`}>
                        {actionLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs sm:max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-500">{log.centerName || 'Système Global'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
