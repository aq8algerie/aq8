/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Appointment, Service, ClientPackage, Package, BookingRequest } from '../../types';
import { getTodayDateString } from '../../lib/centerManagerUtils';
import { findActivePackageForClient, validateDeduction, deductSessionFromPackage } from '../../lib/packageRules';
import { PendingBookingRequestsPanel } from './schedule/PendingBookingRequestsPanel';
import { ScheduleToolbar, ScheduleViewType } from './schedule/ScheduleToolbar';
import { ScheduleBulkActionsBar } from './schedule/ScheduleBulkActionsBar';
import { DayScheduleView } from './schedule/DayScheduleView';
import { WeekScheduleView } from './schedule/WeekScheduleView';
import { MonthScheduleView } from './schedule/MonthScheduleView';
import { HorizontalGridScheduleView } from './schedule/HorizontalGridScheduleView';
import { AppointmentDetailsModal } from './schedule/AppointmentDetailsModal';
import { EditAppointmentModal } from './schedule/EditAppointmentModal';
import {
  MONTHS_FR_LONG,
  MONTHS_FR_SHORT,
  TIMELINE_HOURS,
  WEEK_DAYS_FR,
  formatDateToYYYYMMDD,
  getMonthGrid,
  getNavigatedScheduleDate,
  getWeekDates,
  getWeekRangeLabel,
} from './schedule/scheduleDateUtils';
import {
  getAppointmentsForDayAndHour as getAppointmentsForDayAndHourFromData,
  getCenterScheduleData,
  getFilteredScheduleAppointments,
  getTechnologyForClient as getTechnologyForClientFromData,
} from './schedule/scheduleDataUtils';

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
  bookingRequests?: BookingRequest[];
  onUpdateBookingRequests?: (requests: BookingRequest[]) => Promise<void>;
  onUpdateClients?: (clients: Client[]) => void;
}


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
  onBookAppointmentClick,
  bookingRequests = [],
  onUpdateBookingRequests,
  onUpdateClients,
}: ManagerScheduleViewProps) {
  // 1. Navigation and View Mode States
  const [viewType, setViewType] = useState<ScheduleViewType>('day');
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

  // 2. Navigation Actions
  const handleNavPrev = () => {
    setFocusedDate(getNavigatedScheduleDate(focusedDate, viewType, 'previous'));
  };

  const handleNavNext = () => {
    setFocusedDate(getNavigatedScheduleDate(focusedDate, viewType, 'next'));
  };

  const handleNavToday = () => {
    setFocusedDate(new Date());
  };
  // 3. Client and Package Metadata Helpers
  const { centerClients, centerAppointments } = getCenterScheduleData(centerId, clients, appointments);
  const appointmentsToRender = getFilteredScheduleAppointments(centerAppointments, centerClients, services, searchTerm);
  const getTechnologyForClient = (clientId: string) => getTechnologyForClientFromData(clientId, clientPackages, packages);
  const getAppointmentsForDayAndHour = (dateStr: string, hourStr: string) => (
    getAppointmentsForDayAndHourFromData(appointmentsToRender, dateStr, hourStr)
  );
  // 4. Individual Actions
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

  // 5. Bulk Actions Logic
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

  // Booking Requests handlers
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAcceptBookingRequest = async (req: BookingRequest) => {
    if (!onUpdateBookingRequests) return;
    setProcessingId(req.id);
    try {
      // 1. Find or create client by phone
      let existingClient = clients.find(
        c => c.phone === req.phone && c.centerId === centerId
      );
      if (!existingClient && onUpdateClients) {
        const newClient: Client = {
          id: `cli-${Date.now()}`,
          firstName: req.firstName,
          lastName: req.lastName,
          phone: req.phone,
          email: req.email || '',
          centerId: centerId,
          createdAt: getTodayDateString(),
          gender: 'H' as const,
          sportGoals: [],
        };
        onUpdateClients([...clients, newClient]);
        existingClient = newClient;
      }

      // 2. Find service matching the booking request service key
      const matchedService = services.find(
        s => s.type === req.service || s.name.toLowerCase().includes(req.service.toLowerCase())
      ) || services[0];

      // 3. Create the appointment
      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        clientId: existingClient?.id || `cli-${Date.now()}`,
        serviceId: matchedService?.id || '',
        centerId: centerId,
        dateTime: `${req.bookingDate}T${req.bookingTime}`,
        duration: matchedService?.duration || 20,
        status: 'booked',
        notes: `Demande publique — ${req.service}`,
      };
      onUpdateAppointments([...appointments, newApt]);

      // 4. Update booking request status to accepted
      const updatedAll: BookingRequest[] = bookingRequests.map(r =>
        r.id === req.id ? { ...r, status: 'accepted' as const } : r
      );
      await onUpdateBookingRequests(updatedAll);
      showToast(`Demande de ${req.firstName} ${req.lastName} acceptée — RDV créé !`);
    } catch (e) {
      console.error(e);
      showToast('Erreur lors du traitement.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBookingRequest = async (req: BookingRequest) => {
    if (!onUpdateBookingRequests) return;
    setProcessingId(req.id);
    try {
      const updatedAll: BookingRequest[] = bookingRequests.map(r =>
        r.id === req.id ? { ...r, status: 'rejected' as const } : r
      );
      await onUpdateBookingRequests(updatedAll);
      showToast(`Demande de ${req.firstName} ${req.lastName} refusée.`);
    } catch (e) {
      showToast('Erreur lors du traitement.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');

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
      {/* ===================================================== */}
      <PendingBookingRequestsPanel
        requests={pendingRequests}
        processingId={processingId}
        onAccept={handleAcceptBookingRequest}
        onReject={handleRejectBookingRequest}
      />
      <ScheduleToolbar
        viewType={viewType}
        focusedDate={focusedDate}
        weekRangeLabel={getWeekRangeLabel(focusedDate)}
        monthLabel={`${MONTHS_FR_LONG[focusedDate.getMonth()]} ${focusedDate.getFullYear()}`}
        searchTerm={searchTerm}
        onViewTypeChange={setViewType}
        onBookAppointmentClick={onBookAppointmentClick}
        onNavPrev={handleNavPrev}
        onNavToday={handleNavToday}
        onNavNext={handleNavNext}
        onSearchTermChange={setSearchTerm}
      />
      <ScheduleBulkActionsBar
        selectedCount={selectedIds.length}
        onComplete={handleBulkComplete}
        onCancel={handleBulkCancel}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />
      {/* ========================================================= */}
      {/* RENDER ACTIVE VIEW */}
      {/* ========================================================= */}

      {/* 1. DAY VIEW */}
      {viewType === 'day' && (
        <DayScheduleView
          timelineHours={TIMELINE_HOURS}
          focusedDate={focusedDate}
          centerClients={centerClients}
          services={services}
          selectedIds={selectedIds}
          formatDateToYYYYMMDD={formatDateToYYYYMMDD}
          getAppointmentsForDayAndHour={getAppointmentsForDayAndHour}
          getTechnologyForClient={getTechnologyForClient}
          onToggleSelectOne={handleToggleSelectOne}
          onViewAppointment={setViewingApt}
          onEditAppointment={setEditingApt}
          onCompleteAppointment={handleSingleComplete}
          onCancelAppointment={handleSingleCancel}
          onDeleteAppointment={handleSingleDelete}
        />
      )}
      {/* 2. WEEKLY VIEW (7 Columns Side by Side) */}
      {viewType === 'week' && (
        <WeekScheduleView
          focusedDate={focusedDate}
          appointmentsToRender={appointmentsToRender}
          centerClients={centerClients}
          services={services}
          selectedIds={selectedIds}
          getWeekDates={getWeekDates}
          formatDateToYYYYMMDD={formatDateToYYYYMMDD}
          getTodayDateString={getTodayDateString}
          onToggleSelectOne={handleToggleSelectOne}
          onViewAppointment={setViewingApt}
          onEditAppointment={setEditingApt}
          onBookingDateFilterChange={onBookingDateFilterChange}
          onBookAppointmentClick={onBookAppointmentClick}
        />
      )}
      {/* 3. MONTHLY VIEW (Classic Calendar Grid) */}
      {viewType === 'month' && (
        <MonthScheduleView
          focusedDate={focusedDate}
          weekDays={WEEK_DAYS_FR}
          appointmentsToRender={appointmentsToRender}
          centerClients={centerClients}
          services={services}
          getMonthGrid={getMonthGrid}
          formatDateToYYYYMMDD={formatDateToYYYYMMDD}
          getTodayDateString={getTodayDateString}
          onOpenDay={(date) => {
            setFocusedDate(date);
            setViewType('day');
          }}
        />
      )}
      {/* 4. GRILLE HORIZONTALE (Horizontal Hour Grid) */}
      {viewType === 'horizontal_grid' && (
        <HorizontalGridScheduleView
          focusedDate={focusedDate}
          timelineHours={TIMELINE_HOURS}
          monthsShort={MONTHS_FR_SHORT}
          centerClients={centerClients}
          services={services}
          selectedIds={selectedIds}
          getWeekDates={getWeekDates}
          formatDateToYYYYMMDD={formatDateToYYYYMMDD}
          getTodayDateString={getTodayDateString}
          getAppointmentsForDayAndHour={getAppointmentsForDayAndHour}
          onToggleSelectOne={handleToggleSelectOne}
          onViewAppointment={setViewingApt}
          onBookingDateFilterChange={onBookingDateFilterChange}
          onBookAppointmentClick={onBookAppointmentClick}
        />
      )}
      <AppointmentDetailsModal
        appointment={viewingApt}
        centerClients={centerClients}
        services={services}
        getTechnologyForClient={getTechnologyForClient}
        onClose={() => setViewingApt(null)}
      />
      <EditAppointmentModal
        appointment={editingApt}
        centerClients={centerClients}
        services={services}
        onAppointmentChange={setEditingApt}
        onSubmit={handleEditSubmit}
        onClose={() => setEditingApt(null)}
      />
    </div>
  );
}