/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { logCrmAction } from '../lib/auditLogger';
import {
  Center,
  Client,
  ClientStatus,
  Appointment,
  ClientPackage,
  Package,
  Payment,
  Measurement,
  Service,
  BookingRequest
} from '../types';

// Manager subviews
import { ManagerTopBanner } from './manager/ManagerTopBanner';
import { ManagerTabs, SubTabId } from './manager/ManagerTabs';
import { ManagerDashboard } from './manager/ManagerDashboard';
import { ManagerScheduleView } from './manager/ManagerScheduleView';
import { ManagerClientsView } from './manager/ManagerClientsView';
import { ManagerBookingsView } from './manager/ManagerBookingsView';
import { ManagerPaymentsView } from './manager/ManagerPaymentsView';
import { ManagerServicesView } from './manager/ManagerServicesView';
import { ManagerSettingsView } from './manager/ManagerSettingsView';
import { ClientProfileView } from './manager/ClientProfileView';
import { ProfessionalConfirmDialog } from './manager/ProfessionalConfirmDialog';
import { ProfessionalToast, ProfessionalToastState, ToastAction, ToastType } from './manager/ProfessionalToast';

// Manager modals
import { ClientModal } from './manager/modals/ClientModal';
import { AppointmentModal } from './manager/modals/AppointmentModal';
import { PackageAssignModal } from './manager/modals/PackageAssignModal';
import { PaymentModal } from './manager/modals/PaymentModal';
import { MeasurementModal } from './manager/modals/MeasurementModal';

// Utilities & Business rules
import { getTodayDateString } from '../lib/centerManagerUtils';
import { validateAppointment } from '../lib/appointmentRules';
import { findActivePackageForClient, validateDeduction } from '../lib/packageRules';
import { db } from '../lib/firebase';
import { notifyCrmEmailBestEffort } from '../lib/emailNotificationClient';
import { doc, updateDoc } from 'firebase/firestore';
import {
  AppointmentMutationOptions,
  assignPackageToClient,
  cancelAppointmentInTransaction,
  completeAppointmentWithSessionDeduction,
  createAppointmentInTransaction,
  CrmActionResult,
  deleteAppointmentInTransaction,
  getErrorMessage,
  recordPaymentWithOptionalPackage,
  updateAppointmentInTransaction
} from '../lib/crmTransactions';

type PendingClientAction =
  | { kind: 'delete'; clientIds: string[] }
  | { kind: 'status'; clientIds: string[]; status: ClientStatus };

