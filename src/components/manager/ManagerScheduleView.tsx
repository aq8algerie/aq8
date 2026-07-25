/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Center, Client, Appointment, Service, ClientPackage, Package, BookingRequest } from '../../types';
import {
  acceptBookingRequestInTransaction,
  AppointmentMutationOptions,
  CrmActionResult,
  getErrorMessage,
  rejectBookingRequestInTransaction
} from '../../lib/crmTransactions';
import { getTodayDateString } from '../../lib/centerManagerUtils';
import { getBookingHoursForDate } from '../../lib/bookingCapacityRules';
import { db } from '../../lib/firebase';
import { notifyCrmEmail } from '../../lib/emailNotificationClient';
import { ProfessionalConfirmDialog } from './ProfessionalConfirmDialog';
import { ProfessionalToast, ProfessionalToastState, ToastAction, ToastType } from './ProfessionalToast';
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
  currentCenter: Center;
  userId: string;
  userName: string;
}


type ScheduleConfirmation =
  | { kind: 'delete-single'; appointmentId: string }
  | { kind: 'delete-bulk'; appointmentIds: string[] };

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
  currentCenter,
  userId,
  userName,
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
  const [toast, setToast] = useState<ProfessionalToastState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<ScheduleConfirmation | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const showToast = (message: string, type: ToastType = 'success', action?: ToastAction, title?: string) => {
    setToast({ message, type, action, title });
    setTimeout(() => setToast(null), 4200);
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

  const handleExportCSV = () => {
    const headers = [
      'ID de réservation',
      'Client (Prénom)',
      'Client (Nom)',
      'Téléphone',
      'E-mail',
      'Date & Heure',
      'Durée (min)',
      'Prestation',
      'Technologie',
      'Statut',
      'Notes'
    ];

    const rows = appointmentsToRender.map(apt => {
      const client = centerClients.find(c => c.id === apt.clientId);
      const service = services.find(s => s.id === apt.serviceId);
      const tech = getTechnologyForClient(apt.clientId);
      const statusLabel = apt.status === 'booked' ? 'Planifié' : apt.status === 'completed' ? 'Validé' : 'Annulé';
      
      return [
        apt.id,
        client ? client.firstName : '',
        client ? client.lastName : '',
        client ? `${client.phone}` : '',
        client ? client.email : '',
        apt.dateTime,
        apt.duration,
        service ? service.name : '',
        tech || '',
        statusLabel,
        apt.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const str = String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = formatDateToYYYYMMDD(focusedDate);
    const filename = `planning_${centerId}_${viewType}_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Planning exporté : ${filename}`, 'success');
  };
  // 3. Client and Package Metadata Helpers
  const { centerClients, centerAppointments } = getCenterScheduleData(centerId, clients, appointments);
  const appointmentsToRender = getFilteredScheduleAppointments(centerAppointments, centerClients, services, searchTerm);
  const getTechnologyForClient = (clientId: string) => getTechnologyForClientFromData(clientId, clientPackages, packages);
  const getAppointmentsForDayAndHour = (dateStr: string, hourStr: string) => (
    getAppointmentsForDayAndHourFromData(appointmentsToRender, dateStr, hourStr)
  );
  const focusedDateStr = formatDateToYYYYMMDD(focusedDate);
  const focusedDateTimelineHours = getBookingHoursForDate(centerId, focusedDateStr, currentCenter);

  const getAppointmentClientLabel = (appointmentId: string) => {
    const appointment = centerAppointments.find(candidate => candidate.id === appointmentId);
    const client = appointment ? centerClients.find(candidate => candidate.id === appointment.clientId) : null;
    if (!client) return 'cette réservation';
    return `${client.firstName} ${client.lastName}`.trim() || 'cette réservation';
  };

  const confirmationCopy = pendingConfirmation
    ? pendingConfirmation.kind === 'delete-single'
      ? {
          title: 'Supprimer cette réservation ?',
          description: `${getAppointmentClientLabel(pendingConfirmation.appointmentId)} sera retiré du planning. La capacité du créneau sera libérée immédiatement.`,
          confirmLabel: 'Supprimer',
        }
      : {
          title: `Supprimer ${pendingConfirmation.appointmentIds.length} réservations ?`,
          description: 'Les réservations sélectionnées seront retirées du planning. Les places correspondantes seront libérées.',
          confirmLabel: `Supprimer ${pendingConfirmation.appointmentIds.length}`,
        }
    : null;

  const executePendingConfirmation = async () => {
    if (!pendingConfirmation || confirmingAction) return;
    setConfirmingAction(true);

    try {
      if (pendingConfirmation.kind === 'delete-single') {
        const result = await onDeleteAppointment(pendingConfirmation.appointmentId);
        if (result.ok) {
          setSelectedIds(prev => prev.filter(x => x !== pendingConfirmation.appointmentId));
          showToast('Le rendez-vous a été retiré du planning et la capacité est libérée.', 'success', 'deleted');
        } else {
          showToast(result.error || 'Suppression impossible.', 'error');
        }
        return;
      }

      let countSuccess = 0;
      let countFail = 0;
      const deletedIds: string[] = [];

      for (const appointmentId of pendingConfirmation.appointmentIds) {
        const result = await onDeleteAppointment(appointmentId);
        if (result.ok) {
          countSuccess++;
          deletedIds.push(appointmentId);
        } else {
          countFail++;
        }
      }

      setSelectedIds(prev => prev.filter(id => !deletedIds.includes(id)));
      if (countFail > 0) {
        showToast(`${countSuccess} supprimée(s), ${countFail} échouée(s).`, 'error');
      } else {
        showToast(`${countSuccess} réservations supprimées du planning.`, 'success', 'deleted');
      }
    } finally {
      setConfirmingAction(false);
      setPendingConfirmation(null);
    }
  };
  // 4. Individual Actions
  const handleSingleComplete = async (id: string) => {
    const result = await onCompleteAppointment(id, { silent: true });
    if (result.ok) {
      showToast('Crédit déduit et statut de la séance mis à jour.', 'success', 'completed');
    } else {
      showToast(result.error || 'Validation impossible.', 'error');
    }
  };

  const handleSingleCancel = async (id: string) => {
    const result = await onCancelAppointment(id, { silent: true });
    if (result.ok) {
      showToast('La place est libérée et le planning est mis à jour.', 'success', 'cancelled');
    } else {
      showToast(result.error || 'Annulation impossible.', 'error');
    }
  };

  const handleSingleDelete = (id: string) => {
    setPendingConfirmation({ kind: 'delete-single', appointmentId: id });
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
      showToast('Les changements ont été enregistrés dans le planning.', 'success', 'updated');
    } else {
      showToast(result.error || 'Mise à jour impossible.', 'error');
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
      showToast('Aucun rendez-vous éligible (planifié) sélectionné.', 'error');
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
      showToast(`${countSuccess} validée(s), ${countFail} échouée(s) (absence de forfait/crédits).`, 'error');
    } else {
      showToast(`${countSuccess} séances validées avec déduction des crédits.`, 'success', 'bulk');
    }
  };

  const handleBulkCancel = async () => {
    const eligibleBookings = appointments.filter(a => selectedIds.includes(a.id) && a.status === 'booked');
    if (eligibleBookings.length === 0) {
      showToast('Aucune séance planifiée éligible pour annulation.', 'error');
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
      showToast(`${countSuccess} annulée(s), ${countFail} échouée(s).`, 'error');
    } else {
      showToast(`${countSuccess} séances annulées et places libérées.`, 'success', 'bulk');
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showToast('Aucune réservation sélectionnée.', 'error');
      return;
    }
    setPendingConfirmation({ kind: 'delete-bulk', appointmentIds: [...selectedIds] });
  };

  // Booking Requests handlers
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getServiceForBookingRequest = (req: BookingRequest) => {
    const requestedService = req.service.toLowerCase();
    return services.find(
      s => s.type === req.service || s.name.toLowerCase().includes(requestedService)
    );
  };

  const getEmailWarningMessage = (result: { sent: boolean; skipped?: string; error?: string }) => {
    if (result.sent) return '';
    if (result.error) return ` Email client non envoyé : ${result.error}`;
    if (result.skipped === 'missing_recipient') return " Aucun e-mail client n'est renseigné.";
    if (result.skipped) return ` Email client non envoyé (${result.skipped}).`;
    return " Email client non envoyé.";
  };

  const handleAcceptBookingRequest = async (req: BookingRequest) => {
    setProcessingId(req.id);
    try {
      if (req.centerId !== centerId) {
        throw new Error("Cette demande n'appartient pas à votre centre.");
      }
      if (req.status !== 'pending') {
        throw new Error("Cette demande a déjà été traitée.");
      }

      const matchedService = getServiceForBookingRequest(req);
      if (!matchedService) {
        throw new Error('Aucune prestation CRM ne correspond à cette demande.');
      }

      const existingClient = clients.find(
        c => c.phone === req.phone && c.centerId === centerId
      );
      const appointmentId = `apt-${req.id}`;
      const processedAt = new Date().toISOString();
      const transactionResult = await acceptBookingRequestInTransaction(db, {
        requestId: req.id,
        centerId,
        existingClientId: existingClient?.id,
        newClientId: `cli-${req.id}`,
        appointmentId,
        serviceId: matchedService.id,
        duration: matchedService.duration || 20,
        createdAt: getTodayDateString(),
        processedAt,
        audit: {
          userId,
          userName,
          userRole: 'center_manager',
          centerName: currentCenter?.name,
        },
      });

      const emailResult = await notifyCrmEmail({
        type: 'booking_request_accepted',
        centerId,
        requestId: req.id,
        appointmentId: transactionResult.appointmentId,
      }).catch(error => ({
        sent: false,
        error: getErrorMessage(error, 'Notification email impossible.'),
      }));

      const warning = getEmailWarningMessage(emailResult);
      showToast(
        `${req.firstName} ${req.lastName} est ajouté au planning.${warning}`,
        warning ? 'warning' : 'success',
        'booking-request',
        warning ? 'Pré-réservation acceptée, email à vérifier' : 'Pré-réservation acceptée'
      );
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
      const processedAt = new Date().toISOString();
      await rejectBookingRequestInTransaction(db, {
        requestId: req.id,
        centerId,
        processedAt,
        audit: {
          userId,
          userName,
          userRole: 'center_manager',
          centerName: currentCenter?.name,
        },
      });

      const emailResult = await notifyCrmEmail({
        type: 'booking_request_rejected',
        centerId,
        requestId: req.id,
      }).catch(error => ({
        sent: false,
        error: getErrorMessage(error, 'Notification email impossible.'),
      }));

      const warning = getEmailWarningMessage(emailResult);
      showToast(
        `La demande de ${req.firstName} ${req.lastName} est refusée et la place est libérée.${warning}`,
        warning ? 'warning' : 'success',
        'cancelled',
        warning ? 'Pré-réservation refusée, email à vérifier' : 'Pré-réservation refusée'
      );
    } catch (error) {
      showToast(getErrorMessage(error, 'Erreur lors du traitement.'), 'error');
    } finally {
      setProcessingId(null);
    }
  };
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');

  return (
    <div id="manager-schedule-view-container" className="space-y-6">
      
      <ProfessionalToast
        toast={toast}
        onDismiss={() => setToast(null)}
        id="manager-schedule-toast"
      />
      {confirmationCopy && (
        <ProfessionalConfirmDialog
          open={Boolean(pendingConfirmation)}
          title={confirmationCopy.title}
          description={confirmationCopy.description}
          confirmLabel={confirmationCopy.confirmLabel}
          cancelLabel="Garder"
          tone="danger"
          loading={confirmingAction}
          id="manager-schedule-confirm-dialog"
          onCancel={() => {
            if (!confirmingAction) {
              setPendingConfirmation(null);
            }
          }}
          onConfirm={executePendingConfirmation}
        />
      )}
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
        onExportClick={handleExportCSV}
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
          currentCenter={currentCenter}
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
        currentCenter={currentCenter}
      />
    </div>
  );
}