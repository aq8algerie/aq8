/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Grid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  XCircle,
  Trash2,
  CheckCircle2,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Filter,
  User,
  Activity,
  Layers,
  Sparkles,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Appointment, Service, ClientPackage, Package } from '../../types';
import { formatDateTime, getTodayDateString } from '../../lib/centerManagerUtils';
import { findActivePackageForClient, validateDeduction, deductSessionFromPackage } from '../../lib/packageRules';

interface ManagerBookingsViewProps {
  centerId: string;
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  clientPackages: ClientPackage[];
  packages: Package[];
  onCompleteAppointment: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUpdateClientPackages: (clientPackages: ClientPackage[]) => void;
  onBookAppointmentClick: () => void;
}

export function ManagerBookingsView({
  centerId,
  clients,
  appointments,
  services,
  clientPackages,
  packages,
  onCompleteAppointment,
  onCancelAppointment,
  onUpdateAppointments,
  onUpdateClientPackages,
  onBookAppointmentClick
}: ManagerBookingsViewProps) {
  // 1. Core State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'booked' | 'completed' | 'cancelled'>('All');
  const [serviceFilter, setServiceFilter] = useState<'All' | string>('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'today' | 'upcoming' | 'past' | 'thisWeek' | 'thisMonth'>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'H' | 'F' | 'unknown'>('All');
  const [technologyFilter, setTechnologyFilter] = useState<'All' | 'aq8' | 'wonder' | 'mix' | 'none'>('All');

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [viewingApt, setViewingApt] = useState<Appointment | null>(null);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  // Pagination (List view)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<20 | 50 | 100 | 200>(20);

  // Grid "Show More" limit
  const [gridLimit, setGridLimit] = useState(6);

  // Toast / internal action feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const safeText = (value: unknown) => String(value ?? '').trim();
  const getClientDisplayName = (client?: Client) => {
    if (!client) return 'Adhérent inconnu';
    const fullName = [safeText(client.firstName), safeText(client.lastName)].filter(Boolean).join(' ');
    return fullName || safeText(client.phone) || safeText(client.email) || 'Adhérent sans nom';
  };
  const getTechnologyForClient = (clientId: string) => {
    const active = findActivePackageForClient(clientId, clientPackages);
    if (!active) return null;
    const pkg = packages.find(p => p.id === active.packageId);
    return pkg ? pkg.type : null;
  };

  const getAppointmentDate = (appointment: Appointment) => {
    const date = new Date(safeText(appointment.dateTime).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const matchesDateFilter = (appointment: Appointment) => {
    if (dateFilter === 'All') return true;
    const date = getAppointmentDate(appointment);
    if (!date) return false;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (dateFilter === 'today') return date >= todayStart && date < tomorrowStart;
    if (dateFilter === 'upcoming') return date >= todayStart;
    if (dateFilter === 'past') return date < todayStart;
    if (dateFilter === 'thisWeek') return date >= weekStart && date < weekEnd;
    if (dateFilter === 'thisMonth') return date >= monthStart && date < nextMonthStart;
    return true;
  };

  // 2. Data Filtering and Sorting
  // Filter by Center and Sort: Most Recent to Oldest (dateTime descending)
  const centerClients = clients.filter(c => c.centerId === centerId);
  
  const sortedAppointments = [...appointments]
    .filter(a => a.centerId === centerId)
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  const filteredAppointments = sortedAppointments.filter(apt => {
    const cl = centerClients.find(c => c.id === apt.clientId);
    const clientFullName = getClientDisplayName(cl).toLowerCase();
    const clientPhone = safeText(cl?.phone).toLowerCase();
    const clientEmail = safeText(cl?.email).toLowerCase();
    const srv = services.find(s => s.id === apt.serviceId);
    const serviceName = safeText(srv?.name).toLowerCase();
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const tech = cl ? getTechnologyForClient(cl.id) : null;

    const matchesSearch =
      !normalizedSearch ||
      clientFullName.includes(normalizedSearch) ||
      clientPhone.includes(normalizedSearch) ||
      clientEmail.includes(normalizedSearch) ||
      serviceName.includes(normalizedSearch) ||
      safeText(apt.id).toLowerCase().includes(normalizedSearch) ||
      safeText(apt.notes).toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;
    const matchesService = serviceFilter === 'All' || apt.serviceId === serviceFilter;
    const matchesDate = matchesDateFilter(apt);
    const matchesGender = genderFilter === 'All' || (genderFilter === 'unknown' ? !cl?.gender : cl?.gender === genderFilter);
    const matchesTechnology = technologyFilter === 'All' || (technologyFilter === 'none' ? !tech : tech === technologyFilter);

    return matchesSearch && matchesStatus && matchesService && matchesDate && matchesGender && matchesTechnology;
  });

  // Pagination computation
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const normalizedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (normalizedCurrentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  const paginationPages = Array.from(new Set([
    1,
    totalPages,
    normalizedCurrentPage - 2,
    normalizedCurrentPage - 1,
    normalizedCurrentPage,
    normalizedCurrentPage + 1,
    normalizedCurrentPage + 2,
  ].filter(page => page >= 1 && page <= totalPages))).sort((a, b) => a - b);

  // Grid view items
  const gridAppointments = filteredAppointments.slice(0, gridLimit);
  const hasMoreGrid = filteredAppointments.length > gridLimit;

  // Reset page or limit on filter change
  React.useEffect(() => {
    setCurrentPage(1);
    setGridLimit(6);
  }, [searchQuery, statusFilter, serviceFilter, dateFilter, genderFilter, technologyFilter, itemsPerPage]);

  // 3. Selection Handlers
  const handleToggleSelectAll = () => {
    const currentPageIds = viewMode === 'list' 
      ? paginatedAppointments.map(a => a.id) 
      : gridAppointments.map(a => a.id);

    const allSelected = currentPageIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Deselect all items of the current page/view
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all items of the current page/view
      setSelectedIds(prev => {
        const union = [...prev, ...currentPageIds];
        return Array.from(new Set(union));
      });
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 4. Individual Actions
  const handleSingleComplete = (id: string) => {
    onCompleteAppointment(id);
    showToast('Séance validée avec succès !');
  };

  const handleSingleCancel = (id: string) => {
    onCancelAppointment(id);
    showToast('Séance annulée avec succès.');
  };

  const handleSingleDelete = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette réservation ?')) {
      const updated = appointments.filter(a => a.id !== id);
      onUpdateAppointments(updated);
      setSelectedIds(prev => prev.filter(x => x !== id));
      showToast('Réservation supprimée définitivement.');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;

    // Check if appointment is valid
    const selectedService = services.find(s => s.id === editingApt.serviceId);
    const updated = appointments.map(a => {
      if (a.id === editingApt.id) {
        return {
          ...editingApt,
          duration: selectedService ? selectedService.duration : 20
        };
      }
      return a;
    });

    onUpdateAppointments(updated);
    setEditingApt(null);
    showToast('Réservation mise à jour avec succès.');
  };

  // 5. Bulk Operations
  const handleBulkComplete = () => {
    const bookingsToComplete = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');
    
    if (bookingsToComplete.length === 0) {
      showToast('Aucun rendez-vous planifié éligible parmi les sélections.', 'error');
      return;
    }

    let tempClientPackages = [...clientPackages];
    let succeededCount = 0;
    let failedCount = 0;

    const updatedApts = appointments.map(apt => {
      if (selectedIds.includes(apt.id)) {
        if (apt.status !== 'booked') return apt;

        const cl = clients.find(c => c.id === apt.clientId);
        const activePkg = findActivePackageForClient(apt.clientId, tempClientPackages);
        
        const validation = validateDeduction(apt, cl, activePkg, centerId);

        if (validation.valid && activePkg) {
          const updatedPkg = deductSessionFromPackage(activePkg);
          tempClientPackages = tempClientPackages.map(cp => cp.id === activePkg.id ? updatedPkg : cp);
          succeededCount++;
          return { ...apt, status: 'completed' as const };
        } else {
          failedCount++;
          return apt; // leaves booked if invalid/no credits
        }
      }
      return apt;
    });

    onUpdateAppointments(updatedApts);
    onUpdateClientPackages(tempClientPackages);
    setSelectedIds([]);
    
    if (failedCount > 0) {
      showToast(`${succeededCount} validé(s), ${failedCount} échoué(s) (absence de forfait/crédits).`, 'error');
    } else {
      showToast(`${succeededCount} réservations validées et créditées en masse !`);
    }
  };

  const handleBulkCancel = () => {
    const bookingsToCancel = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');

    if (bookingsToCancel.length === 0) {
      showToast('Aucun rendez-vous planifié éligible à l’annulation.', 'error');
      return;
    }

    const updatedApts = appointments.map(apt => {
      if (selectedIds.includes(apt.id) && apt.status === 'booked') {
        return { ...apt, status: 'cancelled' as const };
      }
      return apt;
    });

    onUpdateAppointments(updatedApts);
    setSelectedIds([]);
    showToast(`${bookingsToCancel.length} séances annulées en masse.`);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Voulez-vous supprimer définitivement ces ${selectedIds.length} réservations ?`)) {
      const updated = appointments.filter(apt => !selectedIds.includes(apt.id));
      onUpdateAppointments(updated);
      setSelectedIds([]);
      showToast('Sélections supprimées définitivement.');
    }
  };

  return (
    <div id="manager-bookings-container" className="space-y-6">
      {/* Toast Alert Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold text-white flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-800'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Header with Filters and Layout Switching */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold font-display text-slate-800 text-base">Réseau de Réservations</h3>
            <p className="text-[11px] text-slate-400">Gérez le planning historique, trié du plus récent au plus ancien</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Buttons */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'list' ? 'bg-[#353535] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Liste"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'grid' ? 'bg-[#353535] text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Grille / Fiches"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            <button
              id="btn-bookings-new-rdv"
              onClick={onBookAppointmentClick}
              className="px-3.5 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl transition-premium text-xs flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" /> Nouveau RDV
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nom, téléphone, e-mail, soin, note ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs text-slate-700"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              <option value="All">Tous les statuts</option>
              <option value="booked">Planifiées</option>
              <option value="completed">Effectuées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              <option value="All">Toutes les prestations</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              <option value="All">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="upcoming">À venir</option>
              <option value="past">Historique</option>
              <option value="thisWeek">Cette semaine</option>
              <option value="thisMonth">Ce mois-ci</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              <option value="All">Tous les genres</option>
              <option value="F">Femmes</option>
              <option value="H">Hommes</option>
              <option value="unknown">Non renseigné</option>
            </select>
          </div>

          {/* Technology Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={technologyFilter}
              onChange={(e) => setTechnologyFilter(e.target.value as any)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              <option value="All">Toutes les technologies</option>
              <option value="aq8">AQ8 EMS</option>
              <option value="wonder">Wonder</option>
              <option value="mix">Mixte</option>
              <option value="none">Sans forfait actif</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2">
            <List className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value) as 20 | 50 | 100 | 200)}
              className="w-full py-2 bg-transparent focus:outline-none text-xs text-slate-700"
            >
              {[20, 50, 100, 200].map(size => (
                <option key={size} value={size}>{size} par page</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
              setServiceFilter('All');
              setDateFilter('All');
              setGenderFilter('All');
              setTechnologyFilter('All');
            }}
            className="px-3 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Réinitialiser filtres
          </button>
        </div>
      </div>

      {/* Bulk Action floating/sticky bar */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#353535] text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white/10 rounded-lg text-[#ff5757]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold">
              {selectedIds.length} réservation{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleBulkComplete}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Effectuer
            </button>
            <button
              onClick={handleBulkCancel}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" /> Annuler RDV
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
            <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 font-medium text-[10px] rounded-lg transition cursor-pointer"
            >
              Tout désélectionner
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Layout Area */}
      {viewMode === 'list' ? (
        /* --- LIST VIEW --- */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-[#ff5757] transition-colors cursor-pointer"
                    >
                      {(() => {
                        const pageIds = paginatedAppointments.map(a => a.id);
                        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
                        return allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />;
                      })()}
                    </button>
                  </th>
                  <th className="p-4">Adhérent</th>
                  <th className="p-4">Prestation</th>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Technologie</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedAppointments.length > 0 ? (
                  paginatedAppointments.map(apt => {
                    const cl = centerClients.find(c => c.id === apt.clientId);
                    const srv = services.find(s => s.id === apt.serviceId);
                    const isSelected = selectedIds.includes(apt.id);
                    const tech = cl ? getTechnologyForClient(cl.id) : null;

                    return (
                      <tr
                        key={apt.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isSelected ? 'bg-[#ff5757]/5' : ''
                        }`}
                      >
                        {/* Checkbox select */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(apt.id)}
                            className="text-slate-400 hover:text-[#ff5757] cursor-pointer"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4 text-[#ff5757]" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>

                        {/* Client details */}
                        <td className="p-4">
                          <div className="font-bold text-[#353535] flex items-center gap-1.5">
                            {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                            {cl?.gender === 'F' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Femme"></span>
                            ) : cl?.gender === 'H' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Homme"></span>
                            ) : null}
                          </div>
                          {cl && <span className="text-[10px] text-slate-400 font-mono">{cl.phone}</span>}
                        </td>

                        {/* Prestation */}
                        <td className="p-4 font-medium">{srv?.name || 'Prestation'}</td>

                        {/* Date & Hour */}
                        <td className="p-4 font-mono text-slate-500">
                          {formatDateTime(apt.dateTime)}
                        </td>

                        {/* Technology */}
                        <td className="p-4">
                          {tech ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tech === 'aq8'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : tech === 'wonder'
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                              {tech === 'aq8' ? 'AQ8 EMS' : tech === 'wonder' ? 'Wonder' : 'Mixte'}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">Aucun</span>
                          )}
                        </td>

                        {/* Status badge */}
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            apt.status === 'completed'
                              ? 'bg-green-50 text-green-600 border border-green-100'
                              : apt.status === 'booked'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => setViewingApt(apt)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-50 transition cursor-pointer"
                              title="Voir détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingApt(apt)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-50 transition cursor-pointer"
                              title="Modifier la réservation"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {apt.status === 'booked' && (
                              <>
                                <button
                                  onClick={() => handleSingleComplete(apt.id)}
                                  className="p-1 text-green-500 hover:text-green-700 rounded-md hover:bg-green-50 transition cursor-pointer"
                                  title="Valider la séance"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSingleCancel(apt.id)}
                                  className="p-1 text-amber-500 hover:text-amber-700 rounded-md hover:bg-amber-50 transition cursor-pointer"
                                  title="Annuler"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleSingleDelete(apt.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 transition cursor-pointer"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                      Aucune réservation ne correspond à vos filtres de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* List View Pagination controls */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-semibold">
              {totalItems > 0
                ? <>Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, totalItems)} sur {totalItems} réservations</>
                : <>Aucune réservation trouvée</>}
            </span>

            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={normalizedCurrentPage === 1}
                className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer text-[11px] font-bold"
              >
                Début
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={normalizedCurrentPage === 1}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {paginationPages.map((page, index) => {
                const previous = paginationPages[index - 1];
                const hasGap = previous !== undefined && page - previous > 1;
                return (
                  <React.Fragment key={page}>
                    {hasGap && <span className="px-1 text-slate-400 text-[11px]">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                        normalizedCurrentPage === page
                          ? 'bg-[#353535] text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={normalizedCurrentPage === totalPages}
                className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={normalizedCurrentPage === totalPages}
                className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer text-[11px] font-bold"
              >
                Fin
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* --- GRID VIEW WITH "AFFICHER PLUS" --- */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gridAppointments.length > 0 ? (
              gridAppointments.map(apt => {
                const cl = centerClients.find(c => c.id === apt.clientId);
                const srv = services.find(s => s.id === apt.serviceId);
                const isSelected = selectedIds.includes(apt.id);
                const tech = cl ? getTechnologyForClient(cl.id) : null;

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-2xl p-5 border transition-all relative ${
                      isSelected
                        ? 'border-[#ff5757] shadow-md ring-1 ring-[#ff5757]/30 bg-[#ff5757]/2'
                        : 'border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200'
                    }`}
                  >
                    {/* Top corner multi-select toggle */}
                    <button
                      onClick={() => handleToggleSelectOne(apt.id)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-[#ff5757] cursor-pointer"
                    >
                      {isSelected ? <CheckSquare className="h-5 w-5 text-[#ff5757]" /> : <Square className="h-5 w-5" />}
                    </button>

                    {/* Card Content */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${
                          cl?.gender === 'F' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                        }`}>
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{cl?.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-b border-slate-50 py-3 text-xs">
                        {/* Service & Duration */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Prestation:</span>
                          <span className="font-semibold text-slate-800">{srv?.name || 'Soin'}</span>
                        </div>

                        {/* Date & Time */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Date & Heure:</span>
                          <span className="font-semibold font-mono text-slate-700 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(apt.dateTime)}
                          </span>
                        </div>

                        {/* Tech Type */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Technologie:</span>
                          {tech ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tech === 'aq8'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : tech === 'wonder'
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                              {tech === 'aq8' ? 'AQ8 EMS' : tech === 'wonder' ? 'Wonder' : 'Mixte'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Aucune</span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions & Status Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'completed'
                            ? 'bg-green-50 text-green-600'
                            : apt.status === 'booked'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingApt(apt)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingApt(apt)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {apt.status === 'booked' && (
                            <>
                              <button
                                onClick={() => handleSingleComplete(apt.id)}
                                className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition cursor-pointer"
                                title="Valider"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSingleCancel(apt.id)}
                                className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                title="Annuler"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleSingleDelete(apt.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 italic text-xs">
                Aucune réservation ne correspond à vos critères de recherche.
              </div>
            )}
          </div>

          {/* "Afficher plus" grid loading more */}
          {hasMoreGrid && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setGridLimit(prev => prev + 6)}
                className="px-5 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                Afficher plus (+{filteredAppointments.length - gridLimit} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. DETAILS MODAL (Voir Réservation) */}
      {/* ========================================================= */}
      {viewingApt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#ff5757]" />
                <h4 className="font-bold text-slate-800 text-sm font-display">Détails de la Réservation</h4>
              </div>
              <button
                onClick={() => setViewingApt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Client Info Banner */}
              {(() => {
                const cl = centerClients.find(c => c.id === viewingApt.clientId);
                const srv = services.find(s => s.id === viewingApt.serviceId);
                const tech = cl ? getTechnologyForClient(cl.id) : null;
                return (
                  <>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${cl?.gender === 'F' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adhérent enregistré</span>
                          <h5 className="font-bold text-slate-800 text-sm">{cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}</h5>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200/50 pt-2.5 text-[11px] text-slate-600 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{cl?.phone || 'Non renseigné'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{cl?.email || 'Pas d’adresse email'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking metadata */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Prestation de soin</span>
                          <span className="text-slate-800 font-bold block">{srv?.name || 'Soin'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Durée de la séance</span>
                          <span className="text-slate-800 font-bold block">{srv ? `${srv.duration} minutes` : '20 min'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Date & Heure</span>
                          <span className="text-slate-800 font-bold block font-mono">{formatDateTime(viewingApt.dateTime)}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Technologie Forfait</span>
                          {tech ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold ${
                              tech === 'aq8'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : tech === 'wonder'
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : 'bg-slate-50 text-slate-500'
                            }`}>
                              {tech === 'aq8' ? 'AQ8 EMS (Électrostimulation)' : tech === 'wonder' ? 'Wonder Sculpt' : 'Cure Mixte'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic block">Aucun forfait actif</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Identifiant unique</span>
                          <span className="text-slate-500 block font-mono text-[10px]">{viewingApt.id}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Statut Actuel</span>
                          <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${
                            viewingApt.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : viewingApt.status === 'booked'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {viewingApt.status === 'completed' ? 'Séance Effectuée' : viewingApt.status === 'booked' ? 'Rendez-vous planifié' : 'Séance Annulée'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-slate-100 pt-3">
                        <span className="text-slate-400 font-semibold block flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          Commentaires / Notes spécifiques
                        </span>
                        <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 italic">
                          {viewingApt.notes || 'Aucun commentaire renseigné pour cette séance.'}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setViewingApt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. EDIT MODAL (Modifier Réservation) */}
      {/* ========================================================= */}
      {editingApt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-[#ff5757]" />
                <h4 className="font-bold text-slate-800 text-sm font-display">Modifier la Réservation</h4>
              </div>
              <button
                onClick={() => setEditingApt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              {/* Member Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Adhérent *</label>
                <select
                  value={editingApt.clientId}
                  onChange={(e) => setEditingApt({ ...editingApt, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                  required
                >
                  {centerClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Prestation *</label>
                <select
                  value={editingApt.serviceId}
                  onChange={(e) => setEditingApt({ ...editingApt, serviceId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                  required
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Date *</label>
                  <input
                    type="date"
                    value={editingApt.dateTime.split('T')[0] || getTodayDateString()}
                    onChange={(e) => {
                      const timePart = editingApt.dateTime.split('T')[1] || '10:00';
                      setEditingApt({ ...editingApt, dateTime: `${e.target.value}T${timePart}` });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Heure *</label>
                  <input
                    type="time"
                    value={editingApt.dateTime.split('T')[1] || '10:00'}
                    onChange={(e) => {
                      const datePart = editingApt.dateTime.split('T')[0] || getTodayDateString();
                      setEditingApt({ ...editingApt, dateTime: `${datePart}T${e.target.value}` });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              {/* Status Field */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Statut de Réservation *</label>
                <select
                  value={editingApt.status}
                  onChange={(e) => setEditingApt({ ...editingApt, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                  required
                >
                  <option value="booked">Séance Planifiée (En attente)</option>
                  <option value="completed">Séance Effectuée (Validée)</option>
                  <option value="cancelled">Séance Annulée</option>
                </select>
              </div>

              {/* Special instructions */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Instructions spécifiques</label>
                <textarea
                  value={editingApt.notes || ''}
                  onChange={(e) => setEditingApt({ ...editingApt, notes: e.target.value })}
                  placeholder="Améliorations de confort, consignes physiques..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none resize-none"
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