export function CenterManagerViews({
  centerId,
  centers,
  clients,
  appointments,
  packages,
  clientPackages,
  payments,
  measurements,
  services,
  bookingRequests = [],
  onUpdateClients,
  onUpdatePayments,
  onUpdateMeasurements,
  activeTab,
  onTabChange,
  userId,
  userName
}: {
  centerId: string;
  centers: Center[];
  clients: Client[];
  appointments: Appointment[];
  packages: Package[];
  clientPackages: ClientPackage[];
  payments: Payment[];
  measurements: Measurement[];
  services: Service[];
  bookingRequests?: BookingRequest[];
  onUpdateClients: (clients: Client[]) => void;
  onUpdatePayments: (payments: Payment[]) => void;
  onUpdateMeasurements: (measurements: Measurement[]) => void;
  activeTab?: SubTabId;
  onTabChange?: (tab: SubTabId) => void;
  userId: string;
  userName: string;
}) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<SubTabId>('dashboard');
  const activeSubTab = activeTab || localActiveSubTab;
  const setActiveSubTab = (tabId: SubTabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setLocalActiveSubTab(tabId);
    }
  };

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [pendingClientAction, setPendingClientAction] = useState<PendingClientAction | null>(null);
  const [confirmingClientAction, setConfirmingClientAction] = useState(false);

  // Clear selected client when tab changes
  React.useEffect(() => {
    setSelectedClientId(null);
  }, [activeSubTab]);

  // Dynamic system date for default filters
  const [bookingDateFilter, setBookingDateFilter] = useState(getTodayDateString());

  // Modal display toggles
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAptModal, setShowAptModal] = useState(false);
  const [showPackageAssignModal, setShowPackageAssignModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // Pre-selected client state for modals
  const [pkgAssignClientId, setPkgAssignClientId] = useState<string>('');
  const [payClientId, setPayClientId] = useState<string>('');
  const [measClientId, setMeasClientId] = useState<string>('');

  // Professional toast feedback
  const [feedback, setFeedback] = useState<ProfessionalToastState | null>(null);
  const [pendingPaymentDeleteId, setPendingPaymentDeleteId] = useState<string | null>(null);
  const [confirmingPaymentDelete, setConfirmingPaymentDelete] = useState(false);

  const triggerToast = (message: string, type: ToastType = 'success', action?: ToastAction, title?: string) => {
    setFeedback({ message, type, action, title });
    setTimeout(() => {
      setFeedback(null);
    }, 4200);
  };

  // Find center metadata
  const currentCenter = centers.find(c => c.id === centerId) || centers[0];

  const handleSaveCenterUpdate = async (payload: Partial<Center>, successMessage: string, successTitle: string): Promise<CrmActionResult> => {
    if (!currentCenter) {
      const message = 'Centre introuvable.';
      triggerToast(message, 'error');
      return { ok: false, error: message };
    }

    try {
      await updateDoc(doc(db, 'centers', centerId), {
        ...payload,
        updatedAt: new Date().toISOString(),
      });
      triggerToast(successMessage, 'success', 'updated', successTitle);
      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, 'Erreur lors de la mise a jour du centre.');
      triggerToast(message, 'error');
      return { ok: false, error: message };
    }
  };

  const handleSaveBookingSettings = async (settings: {
    bookingCapacity: Center['bookingCapacity'];
    bookingHours: Center['bookingHours'];
  }): Promise<CrmActionResult> => {
    return handleSaveCenterUpdate(
      {
        bookingCapacity: settings.bookingCapacity,
        bookingHours: settings.bookingHours,
      },
      'Parametres de reservation mis a jour.',
      'Parametres enregistres'
    );
  };

  const handleSaveCenterProfile = async (settings: Partial<Center>): Promise<CrmActionResult> => (
    handleSaveCenterUpdate(
      settings,
      'Informations du centre mises a jour.',
      'Centre mis a jour'
    )
  );

  // Custom center services filtering & pricing
  const centerServices = services
    .filter(s => {
      if (currentCenter?.customActiveServices) {
        return currentCenter.customActiveServices.includes(s.id);
      }
      return currentCenter?.services.includes(s.type);
    })
    .map(s => {
      const customPrice = currentCenter?.customServicePrices?.[s.id];
      return {
        ...s,
        price: customPrice !== undefined ? customPrice : 0
      };
    });

  // Custom center packages filtering & pricing
  const centerPackages = packages
    .filter(p => {
      if (currentCenter?.customActivePackages) {
        return currentCenter.customActivePackages.includes(p.id);
      }
      if (p.type === 'mix') {
        return currentCenter?.services.includes('aq8') && currentCenter?.services.includes('wonder');
      }
      return currentCenter?.services.includes(p.type);
    })
    .map(p => {
      const customPrice = currentCenter?.customPackagePrices?.[p.id];
      return {
        ...p,
        price: customPrice !== undefined ? customPrice : 0
      };
    });

  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerActiveClients = centerClients.filter(client => client.status !== 'suspended');
  const pendingPaymentDelete = pendingPaymentDeleteId
    ? payments.find(payment => payment.id === pendingPaymentDeleteId)
    : null;
  const pendingPaymentClient = pendingPaymentDelete
    ? centerClients.find(client => client.id === pendingPaymentDelete.clientId)
    : null;
  const pendingPaymentDeleteDescription = pendingPaymentDelete
    ? `Paiement de ${pendingPaymentDelete.amount.toLocaleString()} DZD${pendingPaymentClient ? ` pour ${pendingPaymentClient.firstName} ${pendingPaymentClient.lastName}` : ``}. Il sera retire du registre des encaissements.`
    : 'Cet encaissement sera retire du registre des encaissements.';

  const pendingClientActionClients = pendingClientAction
    ? pendingClientAction.clientIds
        .map(clientId => centerClients.find(client => client.id === clientId))
        .filter((client): client is Client => Boolean(client))
    : [];
  const pendingClientCount = pendingClientActionClients.length;
  const pendingClientNames = pendingClientActionClients
    .slice(0, 3)
    .map(client => [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.phone || client.email || 'Client sans nom')
    .join(', ');
  const pendingClientSuffix = pendingClientCount > 3 ? ' et ' + (pendingClientCount - 3) + ' autre(s)' : '';
  const pendingClientActionTitle = pendingClientAction?.kind === 'delete'
    ? 'Supprimer ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?'
    : pendingClientAction?.status === 'suspended'
      ? 'Suspendre ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?'
      : 'Reactiver ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?';
  const pendingClientActionDescription = pendingClientAction?.kind === 'delete'
    ? pendingClientNames + pendingClientSuffix + ' sera retire du fichier clients du centre. Les historiques deja enregistres peuvent rester visibles dans les autres modules.'
    : pendingClientAction?.status === 'suspended'
      ? pendingClientNames + pendingClientSuffix + ' ne pourra plus etre utilise pour de nouvelles actions operationnelles tant qu il reste suspendu.'
      : pendingClientNames + pendingClientSuffix + ' sera reactif dans le fichier clients.';

  const confirmPaymentDelete = () => {
    if (!pendingPaymentDeleteId || confirmingPaymentDelete) return;
    setConfirmingPaymentDelete(true);

    try {
      const p = payments.find(payment => payment.id === pendingPaymentDeleteId);
      const cl = p ? clients.find(client => client.id === p.clientId) : null;
      logCrmAction(userId, userName, 'center_manager', {
        action: 'DELETE_PAYMENT',
        details: `Suppression de l'encaissement de ${p?.amount || 0} DZD${cl ? ` pour le client ${cl.firstName} ${cl.lastName}` : ''}`,
        targetId: pendingPaymentDeleteId,
        targetType: 'payment',
        centerId,
        centerName: currentCenter?.name
      });

      const updated = payments.filter(payment => payment.id !== pendingPaymentDeleteId);
      onUpdatePayments(updated);
      triggerToast('Encaissement supprime avec succes.', 'success', 'payment', 'Encaissement supprime');
    } finally {
      setConfirmingPaymentDelete(false);
      setPendingPaymentDeleteId(null);
    }
  };

  const closeClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const openCreateClientModal = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const openEditClientModal = (clientId: string) => {
    const client = centerClients.find(candidate => candidate.id === clientId);
    if (!client) {
      triggerToast('Client introuvable dans ce centre.', 'error');
      return;
    }
    setEditingClient(client);
    setShowClientModal(true);
  };

  const requestClientStatusChange = (clientIds: string[], status: ClientStatus) => {
    const scopedIds = clientIds.filter(clientId => centerClients.some(client => client.id === clientId));
    if (scopedIds.length === 0) {
      triggerToast('Aucun client valide selectionne.', 'error');
      return;
    }
    setPendingClientAction({ kind: 'status', clientIds: Array.from(new Set(scopedIds)), status });
  };

  const requestClientDelete = (clientIds: string[]) => {
    const scopedIds = clientIds.filter(clientId => centerClients.some(client => client.id === clientId));
    if (scopedIds.length === 0) {
      triggerToast('Aucun client valide selectionne.', 'error');
      return;
    }
    setPendingClientAction({ kind: 'delete', clientIds: Array.from(new Set(scopedIds)) });
  };

  const confirmClientAction = () => {
    if (!pendingClientAction || confirmingClientAction) return;
    setConfirmingClientAction(true);

    try {
      const actionIds = new Set(pendingClientAction.clientIds);
      const timestamp = new Date().toISOString();

      if (pendingClientAction.kind === 'delete') {
        onUpdateClients(clients.filter(client => !(actionIds.has(client.id) && client.centerId === centerId)));
        
        pendingClientAction.clientIds.forEach(cId => {
          const clObj = clients.find(client => client.id === cId);
          logCrmAction(userId, userName, 'center_manager', {
            action: 'DELETE_CLIENT',
            details: `Suppression du client : ${clObj ? `${clObj.firstName} ${clObj.lastName}` : cId}`,
            targetId: cId,
            targetType: 'client',
            centerId,
            centerName: currentCenter?.name
          });
        });

        if (selectedClientId && actionIds.has(selectedClientId)) {
          setSelectedClientId(null);
        }
        triggerToast(
          actionIds.size + ' client' + (actionIds.size > 1 ? 's' : '') + ' supprime' + (actionIds.size > 1 ? 's' : '') + '.',
          'success',
          'deleted',
          'Client supprime'
        );
      } else {
        onUpdateClients(clients.map(client => {
          if (!actionIds.has(client.id) || client.centerId !== centerId) return client;
          const nextClient: Client = {
            ...client,
            status: pendingClientAction.status,
            updatedAt: timestamp,
          };
          if (pendingClientAction.status === 'suspended') {
            nextClient.suspendedAt = timestamp;
          }
          return nextClient;
        }));

        pendingClientAction.clientIds.forEach(cId => {
          const clObj = clients.find(client => client.id === cId);
          const act = pendingClientAction.status === 'suspended' ? 'SUSPEND_CLIENT' : 'ACTIVATE_CLIENT';
          const dts = pendingClientAction.status === 'suspended'
            ? `Suspension du client : ${clObj ? `${clObj.firstName} ${clObj.lastName}` : cId}`
            : `Réactivation du client : ${clObj ? `${clObj.firstName} ${clObj.lastName}` : cId}`;
          
          logCrmAction(userId, userName, 'center_manager', {
            action: act,
            details: dts,
            targetId: cId,
            targetType: 'client',
            centerId,
            centerName: currentCenter?.name
          });
        });

        triggerToast(
          pendingClientAction.status === 'suspended' ? 'Client suspendu avec succes.' : 'Client reactive avec succes.',
          'success',
          'updated',
          pendingClientAction.status === 'suspended' ? 'Client suspendu' : 'Client reactive'
        );
      }
    } finally {
      setConfirmingClientAction(false);
      setPendingClientAction(null);
    }
  };

  const handleClientSubmit = (clientData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes: string;
    gender: 'H' | 'F';
    dob?: string;
    bloodType?: string;
    profession?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    medicalConditions?: string;
    sportGoals?: string[];
    avatarUrl?: string;
  }) => {
    const baseFields = {
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      email: clientData.email,
      phone: clientData.phone,
      notes: clientData.notes || undefined,
      gender: clientData.gender,
      dob: clientData.dob || undefined,
      bloodType: clientData.bloodType || undefined,
      profession: clientData.profession || undefined,
      emergencyContactName: clientData.emergencyContactName || undefined,
      emergencyContactPhone: clientData.emergencyContactPhone || undefined,
      medicalConditions: clientData.medicalConditions || undefined,
      sportGoals: clientData.sportGoals || [],
      avatarUrl: clientData.avatarUrl || undefined,
      updatedAt: new Date().toISOString()
    };

    if (editingClient) {
      if (editingClient.centerId !== centerId) {
        triggerToast('Ce client ne peut pas etre modifie depuis ce centre.', 'error');
        return;
      }

      const updatedClient: Client = {
        ...editingClient,
        ...baseFields,
        status: editingClient.status || 'active'
      };

      onUpdateClients(clients.map(client => client.id === editingClient.id ? updatedClient : client));
      
      logCrmAction(userId, userName, 'center_manager', {
        action: 'UPDATE_CLIENT',
        details: `Modification de la fiche du client : ${baseFields.firstName} ${baseFields.lastName}`,
        targetId: editingClient.id,
        targetType: 'client',
        centerId,
        centerName: currentCenter?.name
      });

      closeClientModal();
      triggerToast('Fiche de ' + updatedClient.firstName + ' ' + updatedClient.lastName + ' mise a jour.', 'success', 'updated', 'Client modifie');
      return;
    }

    const newClient: Client = {
      id: 'cli-' + Date.now(),
      ...baseFields,
      centerId,
      createdAt: getTodayDateString(),
      status: 'active'
    };

    onUpdateClients([...clients, newClient]);
    
    logCrmAction(userId, userName, 'center_manager', {
      action: 'CREATE_CLIENT',
      details: `Création du client : ${newClient.firstName} ${newClient.lastName}`,
      targetId: newClient.id,
      targetType: 'client',
      centerId,
      centerName: currentCenter?.name
    });

    closeClientModal();
    triggerToast('Adherent ' + newClient.firstName + ' ' + newClient.lastName + ' enregistre avec succes !');
  };
  // 2. Appointment booking actions
  const handleAptSubmit = async (aptData: {
    clientId: string;
    serviceId: string;
    date: string;
    time: string;
    notes: string;
  }) => {
    const clientObj = clients.find(c => c.id === aptData.clientId);
    const selectedService = services.find(s => s.id === aptData.serviceId);
    const dateTimeStr = `${aptData.date}T${aptData.time}`;

    const validation = validateAppointment(
      {
        clientId: aptData.clientId,
        serviceId: aptData.serviceId,
        centerId,
        dateTime: dateTimeStr,
        duration: selectedService ? selectedService.duration : 20
      },
      appointments,
      clientObj?.centerId || '',
      services,
      undefined,
      currentCenter
    );

    if (!validation.valid) {
      triggerToast(validation.error || 'Erreur lors de la planification du RDV.', 'error');
      return;
    }

    try {
      const appointmentId = `apt-${Date.now()}`;
      await createAppointmentInTransaction(db, {
        appointmentId,
        clientId: aptData.clientId,
        serviceId: aptData.serviceId,
        centerId,
        dateTime: dateTimeStr,
        duration: selectedService ? selectedService.duration : 20,
        notes: aptData.notes,
        createdAt: new Date().toISOString()
      });

      logCrmAction(userId, userName, 'center_manager', {
        action: 'CREATE_APPOINTMENT',
        details: `Planification d'un rendez-vous le ${aptData.date} à ${aptData.time} pour le client : ${clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : aptData.clientId}`,
        targetId: appointmentId,
        targetType: 'appointment',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_booked',
        centerId,
        appointmentId,
      });

      setShowAptModal(false);
      triggerToast('Rendez-vous planifie avec succes !');
    } catch (error) {
      triggerToast(getErrorMessage(error, 'Erreur lors de la planification du RDV.'), 'error');
    }
  };

  // 3. Complete and deduct session credit safely
  const handleCompleteAppointment = async (
    aptId: string,
    options: AppointmentMutationOptions = {}
  ): Promise<CrmActionResult> => {
    const fail = (message: string): CrmActionResult => {
      if (!options.silent) triggerToast(message, 'error');
      return { ok: false, error: message };
    };

    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return fail('Reservation introuvable.');

    if (apt.status !== 'booked') {
      return fail("La reservation n'est pas dans l'etat planifiee.");
    }

    const cl = clients.find(c => c.id === apt.clientId);
    const activePkg = findActivePackageForClient(apt.clientId, clientPackages);
    const validation = validateDeduction(apt, cl, activePkg, centerId);

    if (validation.valid === false || !activePkg) {
      return fail(validation.error || 'Erreur lors du traitement du forfait.');
    }

    try {
      const completion = await completeAppointmentWithSessionDeduction(db, {
        appointmentId: apt.id,
        centerId,
        clientPackageId: activePkg.id
      });

      logCrmAction(userId, userName, 'center_manager', {
        action: 'COMPLETE_APPOINTMENT',
        details: `Validation de la séance du ${apt.dateTime.replace('T', ' ')} pour le client : ${cl ? `${cl.firstName} ${cl.lastName}` : apt.clientId} (Forfait restant : ${completion.sessionsRemaining} séances)`,
        targetId: apt.id,
        targetType: 'appointment',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_completed',
        centerId,
        appointmentId: apt.id,
        sessionsRemaining: completion.sessionsRemaining,
      });

      if (!options.silent) {
        triggerToast('Seance validee et 1 credit deduit avec succes !');
      }
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la validation de la seance.'));
    }
  };

  // 4. Cancel appointment safely
  const handleCancelAppointment = async (
    aptId: string,
    options: AppointmentMutationOptions = {}
  ): Promise<CrmActionResult> => {
    const fail = (message: string): CrmActionResult => {
      if (!options.silent) triggerToast(message, 'error');
      return { ok: false, error: message };
    };

    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return fail('Reservation introuvable.');

    if (apt.centerId !== centerId) {
      return fail("Cette reservation n'appartient pas a votre centre.");
    }

    try {
      await cancelAppointmentInTransaction(db, {
        appointmentId: apt.id,
        centerId
      });

      const cl = clients.find(c => c.id === apt.clientId);
      logCrmAction(userId, userName, 'center_manager', {
        action: 'CANCEL_APPOINTMENT',
        details: `Annulation de la séance du ${apt.dateTime.replace('T', ' ')} pour le client : ${cl ? `${cl.firstName} ${cl.lastName}` : apt.clientId}`,
        targetId: apt.id,
        targetType: 'appointment',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_cancelled',
        centerId,
        appointmentId: apt.id,
      });

      if (!options.silent) {
        triggerToast('Seance annulee avec succes.');
      }
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, "Erreur lors de l'annulation de la seance."));
    }
  };

  const handleUpdateAppointment = async (appointment: Appointment): Promise<CrmActionResult> => {
    const fail = (message: string): CrmActionResult => ({ ok: false, error: message });

    const selectedService = services.find(s => s.id === appointment.serviceId);
    const clientObj = clients.find(c => c.id === appointment.clientId);
    const appointmentToSave: Appointment = {
      ...appointment,
      duration: selectedService ? selectedService.duration : appointment.duration || 20
    };

    if (appointmentToSave.centerId !== centerId) {
      return fail("Cette reservation n'appartient pas a votre centre.");
    }

    if (appointmentToSave.status !== 'cancelled') {
      const validation = validateAppointment(
        {
          clientId: appointmentToSave.clientId,
          serviceId: appointmentToSave.serviceId,
          centerId,
          dateTime: appointmentToSave.dateTime,
          duration: appointmentToSave.duration
        },
        appointments.filter(a => a.id !== appointmentToSave.id),
        clientObj?.centerId || '',
        services,
        undefined,
        currentCenter
      );

      if (!validation.valid) {
        return fail(validation.error || 'Reservation invalide.');
      }
    }

    try {
      await updateAppointmentInTransaction(db, {
        ...appointmentToSave,
        updatedAt: new Date().toISOString()
      });

      logCrmAction(userId, userName, 'center_manager', {
        action: 'UPDATE_APPOINTMENT',
        details: `Modification de la séance du client : ${clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : appointment.clientId} (Nouvelle date/heure : ${appointment.dateTime.replace('T', ' ')})`,
        targetId: appointment.id,
        targetType: 'appointment',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_updated',
        centerId,
        appointmentId: appointmentToSave.id,
      });

      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la mise a jour de la reservation.'));
    }
  };

  const handleDeleteAppointment = async (appointmentId: string): Promise<CrmActionResult> => {
    const fail = (message: string): CrmActionResult => ({ ok: false, error: message });

    try {
      const apt = appointments.find(a => a.id === appointmentId);
      const cl = apt ? clients.find(c => c.id === apt.clientId) : null;
      logCrmAction(userId, userName, 'center_manager', {
        action: 'DELETE_APPOINTMENT',
        details: `Suppression du rendez-vous du ${apt ? apt.dateTime.replace('T', ' ') : ''} pour le client : ${cl ? `${cl.firstName} ${cl.lastName}` : (apt?.clientId || '')}`,
        targetId: appointmentId,
        targetType: 'appointment',
        centerId,
        centerName: currentCenter?.name
      });

      await deleteAppointmentInTransaction(db, {
        appointmentId,
        centerId
      });
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la suppression de la reservation.'));
    }
  };

  // 5. Package assignments
  const handlePackageAssignSubmit = async (clientId: string, packageId: string) => {
    const client = centerClients.find(c => c.id === clientId);
    if (!client) {
      triggerToast('Client introuvable dans ce centre.', 'error');
      return;
    }

    try {
      const clientPackageId = `clipkg-${Date.now()}`;
      await assignPackageToClient(db, {
        clientPackageId,
        centerId,
        clientId,
        packageId,
        purchaseDate: getTodayDateString()
      });

      const pkg = packages.find(p => p.id === packageId);
      logCrmAction(userId, userName, 'center_manager', {
        action: 'ASSIGN_PACKAGE',
        details: `Affectation du forfait ${pkg?.name || packageId} au client : ${client ? `${client.firstName} ${client.lastName}` : clientId}`,
        targetId: clientPackageId,
        targetType: 'client_package',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'package_assigned',
        centerId,
        clientPackageId,
      });

      setShowPackageAssignModal(false);
      triggerToast('Forfait affecte avec succes au client !');
    } catch (error) {
      triggerToast(getErrorMessage(error, "Erreur lors de l'affectation du forfait."), 'error');
    }
  };

  // 6. Payment logging
  const handlePaymentSubmit = async (payData: {
    clientId: string;
    packageId: string;
    amount: number;
    method: 'cash' | 'card' | 'ccp' | 'cheque';
    receiptNumber: string;
    autoActivatePackage: boolean;
  }) => {
    const now = Date.now();
    const paymentId = `pay-${now}`;
    const clientPackageId = payData.autoActivatePackage ? `clipkg-${now}` : undefined;
    const generatedReceipt = payData.receiptNumber || `REC-${now.toString().slice(-6)}`;

    try {
      await recordPaymentWithOptionalPackage(db, {
        paymentId,
        clientPackageId,
        centerId,
        clientId: payData.clientId,
        packageId: payData.packageId,
        amount: payData.amount,
        method: payData.method,
        receiptNumber: generatedReceipt,
        date: getTodayDateString(),
        autoActivatePackage: payData.autoActivatePackage
      });

      const cl = clients.find(c => c.id === payData.clientId);
      const pkg = packages.find(p => p.id === payData.packageId);
      logCrmAction(userId, userName, 'center_manager', {
        action: 'RECORD_PAYMENT',
        details: `Enregistrement d'un paiement de ${payData.amount} DZD par ${payData.method} pour le client : ${cl ? `${cl.firstName} ${cl.lastName}` : payData.clientId}${pkg ? ` (Achat forfait : ${pkg.name})` : ''}`,
        targetId: paymentId,
        targetType: 'payment',
        centerId,
        centerName: currentCenter?.name
      });

      notifyCrmEmailBestEffort({
        type: 'payment_recorded',
        centerId,
        paymentId,
        ...(clientPackageId ? { clientPackageId } : {}),
      });

      setShowPaymentModal(false);
      triggerToast(`Paiement de ${payData.amount.toLocaleString()} DZD enregistre avec succes !`);
    } catch (error) {
      triggerToast(getErrorMessage(error, "Erreur lors de l'enregistrement du paiement."), 'error');
    }
  };

  // 7. Measurement logging
  const handleMeasurementSubmit = (measData: {
    clientId: string;
    weight: number;
    bodyFat?: number;
    muscleMass?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thighs?: number;
  }) => {
    const newMeas: Measurement = {
      id: `meas-${Date.now()}`,
      clientId: measData.clientId,
      centerId: centerId,
      date: getTodayDateString(),
      weight: measData.weight,
      bodyFat: measData.bodyFat,
      muscleMass: measData.muscleMass,
      chest: measData.chest,
      waist: measData.waist,
      hips: measData.hips,
      thighs: measData.thighs,
      loggedBy: 'Manager Centre'
    };

    onUpdateMeasurements([...measurements, newMeas]);

    const cl = clients.find(c => c.id === measData.clientId);
    logCrmAction(userId, userName, 'center_manager', {
      action: 'RECORD_MEASUREMENTS',
      details: `Enregistrement des mensurations (Poids : ${measData.weight} kg) pour le client : ${cl ? `${cl.firstName} ${cl.lastName}` : measData.clientId}`,
      targetId: newMeas.id,
      targetType: 'measurement',
      centerId,
      centerName: currentCenter?.name
    });

    setShowMeasurementModal(false);
    triggerToast('Mensurations enregistrées avec succès !');
  };

  // Select a client for deep-dive profiles
  const activeClient = centerClients.find(c => c.id === selectedClientId);

  return (
    <div id="center-manager-views-container" className="space-y-6">
      <ProfessionalToast
        toast={feedback}
        onDismiss={() => setFeedback(null)}
        id="center-manager-toast"
      />
      <ProfessionalConfirmDialog
        open={Boolean(pendingPaymentDeleteId)}
        title="Supprimer cet encaissement ?"
        description={pendingPaymentDeleteDescription}
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        tone="danger"
        loading={confirmingPaymentDelete}
        id="center-manager-payment-confirm-dialog"
        onCancel={() => {
          if (!confirmingPaymentDelete) {
            setPendingPaymentDeleteId(null);
          }
        }}
        onConfirm={confirmPaymentDelete}
      />
      <ProfessionalConfirmDialog
        open={Boolean(pendingClientAction)}
        title={pendingClientActionTitle}
        description={pendingClientActionDescription}
        confirmLabel={pendingClientAction?.kind === 'delete' ? 'Supprimer' : pendingClientAction?.status === 'suspended' ? 'Suspendre' : 'Reactiver'}
        cancelLabel="Annuler"
        tone={pendingClientAction?.kind === 'delete' ? 'danger' : 'warning'}
        loading={confirmingClientAction}
        id="center-manager-client-confirm-dialog"
        onCancel={() => {
          if (!confirmingClientAction) {
            setPendingClientAction(null);
          }
        }}
        onConfirm={confirmClientAction}
      />

      {/* Top Header Location Banner */}
      <ManagerTopBanner currentCenter={currentCenter} />

      {/* Primary Subtab navigation */}
      {!activeTab && (
        <ManagerTabs
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          onClearSelectedClient={() => setSelectedClientId(null)}
        />
      )}

      {/* Subtab Content Router */}
      <div id="manager-subtab-viewport" className="min-h-[400px]">
        {activeClient ? (
          /* Client Fiche (Bio Profile Detail) overrides typical tabs when active */
          <ClientProfileView
            client={activeClient}
            appointments={appointments}
            services={centerServices}
            clientPackages={clientPackages}
            packages={centerPackages}
            measurements={measurements}
            onBack={() => setSelectedClientId(null)}
            onAssignPackage={() => {
              setPkgAssignClientId(activeClient.id);
              setShowPackageAssignModal(true);
            }}
            onLogMeasurement={() => {
              setMeasClientId(activeClient.id);
              setShowMeasurementModal(true);
            }}
          />
        ) : (
          <>
            {activeSubTab === 'dashboard' && (
              <ManagerDashboard
                centerId={centerId}
                clients={clients}
                appointments={appointments}
                payments={payments}
                measurements={measurements}
                services={centerServices}
                packages={centerPackages}
                clientPackages={clientPackages}
                bookingDateFilter={bookingDateFilter}
                onCompleteAppointment={handleCompleteAppointment}
                onCancelAppointment={handleCancelAppointment}
                onOpenTab={setActiveSubTab}
                onRegisterClientClick={openCreateClientModal}
                onBookAppointmentClick={() => setShowAptModal(true)}
                onLogPaymentClick={() => setShowPaymentModal(true)}
                onLogMeasurementsClick={() => setShowMeasurementModal(true)}
              />
            )}

            {activeSubTab === 'schedule' && (
              <ManagerScheduleView
                centerId={centerId}
                clients={clients}
                appointments={appointments}
                services={centerServices}
                bookingDateFilter={bookingDateFilter}
                onBookingDateFilterChange={setBookingDateFilter}
                onCompleteAppointment={handleCompleteAppointment}
                onCancelAppointment={handleCancelAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                clientPackages={clientPackages}
                packages={centerPackages}
                onBookAppointmentClick={() => setShowAptModal(true)}
                bookingRequests={bookingRequests.filter(r => r.centerId === centerId)}
                currentCenter={currentCenter}
                userId={userId}
                userName={userName}
              />
            )}

            {activeSubTab === 'clients' && (
              <ManagerClientsView
                centerId={centerId}
                clients={clients}
                clientPackages={clientPackages}
                onSelectClient={setSelectedClientId}
                onEditClient={openEditClientModal}
                onUpdateClientStatus={requestClientStatusChange}
                onDeleteClients={requestClientDelete}
                onRegisterClientClick={openCreateClientModal}
              />
            )}

            {activeSubTab === 'bookings' && (
              <ManagerBookingsView
                centerId={centerId}
                clients={clients}
                appointments={appointments}
                services={centerServices}
                clientPackages={clientPackages}
                packages={centerPackages}
                onCompleteAppointment={handleCompleteAppointment}
                onCancelAppointment={handleCancelAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                onBookAppointmentClick={() => setShowAptModal(true)}
              />
            )}

            {activeSubTab === 'payments' && (
              <ManagerPaymentsView
                centerId={centerId}
                clients={clients}
                payments={payments}
                packages={centerPackages}
                onLogPaymentClick={() => {
                  setPayClientId('');
                  setShowPaymentModal(true);
                }}
                onDeletePayment={(payId) => {
                  setPendingPaymentDeleteId(payId);
                }}
                currentCenter={currentCenter}
              />
            )}

            {activeSubTab === 'services' && (
              <ManagerServicesView
                centerServices={centerServices}
                centerPackages={centerPackages}
              />
            )}

            {activeSubTab === 'settings' && (
              <ManagerSettingsView
                currentCenter={currentCenter}
                onSaveBookingSettings={handleSaveBookingSettings}
                onSaveCenterProfile={handleSaveCenterProfile}
              />
            )}
          </>
        )}
      </div>

      {/* --- ALL REGISTERED MODALS --- */}

      {showClientModal && (
        <ClientModal
          onClose={closeClientModal}
          onSubmit={handleClientSubmit}
          initialClient={editingClient || undefined}
          mode={editingClient ? 'edit' : 'create'}
        />
      )}

      {showAptModal && (
        <AppointmentModal
          clients={centerActiveClients}
          services={centerServices}
          appointments={appointments.filter(appointment => appointment.centerId === centerId)}
          centerId={centerId}
          onClose={() => setShowAptModal(false)}
          onSubmit={handleAptSubmit}
          initialDate={bookingDateFilter}
          center={currentCenter}
        />
      )}

      {showPackageAssignModal && (
        <PackageAssignModal
          clients={centerClients}
          packages={centerPackages}
          onClose={() => setShowPackageAssignModal(false)}
          onSubmit={handlePackageAssignSubmit}
          initialClientId={pkgAssignClientId || undefined}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          clients={centerClients}
          packages={centerPackages}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePaymentSubmit}
          initialClientId={payClientId || undefined}
        />
      )}

      {showMeasurementModal && (
        <MeasurementModal
          clients={centerClients}
          onClose={() => setShowMeasurementModal(false)}
          onSubmit={handleMeasurementSubmit}
          initialClientId={measClientId || undefined}
        />
      )}
    </div>
  );
}
