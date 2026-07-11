/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid,
  List,
  Eye,
  Edit2,
  XCircle,
  Trash2,
  CheckCircle2,
  User,
  Users,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  Mail,
  FileText,
  CalendarDays,
  LayoutGrid,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Appointment, Service, ClientPackage, Package } from '../../types';
import { formatDateTime, getTodayDateString } from '../../lib/centerManagerUtils';
import { findActivePackageForClient, validateDeduction, deductSessionFromPackage } from '../../lib/packageRules';

interface ManagerScheduleViewProps {
  centerId: string;
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  bookingDateFilter: string;
  onBookingDateFilterChange: (val: string) => void;
  onCompleteAppointment: (id: string) => void;
  onCancelAppointment: (id: string) => void;
  onUpdateAppointments: (appointments: Appointment[]) => void;
  clientPackages: ClientPackage[];
  packages: Package[];
  onUpdateClientPackages: (clientPackages: ClientPackage[]) => void;
  onBookAppointmentClick: () => void;
}

type ViewType = 'day' | 'week' | 'month' | 'horizontal_grid';

export function ManagerScheduleView({
  centerId,
  clients,
  appointments,
  services,
  bookingDateFilter,
  onBookingDateFilterChange,
  onCompleteAppointment,
  onCancelAppointment,
  onUpdateAppointments,
  clientPackages,
  packages,
  onUpdateClientPackages,
  onBookAppointmentClick
}: ManagerScheduleViewProps) {
  // 1. Navigation and View Mode States
  const [viewType, setViewType] = useState<ViewType>('day');
  const [focusedDate, setFocusedDate] = useState<Date>(() => {
    const parsed = new Date(bookingDateFilter);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  });

  // Sync date selection with external filter
  useEffect(() => {
    const dateStr = formatDateToYYYYMMDD(focusedDate);
    if (bookingDateFilter !== dateStr) {
      onBookingDateFilterChange(dateStr);
    }
  }, [focusedDate]);

  useEffect(() => {
    const parsed = new Date(bookingDateFilter);
    if (!isNaN(parsed.getTime())) {
      const dateStr = formatDateToYYYYMMDD(parsed);
      const currentFocusedStr = formatDateToYYYYMMDD(focusedDate);
      if (dateStr !== currentFocusedStr) {
        setFocusedDate(parsed);
      }
    }
  }, [bookingDateFilter]);

  // Bulk Actions & Active Selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal display states
  const [viewingApt, setViewingApt] = useState<Appointment | null>(null);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  // Search input inside the schedule views
  const [searchTerm, setSearchTerm] = useState('');

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 2. Date Arithmetic Helpers (No libraries needed)
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekRangeLabel = (refDate: Date): string => {
    const week = getWeekDates(refDate);
    const start = week[0];
    const end = week[6];
    
    const startDay = start.getDate();
    const startMonth = monthsFrShort[start.getMonth()];
    const endDay = end.getDate();
    const endMonth = monthsFrShort[end.getMonth()];
    const year = end.getFullYear();

    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  const getWeekDates = (referenceDate: Date): Date[] => {
    const currentDay = referenceDate.getDay(); // 0 = Sun, 1 = Mon ...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() + distanceToMonday);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getMonthGrid = (referenceDate: Date) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay();
    // Monday as 0, Sunday as 6
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();
    
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous Month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, totalDaysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Current Month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next Month padding
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return cells;
  };

  // Navigations Actions
  const handleNavPrev = () => {
    const nextDate = new Date(focusedDate);
    if (viewType === 'day') {
      nextDate.setDate(focusedDate.getDate() - 1);
    } else if (viewType === 'week' || viewType === 'horizontal_grid') {
      nextDate.setDate(focusedDate.getDate() - 7);
    } else if (viewType === 'month') {
      nextDate.setMonth(focusedDate.getMonth() - 1);
    }
    setFocusedDate(nextDate);
  };

  const handleNavNext = () => {
    const nextDate = new Date(focusedDate);
    if (viewType === 'day') {
      nextDate.setDate(focusedDate.getDate() + 1);
    } else if (viewType === 'week' || viewType === 'horizontal_grid') {
      nextDate.setDate(focusedDate.getDate() + 7);
    } else if (viewType === 'month') {
      nextDate.setMonth(focusedDate.getMonth() + 1);
    }
    setFocusedDate(nextDate);
  };

  const handleNavToday = () => {
    setFocusedDate(new Date());
  };

  // 3. Static Lists
  const weekDaysFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthsFrLong = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const monthsFrShort = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  const timelineHours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  // 4. Client and Package Metadata Helpers
  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerAppointments = appointments.filter(a => a.centerId === centerId);

  // General Filtered appointments based on search query
  const getFilteredCenterAppointments = () => {
    if (!searchTerm) return centerAppointments;
    return centerAppointments.filter(apt => {
      const cl = centerClients.find(c => c.id === apt.clientId);
      const srv = services.find(s => s.id === apt.serviceId);
      const nameMatch = cl ? `${cl.firstName} ${cl.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const phoneMatch = cl ? cl.phone.includes(searchTerm) : false;
      const serviceMatch = srv ? srv.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      return nameMatch || phoneMatch || serviceMatch;
    });
  };

  const appointmentsToRender = getFilteredCenterAppointments();

  const getTechnologyForClient = (clientId: string) => {
    const active = findActivePackageForClient(clientId, clientPackages);
    if (!active) return null;
    const pkg = packages.find(p => p.id === active.packageId);
    return pkg ? pkg.type : null;
  };

  // Time-slot filter helper (for exact or near hour mappings)
  const getAppointmentsForDayAndHour = (dateStr: string, hourStr: string) => {
    return appointmentsToRender.filter(apt => {
      if (!apt.dateTime.startsWith(dateStr)) return false;
      const aptTime = apt.dateTime.split('T')[1];
      if (!aptTime) return false;
      const aptHour = aptTime.split(':')[0]; // "09"
      const slotHour = hourStr.split(':')[0]; // "09"
      return aptHour === slotHour;
    });
  };

  // 5. Individual Actions
  const handleSingleComplete = (id: string) => {
    onCompleteAppointment(id);
    showToast('Séance effectuée et créditée avec succès !');
  };

  const handleSingleCancel = (id: string) => {
    onCancelAppointment(id);
    showToast('Séance marquée comme annulée.');
  };

  const handleSingleDelete = (id: string) => {
    if (window.confirm('Voulez-vous supprimer définitivement cette réservation ?')) {
      const updated = appointments.filter(a => a.id !== id);
      onUpdateAppointments(updated);
      setSelectedIds(prev => prev.filter(x => x !== id));
      showToast('Réservation supprimée définitivement.');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;

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

  // 6. Bulk Actions Logic
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = () => {
    const eligibleBookings = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');
    
    if (eligibleBookings.length === 0) {
      showToast('Aucun rendez-vous éligible (planifié) sélectionné.', 'error');
      return;
    }

    let tempClientPackages = [...clientPackages];
    let countSuccess = 0;
    let countFail = 0;

    const updatedApts = appointments.map(apt => {
      if (selectedIds.includes(apt.id)) {
        if (apt.status !== 'booked') return apt;

        const cl = clients.find(c => c.id === apt.clientId);
        const activePkg = findActivePackageForClient(apt.clientId, tempClientPackages);
        const validation = validateDeduction(apt, cl, activePkg, centerId);

        if (validation.valid && activePkg) {
          const updatedPkg = deductSessionFromPackage(activePkg);
          tempClientPackages = tempClientPackages.map(cp => cp.id === activePkg.id ? updatedPkg : cp);
          countSuccess++;
          return { ...apt, status: 'completed' as const };
        } else {
          countFail++;
          return apt;
        }
      }
      return apt;
    });

    onUpdateAppointments(updatedApts);
    onUpdateClientPackages(tempClientPackages);
    setSelectedIds([]);

    if (countFail > 0) {
      showToast(`${countSuccess} validé(s), ${countFail} échoué(s) (absence de forfait/crédits).`, 'error');
    } else {
      showToast(`${countSuccess} séances validées en masse avec déduction des forfaits !`);
    }
  };

  const handleBulkCancel = () => {
    const eligibleBookings = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');
    if (eligibleBookings.length === 0) {
      showToast('Aucune séance planifiée éligible pour annulation.', 'error');
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
    showToast(`${eligibleBookings.length} séances annulées en masse.`);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ces ${selectedIds.length} réservations ?`)) {
      const updated = appointments.filter(apt => !selectedIds.includes(apt.id));
      onUpdateAppointments(updated);
      setSelectedIds([]);
      showToast('Réservations supprimées en masse.');
    }
  };

  return (
    <div id="manager-schedule-view-container" className="space-y-6">
      
      {/* Toast Feedbacks */}
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
            {toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title & View Navigation Row */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold font-display text-slate-800 text-base">Planning Interactif du Centre</h3>
            <p className="text-xs text-slate-500">
              Visualisez l'emploi du temps, alternez les vues Jour, Semaine, Mois, et Grille Horizontale.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Selectors */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-600">
              <button
                id="btn-view-day"
                onClick={() => setViewType('day')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewType === 'day' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Jour
              </button>
              <button
                id="btn-view-week"
                onClick={() => setViewType('week')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewType === 'week' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Hebdo
              </button>
              <button
                id="btn-view-month"
                onClick={() => setViewType('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewType === 'month' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Mensuelle
              </button>
              <button
                id="btn-view-hgrid"
                onClick={() => setViewType('horizontal_grid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewType === 'horizontal_grid' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
                }`}
                title="Grille Horizontale"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Grille Horizontale
              </button>
            </div>

            <button
              id="btn-schedule-add-rdv"
              onClick={onBookAppointmentClick}
              className="px-3.5 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
            >
              <Plus className="h-4 w-4" /> Réserver Créneau
            </button>
          </div>
        </div>

        {/* Date Navigator Bar & Search Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-50">
          <div id="schedule-date-nav" className="flex items-center gap-2.5">
            <div className="flex items-center rounded-xl border border-slate-200/70 bg-white overflow-hidden p-0.5">
              <button
                id="btn-nav-prev"
                onClick={handleNavPrev}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id="btn-nav-today"
                onClick={handleNavToday}
                className="px-3 py-1 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer border-l border-r border-slate-100"
              >
                Aujourd'hui
              </button>
              <button
                id="btn-nav-next"
                onClick={handleNavNext}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Nav label display */}
            <div className="flex items-center gap-1.5 text-xs text-[#353535]">
              <Calendar className="h-4 w-4 text-[#ff5757]" />
              <span className="font-bold font-display">
                {viewType === 'day' && (
                  <span>
                    {focusedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {(viewType === 'week' || viewType === 'horizontal_grid') && (
                  <span>Semaine du : {getWeekRangeLabel(focusedDate)}</span>
                )}
                {viewType === 'month' && (
                  <span className="capitalize">{monthsFrLong[focusedDate.getMonth()]} {focusedDate.getFullYear()}</span>
                )}
              </span>
            </div>
          </div>

          {/* Quick Member search within Schedule */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer par adhérent / soin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 text-xs text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <motion.div
          id="bulk-actions-schedule"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#353535] text-white p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1 bg-white/10 rounded-lg text-[#ff5757]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-bold">
              {selectedIds.length} sélection{selectedIds.length > 1 ? 's' : ''} dans le planning
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
              <XCircle className="h-3.5 w-3.5" /> Annuler séances
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
              Désélectionner
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* RENDER ACTIVE VIEW */}
      {/* ========================================================= */}

      {/* 1. DAY VIEW */}
      {viewType === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
          {timelineHours.map((hour) => {
            const dateStr = formatDateToYYYYMMDD(focusedDate);
            const hourApts = getAppointmentsForDayAndHour(dateStr, hour);
            return (
              <div key={hour} className="flex gap-4 items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0 text-xs">
                <div className="font-mono font-bold text-slate-500 shrink-0 w-12 pt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-300" />
                  <span>{hour}</span>
                </div>
                <div className="flex-1 space-y-2.5">
                  {hourApts.length > 0 ? (
                    hourApts.map(apt => {
                      const cl = centerClients.find(c => c.id === apt.clientId);
                      const srv = services.find(s => s.id === apt.serviceId);
                      const isSelected = selectedIds.includes(apt.id);
                      const tech = cl ? getTechnologyForClient(cl.id) : null;

                      return (
                        <div
                          key={apt.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#ff5757]/5 border-[#ff5757] shadow-sm'
                              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          {/* Left: Checkbox + Client Name & Info */}
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleSelectOne(apt.id)}
                              className="text-slate-400 hover:text-[#ff5757] pt-0.5 cursor-pointer"
                            >
                              {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-[#ff5757]" /> : <Square className="h-4.5 w-4.5" />}
                            </button>
                            <div className="space-y-1">
                              <div className="font-bold text-[#353535] flex items-center gap-1.5">
                                <span>{cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}</span>
                                {cl?.gender === 'F' ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Femme"></span>
                                ) : cl?.gender === 'H' ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Homme"></span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">{srv?.name || 'Soin'}</span>
                                <span>•</span>
                                <span className="font-mono">{apt.duration} min</span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">{cl?.phone}</span>
                              </div>
                              {apt.notes && (
                                <p className="text-[10px] text-slate-400 italic font-medium">"{apt.notes}"</p>
                              )}
                            </div>
                          </div>

                          {/* Right: Technology Badge, Status, and Controls */}
                          <div className="flex items-center gap-3 self-end md:self-auto">
                            {tech && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                tech === 'aq8'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                  : tech === 'wonder'
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-slate-50 text-slate-500'
                              }`}>
                                {tech === 'aq8' ? 'AQ8 EMS' : tech === 'wonder' ? 'Wonder' : 'Mixte'}
                              </span>
                            )}

                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              apt.status === 'completed'
                                ? 'bg-green-50 text-green-600'
                                : apt.status === 'booked'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                            </span>

                            {/* Actions overlay */}
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                              <button
                                onClick={() => setViewingApt(apt)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                                title="Voir"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingApt(apt)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {apt.status === 'booked' && (
                                <>
                                  <button
                                    onClick={() => handleSingleComplete(apt.id)}
                                    className="p-1 text-green-500 hover:text-green-700 rounded hover:bg-green-50 transition cursor-pointer"
                                    title="Effectuer"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSingleCancel(apt.id)}
                                    className="p-1 text-amber-500 hover:text-amber-700 rounded hover:bg-amber-50 transition cursor-pointer"
                                    title="Annuler"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleSingleDelete(apt.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 transition cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-2.5 text-slate-300 italic text-[11px] flex items-center gap-1.5">
                      <span>Créneau disponible</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. WEEKLY VIEW (7 Columns Side by Side) */}
      {viewType === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {getWeekDates(focusedDate).map((dayDate) => {
            const dateStr = formatDateToYYYYMMDD(dayDate);
            const isToday = dateStr === getTodayDateString();
            const dayApts = appointmentsToRender.filter(a => a.dateTime.startsWith(dateStr));

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-2xl border p-4 flex flex-col min-h-[400px] ${
                  isToday ? 'border-[#ff5757] ring-1 ring-[#ff5757]/15 bg-[#ff5757]/2' : 'border-slate-100'
                }`}
              >
                {/* Day Header */}
                <div className="border-b border-slate-100 pb-2 mb-3 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </span>
                  <span className={`text-base font-bold rounded-full w-8 h-8 inline-flex items-center justify-center font-display ${
                    isToday ? 'bg-[#ff5757] text-white' : 'text-slate-800'
                  }`}>
                    {dayDate.getDate()}
                  </span>
                </div>

                {/* Day Bookings List */}
                <div className="flex-1 space-y-2.5">
                  {dayApts.length > 0 ? (
                    dayApts.map(apt => {
                      const cl = centerClients.find(c => c.id === apt.clientId);
                      const srv = services.find(s => s.id === apt.serviceId);
                      const isSelected = selectedIds.includes(apt.id);
                      const hourPart = apt.dateTime.split('T')[1] || '';

                      return (
                        <div
                          key={apt.id}
                          className={`p-2.5 rounded-xl border text-[11px] relative group transition ${
                            isSelected
                              ? 'bg-[#ff5757]/5 border-[#ff5757]'
                              : 'bg-slate-50 border-slate-100/70 hover:bg-white hover:border-slate-200 hover:shadow-xs'
                          }`}
                        >
                          {/* Selection Checkbox on Hover/Active */}
                          <button
                            onClick={() => handleToggleSelectOne(apt.id)}
                            className="absolute top-1.5 right-1.5 text-slate-400 hover:text-[#ff5757] opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            {isSelected ? <CheckSquare className="h-3.5 w-3.5 text-[#ff5757]" /> : <Square className="h-3.5 w-3.5" />}
                          </button>

                          {/* Hour */}
                          <span className="font-mono font-bold text-slate-500 block mb-0.5">{hourPart}</span>
                          
                          {/* Client */}
                          <div className="font-bold text-[#353535] truncate max-w-[90%]">
                            {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent'}
                          </div>

                          {/* Prestation */}
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {srv?.name || 'Soin'}
                          </div>

                          {/* Status Badge compact */}
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              apt.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : apt.status === 'booked'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                            </span>

                            {/* Mini actions display on hover */}
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => setViewingApt(apt)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                title="Voir"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingApt(apt)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-slate-300 italic text-[10px]">
                      <span>Aucun RDV</span>
                    </div>
                  )}
                </div>

                {/* Day bottom add button */}
                <button
                  onClick={() => {
                    const formatted = formatDateToYYYYMMDD(dayDate);
                    onBookingDateFilterChange(formatted);
                    onBookAppointmentClick();
                  }}
                  className="mt-3 py-1.5 border border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer bg-slate-50/30 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Planifier
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MONTHLY VIEW (Classic Calendar Grid) */}
      {viewType === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-100 pb-2">
            {weekDaysFr.map(d => <span key={d}>{d}</span>)}
          </div>

          {/* Grid Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {getMonthGrid(focusedDate).map(({ date, isCurrentMonth }, i) => {
              const dateStr = formatDateToYYYYMMDD(date);
              const isToday = dateStr === getTodayDateString();
              const dayApts = appointmentsToRender.filter(a => a.dateTime.startsWith(dateStr));

              return (
                <div
                  key={`${dateStr}-${i}`}
                  onClick={() => {
                    setFocusedDate(date);
                    setViewType('day');
                  }}
                  className={`min-h-[90px] p-2 border rounded-xl flex flex-col justify-between transition cursor-pointer ${
                    isToday
                      ? 'border-[#ff5757] bg-[#ff5757]/2 hover:bg-[#ff5757]/5'
                      : isCurrentMonth
                      ? 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                      : 'border-slate-50 opacity-40 hover:opacity-70'
                  }`}
                >
                  {/* Calendar Cell Date number */}
                  <span className={`text-[11px] font-bold self-end w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[#ff5757] text-white' : 'text-slate-500'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Cell bookings compact list */}
                  <div className="space-y-1 mt-1 text-left flex-1 flex flex-col justify-end">
                    {dayApts.length > 0 ? (
                      <>
                        {/* Render first 2 bookings */}
                        {dayApts.slice(0, 2).map(apt => {
                          const cl = centerClients.find(c => c.id === apt.clientId);
                          const srv = services.find(s => s.id === apt.serviceId);
                          const hourPart = apt.dateTime.split('T')[1] || '';
                          return (
                            <div
                              key={apt.id}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded truncate flex items-center gap-1 text-[#353535] ${
                                apt.status === 'completed'
                                  ? 'bg-green-50 text-green-700'
                                  : apt.status === 'booked'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                              title={cl ? `${hourPart} - ${cl.firstName} ${cl.lastName} (${srv?.name})` : ''}
                            >
                              <span className="font-mono text-[8px] font-semibold">{hourPart}</span>
                              <span className="truncate">{cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent'}</span>
                            </div>
                          );
                        })}

                        {/* Overflow Counter */}
                        {dayApts.length > 2 && (
                          <div className="text-[8px] font-bold text-slate-400 text-center uppercase bg-slate-50 py-0.5 rounded border border-slate-100">
                            +{dayApts.length - 2} autres RDV
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. GRILLE HORIZONTALE (Horizontal Hour Grid) */}
      {viewType === 'horizontal_grid' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px] border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                <tr>
                  {/* Header: Day column */}
                  <th className="p-4 w-32 border-r border-slate-100 bg-slate-100/50 sticky left-0 z-10">Jour / Semaine</th>
                  
                  {/* Hours Columns */}
                  {timelineHours.map(hour => (
                    <th key={hour} className="p-3 border-r border-slate-100 text-center w-28">
                      <div className="flex flex-col items-center gap-0.5">
                        <Clock className="h-3 w-3 text-[#ff5757]" />
                        <span className="font-mono font-bold text-slate-700">{hour}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {getWeekDates(focusedDate).map((dayDate) => {
                  const dateStr = formatDateToYYYYMMDD(dayDate);
                  const isToday = dateStr === getTodayDateString();
                  
                  return (
                    <tr key={dateStr} className={`group ${isToday ? 'bg-[#ff5757]/2' : 'hover:bg-slate-50/20'}`}>
                      {/* Left Header Day label */}
                      <td className={`p-4 border-r border-slate-100 font-bold bg-white sticky left-0 z-10 shadow-sm ${
                        isToday ? 'text-[#ff5757]' : 'text-[#353535]'
                      }`}>
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {dayDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                          </span>
                          <span className="text-sm font-display">{dayDate.getDate()} {monthsFrShort[dayDate.getMonth()]}</span>
                        </div>
                      </td>

                      {/* Hour Intersection Cells */}
                      {timelineHours.map(hour => {
                        const cellApts = getAppointmentsForDayAndHour(dateStr, hour);
                        return (
                          <td key={hour} className="p-2 border-r border-slate-100 align-top relative min-h-[90px] w-28">
                            <div className="space-y-1.5 h-full flex flex-col justify-between">
                              {cellApts.length > 0 ? (
                                cellApts.map(apt => {
                                  const cl = centerClients.find(c => c.id === apt.clientId);
                                  const srv = services.find(s => s.id === apt.serviceId);
                                  const isSelected = selectedIds.includes(apt.id);
                                  const exactTime = apt.dateTime.split('T')[1] || '';

                                  return (
                                    <div
                                      key={apt.id}
                                      className={`p-2 rounded-xl border text-[10px] transition-all relative ${
                                        isSelected
                                          ? 'bg-[#ff5757]/10 border-[#ff5757]'
                                          : 'bg-slate-50 border-slate-100/80 hover:border-slate-300'
                                      }`}
                                    >
                                      {/* Mini checkbox on top-right */}
                                      <button
                                        onClick={() => handleToggleSelectOne(apt.id)}
                                        className="absolute top-1 right-1 text-slate-400 hover:text-[#ff5757] cursor-pointer"
                                      >
                                        {isSelected ? <CheckSquare className="h-3 w-3 text-[#ff5757]" /> : <Square className="h-3 w-3" />}
                                      </button>

                                      <span className="font-mono font-extrabold text-slate-500 block text-[9px]">{exactTime}</span>
                                      
                                      <div className="font-bold text-[#353535] truncate mb-0.5">
                                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent'}
                                      </div>
                                      
                                      <span className="text-[9px] text-slate-500 block truncate">{srv?.name || 'Soin'}</span>

                                      {/* Status Badge */}
                                      <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold">
                                        <span className={`px-1 py-0.2 rounded-sm ${
                                          apt.status === 'completed'
                                            ? 'bg-green-100 text-green-700'
                                            : apt.status === 'booked'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-200 text-slate-400'
                                        }`}>
                                          {apt.status === 'completed' ? 'Ok' : apt.status === 'booked' ? 'Plan' : 'An'}
                                        </span>
                                        <div className="flex gap-0.5">
                                          <button
                                            onClick={() => setViewingApt(apt)}
                                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                            title="Détails"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <button
                                  onClick={() => {
                                    onBookingDateFilterChange(dateStr);
                                    // Quick prefill helper can be achieved by passing custom logic to Book click if required
                                    onBookAppointmentClick();
                                  }}
                                  className="w-full h-full min-h-[48px] border border-dashed border-transparent hover:border-slate-200 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 text-xs font-bold transition cursor-pointer bg-slate-50/10 hover:bg-slate-50/50"
                                  title="Planifier à ce créneau"
                                >
                                  <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:opacity-100 transition" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAILS MODAL OVERLAY */}
      {/* ========================================================= */}
      {viewingApt && (
        <div id="modal-view-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#ff5757]" />
                <h4 className="font-bold text-slate-800 text-sm font-display">Détails de la Séance</h4>
              </div>
              <button
                onClick={() => setViewingApt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const cl = centerClients.find(c => c.id === viewingApt.clientId);
                const srv = services.find(s => s.id === viewingApt.serviceId);
                const tech = cl ? getTechnologyForClient(cl.id) : null;
                return (
                  <>
                    {/* Client Badge */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${cl?.gender === 'F' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adhérent du Centre</span>
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
                          <span className="truncate">{cl?.email || 'Pas de courriel'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking metadata info */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Soin Prestation</span>
                          <span className="text-slate-800 font-bold block">{srv?.name || 'Soin'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-semibold block">Durée de séance</span>
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
                              {tech === 'aq8' ? 'AQ8 Électrostimulation' : 'Wonder Muscle Sculpt'}
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
                          <span className="text-slate-400 font-semibold block">Statut</span>
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
                          Commentaires / Consignes spécifiques
                        </span>
                        <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 italic">
                          {viewingApt.notes || 'Aucun commentaire consigné pour cette séance.'}
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
      {/* EDIT MODAL OVERLAY */}
      {/* ========================================================= */}
      {editingApt && (
        <div id="modal-edit-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
              {/* Client Selection */}
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

              {/* Date & Hour fields */}
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

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Statut de la Séance *</label>
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

              {/* Notes instructions */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Notes spécifiques</label>
                <textarea
                  value={editingApt.notes || ''}
                  onChange={(e) => setEditingApt({ ...editingApt, notes: e.target.value })}
                  placeholder="Particularités physiques, confort..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none resize-none"
                />
              </div>

              {/* Action buttons */}
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
                  className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] text-white font-bold rounded-xl transition cursor-pointer"
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
