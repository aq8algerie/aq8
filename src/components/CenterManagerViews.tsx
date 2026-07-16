/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Center,
  Client,
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
  onTabChange
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
  const pendingPaymentDelete = pendingPaymentDeleteId
    ? payments.find(payment => payment.id === pendingPaymentDeleteId)
    : null;
  const pendingPaymentClient = pendingPaymentDelete
    ? centerClients.find(client => client.id === pendingPaymentDelete.clientId)
    : null;
  const pendingPaymentDeleteDescription = pendingPaymentDelete
    ? `Paiement de ${pendingPaymentDelete.amount.toLocaleString()} DZD${pendingPaymentClient ? ` pour ${pendingPaymentClient.firstName} ${pendingPaymentClient.lastName}` : ``}. Il sera retire du registre des encaissements.`
    : 'Cet encaissement sera retire du registre des encaissements.';

  const confirmPaymentDelete = () => {
    if (!pendingPaymentDeleteId || confirmingPaymentDelete) return;
    setConfirmingPaymentDelete(true);

    try {
      const updated = payments.filter(payment => payment.id !== pendingPaymentDeleteId);
      onUpdatePayments(updated);
      triggerToast('Encaissement supprime avec succes.', 'success', 'payment', 'Encaissement supprime');
    } finally {
      setConfirmingPaymentDelete(false);
      setPendingPaymentDeleteId(null);
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
    const newClient: Client = {
      id: `cli-${Date.now()}`,
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      email: clientData.email,
      phone: clientData.phone,
      centerId: centerId,
      createdAt: getTodayDateString(),
      notes: clientData.notes || undefined,
      gender: clientData.gender,
      dob: clientData.dob || undefined,
      bloodType: clientData.bloodType || undefined,
      profession: clientData.profession || undefined,
      emergencyContactName: clientData.emergencyContactName || undefined,
      emergencyContactPhone: clientData.emergencyContactPhone || undefined,
      medicalConditions: clientData.medicalConditions || undefined,
      sportGoals: clientData.sportGoals || [],
      avatarUrl: clientData.avatarUrl || undefined
    };

    onUpdateClients([...clients, newClient]);
    setShowClientModal(false);
    triggerToast(`Adhérent ${newClient.firstName} ${newClient.lastName} enregistré avec succès !`);
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
      await createAppointmentInTransaction(db, {
        appointmentId: `apt-${Date.now()}`,
        clientId: aptData.clientId,
        serviceId: aptData.serviceId,
        centerId,
        dateTime: dateTimeStr,
        duration: selectedService ? selectedService.duration : 20,
        notes: aptData.notes,
        createdAt: new Date().toISOString()
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
      await completeAppointmentWithSessionDeduction(db, {
        appointmentId: apt.id,
        centerId,
        clientPackageId: activePkg.id
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
      return { ok: true };
    } catch (error) {
      return fail(getErrorMessage(error, 'Erreur lors de la mise a jour de la reservation.'));
    }
  };

  const handleDeleteAppointment = async (appointmentId: string): Promise<CrmActionResult> => {
    const fail = (message: string): CrmActionResult => ({ ok: false, error: message });

    try {
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
      await assignPackageToClient(db, {
        clientPackageId: `clipkg-${Date.now()}`,
        centerId,
        clientId,
        packageId,
        purchaseDate: getTodayDateString()
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
    const generatedReceipt = payData.receiptNumber || `REC-${now.toString().slice(-6)}`;

    try {
      await recordPaymentWithOptionalPackage(db, {
        paymentId: `pay-${now}`,
        clientPackageId: payData.autoActivatePackage ? `clipkg-${now}` : undefined,
        centerId,
        clientId: payData.clientId,
        packageId: payData.packageId,
        amount: payData.amount,
        method: payData.method,
        receiptNumber: generatedReceipt,
        date: getTodayDateString(),
        autoActivatePackage: payData.autoActivatePackage
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
                onRegisterClientClick={() => setShowClientModal(true)}
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
              />
            )}

            {activeSubTab === 'clients' && (
              <ManagerClientsView
                centerId={centerId}
                clients={clients}
                clientPackages={clientPackages}
                onSelectClient={setSelectedClientId}
                onRegisterClientClick={() => setShowClientModal(true)}
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
          onClose={() => setShowClientModal(false)}
          onSubmit={handleClientSubmit}
        />
      )}

      {showAptModal && (
        <AppointmentModal
          clients={centerClients}
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
