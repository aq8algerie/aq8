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
import { ClientProfileView } from './manager/ClientProfileView';

// Manager modals
import { ClientModal } from './manager/modals/ClientModal';
import { AppointmentModal } from './manager/modals/AppointmentModal';
import { PackageAssignModal } from './manager/modals/PackageAssignModal';
import { PaymentModal } from './manager/modals/PaymentModal';
import { MeasurementModal } from './manager/modals/MeasurementModal';

// Utilities & Business rules
import { getTodayDateString } from '../lib/centerManagerUtils';
import { validateAppointment } from '../lib/appointmentRules';
import {
  findActivePackageForClient,
  validateDeduction,
  deductSessionFromPackage
} from '../lib/packageRules';

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
  onUpdateAppointments,
  onUpdateClientPackages,
  onUpdatePayments,
  onUpdateMeasurements,
  onUpdateBookingRequests,
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
  onUpdateAppointments: (appointments: Appointment[]) => void;
  onUpdateClientPackages: (clientPackages: ClientPackage[]) => void;
  onUpdatePayments: (payments: Payment[]) => void;
  onUpdateMeasurements: (measurements: Measurement[]) => void;
  onUpdateBookingRequests?: (requests: BookingRequest[]) => Promise<void>;
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

  // Temporary Elegant Toast Status Feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Find center metadata
  const currentCenter = centers.find(c => c.id === centerId) || centers[0];

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
  const handleAptSubmit = (aptData: {
    clientId: string;
    serviceId: string;
    date: string;
    time: string;
    notes: string;
  }) => {
    const clientObj = clients.find(c => c.id === aptData.clientId);
    const selectedService = services.find(s => s.id === aptData.serviceId);
    const dateTimeStr = `${aptData.date}T${aptData.time}`;

    // Perform strict validation rules
    const validation = validateAppointment(
      {
        clientId: aptData.clientId,
        serviceId: aptData.serviceId,
        centerId: centerId,
        dateTime: dateTimeStr,
        duration: selectedService ? selectedService.duration : 20
      },
      appointments,
      clientObj?.centerId || ''
    );

    if (!validation.valid) {
      triggerToast(validation.error || "Erreur lors de la planification du RDV.", 'error');
      return;
    }

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      clientId: aptData.clientId,
      serviceId: aptData.serviceId,
      centerId: centerId,
      dateTime: dateTimeStr,
      duration: selectedService ? selectedService.duration : 20,
      status: 'booked',
      notes: aptData.notes || undefined
    };

    onUpdateAppointments([...appointments, newApt]);
    setShowAptModal(false);
    triggerToast('Rendez-vous planifié avec succès !');
  };

  // 3. Complete and deduct session credit safely
  const handleCompleteAppointment = (aptId: string) => {
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    if (apt.status !== 'booked') {
      triggerToast("La réservation n'est pas dans l'état planifiée.", 'error');
      return;
    }

    const cl = clients.find(c => c.id === apt.clientId);
    const activePkg = findActivePackageForClient(apt.clientId, clientPackages);

    // Validate rules
    const validation = validateDeduction(apt, cl, activePkg, centerId);
    if (!validation.valid) {
      triggerToast(validation.error || 'Erreur lors du traitement du forfait.', 'error');
      return;
    }

    // Safely deduct session credit
    if (activePkg) {
      const updatedPkg = deductSessionFromPackage(activePkg);
      const updatedPkgs = clientPackages.map(cp => cp.id === activePkg.id ? updatedPkg : cp);
      onUpdateClientPackages(updatedPkgs);
    }

    // Update appointment status to completed
    const updatedApts = appointments.map(a => a.id === aptId ? { ...a, status: 'completed' as const } : a);
    onUpdateAppointments(updatedApts);

    triggerToast('Séance validée et 1 crédit déduit avec succès !');
  };

  // 4. Cancel appointment safely
  const handleCancelAppointment = (aptId: string) => {
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    if (apt.centerId !== centerId) {
      triggerToast("Cette réservation n'appartient pas à votre centre.", 'error');
      return;
    }

    const updatedApts = appointments.map(a => a.id === aptId ? { ...a, status: 'cancelled' as const } : a);
    onUpdateAppointments(updatedApts);

    triggerToast('Séance annulée avec succès.');
  };

  // 5. Package assignments
  const handlePackageAssignSubmit = (clientId: string, packageId: string) => {
    const matchedPkg = packages.find(p => p.id === packageId);
    if (!matchedPkg) return;

    const newClientPkg: ClientPackage = {
      id: `clipkg-${Date.now()}`,
      clientId: clientId,
      packageId: packageId,
      centerId: centerId,
      sessionsRemaining: matchedPkg.sessionsCount,
      totalSessions: matchedPkg.sessionsCount,
      purchaseDate: getTodayDateString(),
      status: 'active'
    };

    onUpdateClientPackages([...clientPackages, newClientPkg]);
    setShowPackageAssignModal(false);
    triggerToast('Forfait affecté avec succès au client !');
  };

  // 6. Payment logging
  const handlePaymentSubmit = (payData: {
    clientId: string;
    packageId: string;
    amount: number;
    method: 'cash' | 'card' | 'ccp' | 'cheque';
    receiptNumber: string;
    autoActivatePackage: boolean;
  }) => {
    const generatedReceipt = payData.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

    const newPay: Payment = {
      id: `pay-${Date.now()}`,
      clientId: payData.clientId,
      packageId: payData.packageId,
      centerId: centerId,
      amount: payData.amount,
      date: getTodayDateString(),
      method: payData.method,
      receiptNumber: generatedReceipt
    };

    // Auto-create/activate package subscription for the client if requested
    if (payData.autoActivatePackage) {
      const matchedPkg = packages.find(p => p.id === payData.packageId);
      if (matchedPkg) {
        const newClientPkg: ClientPackage = {
          id: `clipkg-${Date.now()}`,
          clientId: payData.clientId,
          packageId: payData.packageId,
          centerId: centerId,
          sessionsRemaining: matchedPkg.sessionsCount,
          totalSessions: matchedPkg.sessionsCount,
          purchaseDate: getTodayDateString(),
          status: 'active'
    };
        onUpdateClientPackages([...clientPackages, newClientPkg]);
      }
    }

    onUpdatePayments([...payments, newPay]);
    setShowPaymentModal(false);
    triggerToast(`Paiement de ${payData.amount.toLocaleString()} DZD enregistré avec succès !`);
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
      {/* Toast Feedback Message Banner */}
      {feedback && (
        <div
          id="toast-feedback-banner"
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
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
                onUpdateAppointments={onUpdateAppointments}
                clientPackages={clientPackages}
                packages={centerPackages}
                onUpdateClientPackages={onUpdateClientPackages}
                onBookAppointmentClick={() => setShowAptModal(true)}
                bookingRequests={bookingRequests.filter(r => r.centerId === centerId)}
                onUpdateBookingRequests={onUpdateBookingRequests}
                onUpdateClients={onUpdateClients}
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
                onUpdateAppointments={onUpdateAppointments}
                onUpdateClientPackages={onUpdateClientPackages}
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
                  if (confirm("Voulez-vous vraiment supprimer cet encaissement ?")) {
                    const updated = payments.filter(p => p.id !== payId);
                    onUpdatePayments(updated);
                    triggerToast("Encaissement supprimé avec succès !");
                  }
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
          onClose={() => setShowAptModal(false)}
          onSubmit={handleAptSubmit}
          initialDate={bookingDateFilter}
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
