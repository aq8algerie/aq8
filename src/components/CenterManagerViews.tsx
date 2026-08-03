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
import { findActivePackageForClientAndService, isPackageCompatibleWithService, isPackageExpired } from '../lib/packageRules';
import { AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { notifyCrmEmailBestEffort } from '../lib/emailNotificationClient';
import { updateCenterSettings } from '../lib/centerSettingsClient';
import {
  AppointmentMutationOptions,
  cancelAppointmentInTransaction,
  createAppointmentInTransaction,
  CrmActionResult,
  getErrorMessage,
  updateAppointmentInTransaction
} from '../lib/crmTransactions';
import { runCrmOperation } from '../lib/crmOperationsClient';
import { mutateClientRecords } from '../lib/clientRecordsClient';

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

  const handleSaveCenterUpdate = async (
    payload: Partial<Center>,
    successMessage: string,
    successTitle: string,
  ): Promise<CrmActionResult> => {
    if (!currentCenter) {
      const message = 'Centre introuvable.';
      triggerToast(message, 'error');
      return { ok: false, error: message };
    }

    try {
      await updateCenterSettings(centerId, payload);
      triggerToast(successMessage, 'success', 'updated', successTitle);
      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, 'Erreur lors de la mise à jour du centre.');
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
      'Paramètres de réservation mis à jour.',
      'Paramètres enregistrés',
    );
  };

  const handleSaveCenterProfile = async (settings: Partial<Center>): Promise<CrmActionResult> => (
    handleSaveCenterUpdate(
      settings,
      'Informations du centre mises à jour.',
      'Centre mis à jour',
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
    ? `Paiement de ${pendingPaymentDelete.amount.toLocaleString()} DZD${pendingPaymentClient ? ` pour ${pendingPaymentClient.firstName} ${pendingPaymentClient.lastName}` : ``}. Il sera retiré du registre des encaissements.`
    : 'Cet encaissement sera retiré du registre des encaissements.';

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
    ? 'Archiver ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?'
    : pendingClientAction?.status === 'suspended'
      ? 'Suspendre ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?'
      : 'Réactiver ' + (pendingClientCount > 1 ? 'ces clients' : 'ce client') + ' ?';
  const pendingClientActionDescription = pendingClientAction?.kind === 'delete'
    ? pendingClientNames + pendingClientSuffix + ' sera archivé et masqué des listes actives. Les historiques resteront conservés.'
    : pendingClientAction?.status === 'suspended'
      ? pendingClientNames + pendingClientSuffix + ' ne pourra plus être utilisé pour de nouvelles actions opérationnelles tant qu’il reste suspendu.'
      : pendingClientNames + pendingClientSuffix + ' sera réactivé dans le fichier clients.';

  const confirmPaymentDelete = async () => {
    if (!pendingPaymentDeleteId || confirmingPaymentDelete) return;
    setConfirmingPaymentDelete(true);

    try {
      const payment = payments.find(candidate => candidate.id === pendingPaymentDeleteId);
      if (!payment || payment.kind === 'reversal' || payment.status === 'reversed') {
        throw new Error('Cet encaissement ne peut pas être annulé.');
      }
      await runCrmOperation({
        action: 'reverse_payment',
        centerId,
        paymentId: pendingPaymentDeleteId,
        reason: 'Annulation demandée depuis le registre manager',
      });
      triggerToast(
        'Une écriture inverse a été créée. Le paiement original reste traçable.',
        'success',
        'payment',
        'Encaissement annulé',
      );
    } catch (error) {
      triggerToast(getErrorMessage(error, "Erreur lors de l'annulation de l'encaissement."), 'error');
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
      triggerToast('Aucun client valide sélectionné.', 'error');
      return;
    }
    setPendingClientAction({ kind: 'status', clientIds: Array.from(new Set(scopedIds)), status });
  };

  const requestClientDelete = (clientIds: string[]) => {
    const scopedIds = clientIds.filter(clientId => centerClients.some(client => client.id === clientId));
    if (scopedIds.length === 0) {
      triggerToast('Aucun client valide sélectionné.', 'error');
      return;
    }
    setPendingClientAction({ kind: 'delete', clientIds: Array.from(new Set(scopedIds)) });
  };

  const confirmClientAction = async () => {
    if (!pendingClientAction || confirmingClientAction) return;
    setConfirmingClientAction(true);

    try {
      if (pendingClientAction.kind === 'delete') {
        await mutateClientRecords({
          action: 'archive',
          centerId,
          clientIds: pendingClientAction.clientIds,
        });
        if (selectedClientId && pendingClientAction.clientIds.includes(selectedClientId)) {
          setSelectedClientId(null);
        }
        triggerToast(
          pendingClientAction.clientIds.length + ' client' + (pendingClientAction.clientIds.length > 1 ? 's archivés.' : ' archivé.'),
          'success',
          'deleted',
          'Client archivé',
        );
      } else {
        await mutateClientRecords({
          action: 'set_status',
          centerId,
          clientIds: pendingClientAction.clientIds,
          status: pendingClientAction.status,
        });
        triggerToast(
          pendingClientAction.status === 'suspended' ? 'Client suspendu avec succès.' : 'Client réactivé avec succès.',
          'success',
          'updated',
          pendingClientAction.status === 'suspended' ? 'Client suspendu' : 'Client réactivé',
        );
      }
    } catch (error) {
      triggerToast(getErrorMessage(error, 'Action client impossible.'), 'error');
    } finally {
      setConfirmingClientAction(false);
      setPendingClientAction(null);
    }
  };

  const handleClientSubmit = async (clientData: {
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
    if (editingClient && editingClient.centerId !== centerId) {
      triggerToast('Ce client ne peut pas être modifié depuis ce centre.', 'error');
      return;
    }

    try {
      const result = await mutateClientRecords<{
        ok: true;
        created: boolean;
        client: Client;
      }>({
        action: 'upsert',
        centerId,
        client: {
          ...(editingClient ? { id: editingClient.id } : {}),
          ...clientData,
        },
      });
      closeClientModal();
      triggerToast(
        result.created
          ? `Adhérent ${result.client.firstName} ${result.client.lastName} enregistré.`
          : `Fiche de ${result.client.firstName} ${result.client.lastName} mise ? jour.`,
        'success',
        result.created ? undefined : 'updated',
        result.created ? 'Client enregistré' : 'Client modifié',
      );
    } catch (error) {
      triggerToast(getErrorMessage(error, 'Enregistrement du client impossible.'), 'error');
    }
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
      triggerToast('Rendez-vous planifié avec succès !');
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
    if (!apt) return fail('Réservation introuvable.');

    if (apt.status !== 'booked') {
      return fail('Cette séance a déjà été validée ou annulée.');
    }

    const service = services.find(candidate => candidate.id === apt.serviceId);
    if (!service) {
      return fail('La prestation associée à cette séance est introuvable.');
    }

    const activePkg = findActivePackageForClientAndService(
      apt.clientId,
      service,
      clientPackages,
      packages
    );

    if (!activePkg) {
      const expiredCompatiblePackage = clientPackages.some(clientPackage =>
        clientPackage.clientId === apt.clientId &&
        clientPackage.status === 'active' &&
        isPackageExpired(clientPackage) &&
        isPackageCompatibleWithService(clientPackage, service, packages)
      );
      const serviceLabel = service.type === 'aq8' ? 'AQ8' : 'Wonder';
      return fail(expiredCompatiblePackage
        ? `Forfait ${serviceLabel} expiré : renouvelez-le avant de valider cette séance.`
        : `Aucun forfait ${serviceLabel} actif avec un crédit disponible.`
      );
    }

    try {
      const completion = await runCrmOperation<{
        sessionsRemaining: number;
        clientPackageId: string;
        packageStatus: ClientPackage['status'];
      }>({
        action: 'complete_appointment',
        appointmentId: apt.id,
        centerId,
        clientPackageId: activePkg.id,
      });



      if (!options.silent) {
        triggerToast('Séance validée, crédit déduit et opération auditée.', 'success', 'completed');
      }
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la validation de la séance.'));
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
    if (!apt) return fail('Réservation introuvable.');

    if (apt.centerId !== centerId) {
      return fail("Cette réservation n'appartient pas à votre centre.");
    }

    try {
      await cancelAppointmentInTransaction(db, {
        appointmentId: apt.id,
        centerId,
        audit: {
          userId,
          userName,
          userRole: 'center_manager',
          centerName: currentCenter?.name,
        },
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_cancelled',
        centerId,
        appointmentId: apt.id,
      });

      if (!options.silent) {
        triggerToast('Séance annulée avec succès.');
      }
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, "Erreur lors de l'annulation de la séance."));
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
      return fail("Cette réservation n'appartient pas à votre centre.");
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
        return fail(validation.error || 'Réservation invalide.');
      }
    }

    try {
      await updateAppointmentInTransaction(db, {
        ...appointmentToSave,
        updatedAt: new Date().toISOString(),
        audit: {
          userId,
          userName,
          userRole: 'center_manager',
          centerName: currentCenter?.name,
        },
      });

      notifyCrmEmailBestEffort({
        type: 'appointment_updated',
        centerId,
        appointmentId: appointmentToSave.id,
      });

      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la mise à jour de la réservation.'));
    }
  };



  // 5. Package assignments
  const handlePackageAssignSubmit = async (data: {
    clientPackageId: string;
    clientId: string;
    packageId: string;
  }): Promise<CrmActionResult> => {
    const client = centerClients.find(candidate => candidate.id === data.clientId);
    if (!client) {
      const message = 'Client introuvable dans ce centre.';
      triggerToast(message, 'error');
      return { ok: false, error: message };
    }

    try {
      const result = await runCrmOperation<{
        clientPackageId: string;
        created: boolean;
      }>({
        action: 'assign_package',
        clientPackageId: data.clientPackageId,
        centerId,
        clientId: data.clientId,
        packageId: data.packageId,
        purchaseDate: getTodayDateString(),
      });



      setShowPackageAssignModal(false);
      triggerToast(
        result.created
          ? 'Forfait activé et opération auditée avec succès.'
          : 'Ce forfait était déjà activé : aucun doublon créé.',
        result.created ? 'success' : 'warning',
        'package',
        result.created ? 'Forfait activé' : 'Activation déjà traitée'
      );
      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, "Erreur lors de l'affectation du forfait.");
      triggerToast(message, 'error');
      return { ok: false, error: message };
    }
  };
  // 6. Payment logging
  const handlePaymentSubmit = async (payData: {
    paymentId: string;
    clientId: string;
    packageId: string;
    amount: number;
    method: 'cash' | 'card' | 'ccp' | 'cheque';
    receiptNumber: string;
    autoActivatePackage: boolean;
  }): Promise<CrmActionResult> => {
    const operationSuffix = payData.paymentId.replace(/^pay-/, '');
    const clientPackageId = payData.autoActivatePackage
      ? `clipkg-${operationSuffix}`
      : undefined;
    const receiptSuffix = operationSuffix.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    const generatedReceipt = payData.receiptNumber || `REC-${receiptSuffix}`;

    try {
      const result = await runCrmOperation<{
        paymentId: string;
        clientPackageId?: string;
        packageActivated: boolean;
        created: boolean;
      }>({
        action: 'record_payment',
        paymentId: payData.paymentId,
        clientPackageId,
        centerId,
        clientId: payData.clientId,
        packageId: payData.packageId,
        amount: payData.amount,
        method: payData.method,
        receiptNumber: generatedReceipt,
        date: getTodayDateString(),
        autoActivatePackage: payData.autoActivatePackage,
      });



      setShowPaymentModal(false);
      triggerToast(
        result.created
          ? `Paiement de ${payData.amount.toLocaleString()} DZD enregistré${result.packageActivated ? ' et forfait activé' : ''}.`
          : 'Ce paiement était déjà enregistré : aucune opération supplémentaire créée.',
        result.created ? 'success' : 'warning',
        result.packageActivated ? 'package' : 'payment',
        result.created ? 'Encaissement sécurisé' : 'Paiement déjà traité'
      );
      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, "Erreur lors de l'enregistrement du paiement.");
      triggerToast(message, 'error');
      return { ok: false, error: message };
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

  // --- NOTIFICATIONS INTERNES ---

  // 1. Badge "Réservations": nombre de demandes en attente pour ce centre
  const centerBookingRequests = bookingRequests.filter(r => r.centerId === centerId);
  const pendingRequestsCount = centerBookingRequests.filter(r => r.status === 'pending').length;

  // 2. Parmi les demandes en attente, identifier celles de clients sans forfait valide
  const centerClientPackages = clientPackages.filter(cp =>
    centerClients.some(c => c.id === cp.clientId)
  );

  const pendingRequestsWithoutCredit = centerBookingRequests.filter(r => {
    if (r.status !== 'pending') return false;
    // Find client by phone number
    const client = centerClients.find(c => c.phone === r.phone);
    if (!client) return false; // New/unknown client — no credit by definition
    const hasValidPackage = centerClientPackages.some(cp =>
      cp.clientId === client.id &&
      cp.status === 'active' &&
      cp.sessionsRemaining > 0 &&
      !isPackageExpired(cp)
    );
    return !hasValidPackage;
  });
  const noCreditPendingCount = pendingRequestsWithoutCredit.length;

  // Badges map for ManagerTabs
  const tabBadges: Partial<Record<SubTabId, number>> = {};
  if (pendingRequestsCount > 0) tabBadges.bookings = pendingRequestsCount;

  return (
    <div id="center-manager-views-container" className="space-y-6">
      <ProfessionalToast
        toast={feedback}
        onDismiss={() => setFeedback(null)}
        id="center-manager-toast"
      />
      <ProfessionalConfirmDialog
        open={Boolean(pendingPaymentDeleteId)}
        title="Annuler cet encaissement ?"
        description={pendingPaymentDeleteDescription}
        confirmLabel="Créer l’annulation"
        cancelLabel="Conserver"
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
        confirmLabel={pendingClientAction?.kind === 'delete' ? 'Archiver' : pendingClientAction?.status === 'suspended' ? 'Suspendre' : 'Réactiver'}
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

      {/* Bannière de notification: RDV en attente sans crédit */}
      {noCreditPendingCount > 0 && (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
          <div className="h-8 w-8 shrink-0 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900">
              <span className="font-mono">{noCreditPendingCount}</span> demande{noCreditPendingCount > 1 ? 's' : ''} en attente de client{noCreditPendingCount > 1 ? 's' : ''} sans forfait valide
            </p>
            <p className="text-amber-700 font-medium leading-snug mt-0.5">
              Ces adhérent{noCreditPendingCount > 1 ? 's ont' : ' a'} pris un rendez-vous en ligne malgré un solde vide ou expiré. 
              Lors de la séance, veillez à régulariser le paiement du forfait.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('bookings')}
            className="shrink-0 px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl transition cursor-pointer text-[10px] whitespace-nowrap"
          >
            Voir les demandes
          </button>
        </div>
      )}

      {/* Top Header Location Banner */}
      <ManagerTopBanner currentCenter={currentCenter} />

      {/* Primary Subtab navigation */}
      {!activeTab && (
        <ManagerTabs
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          onClearSelectedClient={() => setSelectedClientId(null)}
          badges={tabBadges}
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
                center={currentCenter}
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
                appointments={appointments}
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
                onCompleteAppointment={handleCompleteAppointment}
                onCancelAppointment={handleCancelAppointment}
                onUpdateAppointment={handleUpdateAppointment}
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
                onReversePayment={(payId) => {
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
