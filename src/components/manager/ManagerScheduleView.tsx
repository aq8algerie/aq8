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
import {
  acceptBookingRequestInTransaction,
  AppointmentMutationOptions,
  CrmActionResult,
  getErrorMessage,
  rejectBookingRequestInTransaction
} from '../../lib/crmTransactions';
import { getTodayDateString } from '../../lib/centerManagerUtils';
import { validateAppointment } from '../../lib/appointmentRules';
import { getBookingHoursForDate } from '../../lib/bookingCapacityRules';
import { db } from '../../lib/firebase';
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
  onCompleteAppointment: (id: string, options?: AppointmentMutationOptions) => Promise<CrmActionResult>;
  onCancelAppointment: (id: string, options?: AppointmentMutationOptions) => Promise<CrmActionResult>;
  onUpdateAppointment: (appointment: Appointment) => Promise<CrmActionResult>;
  onDeleteAppointment: (id: string) => Promise<CrmActionResult>;
  clientPackages: ClientPackage[];
  packages: Package[];
  onBookAppointmentClick: () => void;
  bookingRequests?: BookingRequest[];
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
  onUpdateAppointment,
  onDeleteAppointment,
  clientPackages,
  packages,
  onBookAppointmentClick,
  bookingRequests = [],
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
  const focusedDateStr = formatDateToYYYYMMDD(focusedDate);
  const focusedDateTimelineHours = getBookingHoursForDate(centerId, focusedDateStr);
  // 4. Individual Actions
  const handleSingleComplete = async (id: string) => {
    const result = await onCompleteAppointment(id, { silent: true });
    if (result.ok) {
      showToast('Seance effectuee et creditee avec succes !');
    } else {
      showToast(result.error || 'Validation impossible.', 'error');
    }
  };

  const handleSingleCancel = async (id: string) => {
    const result = await onCancelAppointment(id, { silent: true });
    if (result.ok) {
      showToast('Seance marquee comme annulee.');
    } else {
      showToast(result.error || 'Annulation impossible.', 'error');
    }
  };

  const handleSingleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous supprimer definitivement cette reservation ?')) {
      const result = await onDeleteAppointment(id);
      if (result.ok) {
        setSelectedIds(prev => prev.filter(x => x !== id));
        showToast('Reservation supprimee definitivement.');
      } else {
        showToast(result.error || 'Suppression impossible.', 'error');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;

    const selectedService = services.find(s => s.id === editingApt.serviceId);
    const result = await onUpdateAppointment({
      ...editingApt,
      duration: selectedService ? selectedService.duration : 20
    });

    if (result.ok) {
      setEditingApt(null);
      showToast('Reservation mise a jour avec succes.');
    } else {
      showToast(result.error || 'Mise a jour impossible.', 'error');
    }
  };

  // 5. Bulk Actions Logic
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = async () => {
    const eligibleBookings = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');

    if (eligibleBookings.length === 0) {
      showToast('Aucun rendez-vous eligible (planifie) selectionne.', 'error');
      return;
    }

    let countSuccess = 0;
    let countFail = 0;

    for (const appointment of eligibleBookings) {
      const result = await onCompleteAppointment(appointment.id, { silent: true });
      if (result.ok) countSuccess++;
      else countFail++;
    }

    setSelectedIds([]);

    if (countFail > 0) {
      showToast(`${countSuccess} valide(s), ${countFail} echoue(s) (absence de forfait/credits).`, 'error');
    } else {
      showToast(`${countSuccess} seances validees en masse avec deduction des forfaits !`);
    }
  };

  const handleBulkCancel = async () => {
    const eligibleBookings = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');
    if (eligibleBookings.length === 0) {
      showToast('Aucune seance planifiee eligible pour annulation.', 'error');
      return;
    }

    let countSuccess = 0;
    let countFail = 0;

    for (const appointment of eligibleBookings) {
      const result = await onCancelAppointment(appointment.id, { silent: true });
      if (result.ok) countSuccess++;
      else countFail++;
    }

    setSelectedIds([]);
    if (countFail > 0) {
      showToast(`${countSuccess} annulee(s), ${countFail} echouee(s).`, 'error');
    } else {
      showToast(`${countSuccess} seances annulees en masse.`);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Voulez-vous supprimer definitivement ces ${selectedIds.length} reservations ?`)) {
      let countSuccess = 0;
      let countFail = 0;

      for (const appointmentId of selectedIds) {
        const result = await onDeleteAppointment(appointmentId);
        if (result.ok) countSuccess++;
        else countFail++;
      }

      setSelectedIds([]);
      if (countFail > 0) {
        showToast(`${countSuccess} supprimee(s), ${countFail} echouee(s).`, 'error');
      } else {
        showToast(`${countSuccess} reservations supprimees en masse.`);
      }
    }
  };

  // Booking Requests handlers
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getServiceForBookingRequest = (req: BookingRequest) => {
    const requestedService = req.service.toLowerCase();
    return services.find(
      s => s.type === req.service || s.name.toLowerCase().includes(requestedService)
    );
  };

  const handleAcceptBookingRequest = async (req: BookingRequest) => {
    setProcessingId(req.id);
    try {
      if (req.centerId !== centerId) {
        throw new Error("Cette demande n'appartient pas a votre centre.");
      }
      if (req.status !== 'pending') {
        throw new Error("Cette demande a deja ete traitee.");
      }

      const matchedService = getServiceForBookingRequest(req);
      if (!matchedService) {
        throw new Error('Aucune prestation CRM ne correspond a cette demande.');
      }

      const existingClient = clients.find(
        c => c.phone === req.phone && c.centerId === centerId
      );
      const clientId = existingClient?.id || `cli-${req.id}`;
      const dateTime = `${req.bookingDate}T${req.bookingTime}`;
      const validation = validateAppointment(
        {
          clientId,
          serviceId: matchedService.id,
          centerId,
          dateTime,
          duration: matchedService.duration || 20
        },
        appointments,
        existingClient?.centerId || centerId,
        services
      );

      if (!validation.valid) {
        throw new Error(validation.error || 'Reservation invalide.');
      }

      await acceptBookingRequestInTransaction(db, {
        requestId: req.id,
        centerId,
        existingClientId: existingClient?.id,
        newClientId: `cli-${req.id}`,
        appointmentId: `apt-${req.id}`,
        serviceId: matchedService.id,
        duration: matchedService.duration || 20,
        createdAt: getTodayDateString()
      });

      showToast(`Demande de ${req.firstName} ${req.lastName} acceptee - RDV cree !`);
    } catch (error) {
      console.error(error);
      showToast(getErrorMessage(error, 'Erreur lors du traitement.'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBookingRequest = async (req: BookingRequest) => {
    setProcessingId(req.id);
    try {
      await rejectBookingRequestInTransaction(db, {
        requestId: req.id,
        centerId
      });
      showToast(`Demande de ${req.firstName} ${req.lastName} refusee.`);
    } catch (error) {
      showToast(getErrorMessage(error, 'Erreur lors du traitement.'), 'error');
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
          timelineHours={focusedDateTimelineHours}
          focusedDate={focusedDate}
          centerId={centerId}
          centerAppointments={centerAppointments}
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
        appointments={centerAppointments}
        onAppointmentChange={setEditingApt}
        onSubmit={handleEditSubmit}
        onClose={() => setEditingApt(null)}
      />
    </div>
  );
}