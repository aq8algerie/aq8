import React, { useState } from 'react';
import { ShieldCheck, Search, Download, RotateCcw, Activity, DollarSign, Calendar, Users, Sliders } from 'lucide-react';
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
    const act = (action || '').toUpperCase();
    if (act.includes('CLIENT') || act.includes('MEASUREMENT')) return 'client';
    if (act.includes('APPOINTMENT')) return 'appointment';
    if (act.includes('PAYMENT') || act.includes('PACKAGE')) return 'payment';
    if (act.includes('BOOKING_REQUEST')) return 'booking';
    return 'security';
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !searchLower ||
      (log.userName || '').toLowerCase().includes(searchLower) ||
      (log.details || '').toLowerCase().includes(searchLower) ||
      (log.action || '').toLowerCase().includes(searchLower) ||
      (log.centerName || '').toLowerCase().includes(searchLower);
    
    // Center filter
    const matchesCenter = !centerId || log.centerId === centerId;

    // Action Category filter
    const category = getActionCategory(log.action || '');
    const matchesCategory = !actionCategory || category === actionCategory;

    // Date filter
    const matchesDate = !dateFilter || (log.timestamp || '').startsWith(dateFilter);

    return matchesSearch && matchesCenter && matchesCategory && matchesDate;
  });

  const hasActiveFilters = Boolean(search || centerId || actionCategory || dateFilter);

  const resetFilters = () => {
    setSearch('');
    setCenterId('');
    setActionCategory('');
    setDateFilter('');
  };

  // CSV Export functionality
  const exportToCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Date & Heure', 'Utilisateur', 'Role', 'Action', 'Description', 'Centre'];
    const rows = filteredLogs.map(log => {
      const dateObj = new Date(log.timestamp);
      const formattedDate = isNaN(dateObj.getTime())
        ? log.timestamp
        : `${dateObj.toLocaleDateString('fr-FR')} ${dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      const roleLabel = log.role === 'super_admin' ? 'Super Admin' : 'Manager Centre';
      const centerName = log.centerName || 'Système Global';

      return [
        `"${formattedDate}"`,
        `"${(log.userName || '').replace(/"/g, '""')}"`,
        `"${roleLabel}"`,
        `"${(log.action || '').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        `"${centerName.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `journal_audit_aq8_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summary Metrics
  const totalCount = filteredLogs.length;
  const paymentLogsCount = filteredLogs.filter(l => getActionCategory(l.action) === 'payment').length;
  const appointmentLogsCount = filteredLogs.filter(l => getActionCategory(l.action) === 'appointment').length;
  const clientLogsCount = filteredLogs.filter(l => getActionCategory(l.action) === 'client').length;
  const securityLogsCount = filteredLogs.filter(l => getActionCategory(l.action) === 'security' || getActionCategory(l.action) === 'booking').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ff5757]" />
            Journal d'Audit & Sécurité CRM
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Historique et traçabilité en temps réel de toutes les opérations effectuées sur le réseau AQ8 Algérie.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportToCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter CSV ({filteredLogs.length})
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-[#ff5757] bg-[#ff5757]/10 px-3 py-2 rounded-xl">
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Flux temps réel</span>
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Actions</span>
            <Activity className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <p className="text-lg font-black text-slate-800 font-mono mt-1">{totalCount}</p>
        </div>

        <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Paiements</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-emerald-700 font-mono mt-1">{paymentLogsCount}</p>
        </div>

        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
          <div className="flex items-center justify-between text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Séances & RDV</span>
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <p className="text-lg font-black text-indigo-700 font-mono mt-1">{appointmentLogsCount}</p>
        </div>

        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
          <div className="flex items-center justify-between text-blue-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Adhérents</span>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-lg font-black text-blue-700 font-mono mt-1">{clientLogsCount}</p>
        </div>

        <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-600 text-[10px] font-bold uppercase tracking-wider">
            <span>Admin & Config</span>
            <Sliders className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-700 font-mono mt-1">{securityLogsCount}</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par gérant, détail, action..."
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
          <option value="">Tous les centres ({centers.length})</option>
          {centers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={actionCategory}
          onChange={(e) => setActionCategory(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50 cursor-pointer"
        >
          <option value="">Toutes les catégories d'actions</option>
          <option value="client">Fiches Clients & Mensurations</option>
          <option value="appointment">Planning & Séances CRM</option>
          <option value="payment">Forfaits & Caisse (Paiements)</option>
          <option value="booking">Demandes en Ligne (Site Web)</option>
          <option value="security">Administration & Configuration</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ff5757] text-slate-700 bg-slate-50/50 cursor-pointer"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              title="Réinitialiser les filtres"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* LOGS TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="h-8 w-8 border-4 border-slate-100 border-t-[#ff5757] rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 font-semibold">Chargement du journal d'audit...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
          <ShieldCheck className="h-10 w-10 text-slate-300" />
          <div className="text-center">
            <h5 className="font-bold text-slate-700 text-sm">Aucun événement d'audit trouvé</h5>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ajustez vos critères de recherche ou réinitialisez les filtres.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Utilisateur / Rôle</th>
                <th className="py-3 px-4">Type d'Action</th>
                <th className="py-3 px-4">Détails de l'Opération</th>
                <th className="py-3 px-4">Établissement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const category = getActionCategory(log.action || '');
                let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                let actionLabel = log.action;

                const act = (log.action || '').toUpperCase();
                if (act === 'CREATE_CLIENT') {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  actionLabel = 'Création Client';
                } else if (act === 'UPDATE_CLIENT') {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  actionLabel = 'Modif Client';
                } else if (act === 'SUSPEND_CLIENT') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  actionLabel = 'Client Suspendu';
                } else if (act === 'REACTIVATE_CLIENT') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  actionLabel = 'Client Réactivé';
                } else if (act === 'RECORD_MEASUREMENTS') {
                  badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                  actionLabel = 'Mensurations';
                } else if (act === 'CREATE_APPOINTMENT') {
                  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  actionLabel = 'RDV Planifié';
                } else if (act === 'COMPLETE_APPOINTMENT') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  actionLabel = 'Séance Validée';
                } else if (act === 'CANCEL_APPOINTMENT') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  actionLabel = 'RDV Annulé';
                } else if (act === 'UPDATE_APPOINTMENT') {
                  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  actionLabel = 'RDV Modifié';
                } else if (act === 'DELETE_APPOINTMENT') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  actionLabel = 'RDV Supprimé';
                } else if (act === 'RECORD_PAYMENT') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  actionLabel = 'Encaissement Caisse';
                } else if (act === 'DELETE_PAYMENT') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  actionLabel = 'Encaissement Supprimé';
                } else if (act === 'ASSIGN_PACKAGE') {
                  badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                  actionLabel = 'Forfait Affecté';
                } else if (act === 'ACCEPT_BOOKING_REQUEST') {
                  badgeColor = 'bg-violet-50 text-violet-700 border-violet-200';
                  actionLabel = 'Résa Ligne Acceptée';
                } else if (act === 'REJECT_BOOKING_REQUEST') {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  actionLabel = 'Résa Ligne Refusée';
                } else if (category === 'security') {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  actionLabel = act.startsWith('CREATE_') ? 'Nouveau Module Admin' : act.startsWith('DELETE_') ? 'Suppression Admin' : 'Admin & Config';
                }

                // Format Time
                const dateObj = new Date(log.timestamp);
                const formattedDate = isNaN(dateObj.getTime())
                  ? log.timestamp
                  : `${dateObj.toLocaleDateString('fr-FR')} à ${dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px] font-medium">
                      {formattedDate}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{log.userName || 'Anonyme'}</div>
                      <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                        {log.role === 'super_admin' ? (
                          <span className="text-purple-600">Super Admin</span>
                        ) : (
                          <span>Manager Centre</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-[9px] border uppercase tracking-wider ${badgeColor}`}>
                        {actionLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium max-w-xs sm:max-w-md break-words" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-[10px]">
                        {log.centerName || 'Système Global'}
                      </span>
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
