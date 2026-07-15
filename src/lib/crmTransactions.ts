import {
  doc,
  DocumentReference,
  Firestore,
  runTransaction
} from 'firebase/firestore';
import { Appointment, BookingRequest, Client, ClientPackage, Package, Payment } from '../types';

type PaymentMethod = Payment['method'];
type AppointmentSlotSource = 'manual' | 'booking_request';

type AppointmentSlot = {
  id: string;
  centerId: string;
  appointmentId: string;
  dateTime: string;
  status: 'held';
  source: AppointmentSlotSource;
  createdAt: string;
  requestId?: string;
};

export type CrmActionResult = {
  ok: boolean;
  error?: string;
};

export type AppointmentMutationOptions = {
  silent?: boolean;
};

function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
}

function assertPositiveNumber(value: unknown, message: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(message);
  }
}

function shouldHoldAppointmentSlot(status: Appointment['status']): boolean {
  return status !== 'cancelled';
}

export function getAppointmentSlotId(dateTime: string): string {
  return encodeURIComponent(dateTime.trim());
}

function getAppointmentSlotRef(db: Firestore, centerId: string, dateTime: string): DocumentReference {
  return doc(db, 'appointment_slots', centerId, 'slots', getAppointmentSlotId(dateTime));
}

function buildAppointmentSlot(params: {
  centerId: string;
  appointmentId: string;
  dateTime: string;
  createdAt: string;
  source: AppointmentSlotSource;
  requestId?: string;
}): AppointmentSlot {
  const slot: AppointmentSlot = {
    id: getAppointmentSlotId(params.dateTime),
    centerId: params.centerId,
    appointmentId: params.appointmentId,
    dateTime: params.dateTime,
    status: 'held',
    source: params.source,
    createdAt: params.createdAt
  };

  if (params.requestId) {
    slot.requestId = params.requestId;
  }

  return slot;
}

function ensureSlotIsAvailable(slotData: unknown, appointmentId?: string): void {
  if (!slotData) return;

  const slot = slotData as AppointmentSlot;
  if (!appointmentId || slot.appointmentId !== appointmentId) {
    throw new Error('Ce creneau est deja reserve dans ce centre.');
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function createAppointmentInTransaction(
  db: Firestore,
  params: {
    appointmentId: string;
    centerId: string;
    clientId: string;
    serviceId: string;
    dateTime: string;
    duration: number;
    notes?: string;
    createdAt: string;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.appointmentId, 'Identifiant de reservation invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.clientId, 'Client invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertString(params.dateTime, 'Date de reservation invalide.');
    assertPositiveNumber(params.duration, 'Duree de reservation invalide.');

    const clientRef = doc(db, 'clients', params.clientId);
    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, params.dateTime);

    const clientSnapshot = await transaction.get(clientRef);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const slotSnapshot = await transaction.get(slotRef);

    if (!clientSnapshot.exists()) {
      throw new Error('Client introuvable.');
    }
    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("Ce client n'appartient pas a votre centre.");
    }
    if (appointmentSnapshot.exists()) {
      throw new Error('Identifiant de reservation deja utilise.');
    }
    ensureSlotIsAvailable(slotSnapshot.exists() ? slotSnapshot.data() : null);

    const appointment: Appointment = {
      id: params.appointmentId,
      clientId: params.clientId,
      serviceId: params.serviceId,
      centerId: params.centerId,
      dateTime: params.dateTime,
      duration: params.duration,
      status: 'booked'
    };

    if (params.notes?.trim()) {
      appointment.notes = params.notes.trim();
    }

    transaction.set(appointmentRef, appointment);
    transaction.set(slotRef, buildAppointmentSlot({
      centerId: params.centerId,
      appointmentId: params.appointmentId,
      dateTime: params.dateTime,
      createdAt: params.createdAt,
      source: 'manual'
    }));
  });
}

export async function updateAppointmentInTransaction(
  db: Firestore,
  params: Appointment & { updatedAt: string }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.id, 'Reservation invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.clientId, 'Client invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertString(params.dateTime, 'Date de reservation invalide.');
    assertPositiveNumber(params.duration, 'Duree de reservation invalide.');

    const appointmentRef = doc(db, 'appointments', params.id);
    const clientRef = doc(db, 'clients', params.clientId);

    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) {
      throw new Error('Reservation introuvable.');
    }

    const currentAppointment = appointmentSnapshot.data() as Appointment;
    if (currentAppointment.centerId !== params.centerId) {
      throw new Error("Cette reservation n'appartient pas a votre centre.");
    }

    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) {
      throw new Error('Client introuvable.');
    }
    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("Ce client n'appartient pas a votre centre.");
    }

    const oldSlotId = getAppointmentSlotId(currentAppointment.dateTime);
    const newSlotId = getAppointmentSlotId(params.dateTime);
    const oldSlotRef = getAppointmentSlotRef(db, params.centerId, currentAppointment.dateTime);
    const oldSlotSnapshot = await transaction.get(oldSlotRef);
    const shouldHoldNewSlot = shouldHoldAppointmentSlot(params.status);

    let newSlotRef: DocumentReference | null = null;
    let newSlotData: AppointmentSlot | null = null;

    if (shouldHoldNewSlot) {
      newSlotRef = getAppointmentSlotRef(db, params.centerId, params.dateTime);
      if (newSlotId === oldSlotId) {
        ensureSlotIsAvailable(oldSlotSnapshot.exists() ? oldSlotSnapshot.data() : null, params.id);
      } else {
        const newSlotSnapshot = await transaction.get(newSlotRef);
        ensureSlotIsAvailable(newSlotSnapshot.exists() ? newSlotSnapshot.data() : null);
      }

      newSlotData = buildAppointmentSlot({
        centerId: params.centerId,
        appointmentId: params.id,
        dateTime: params.dateTime,
        createdAt: params.updatedAt,
        source: 'manual'
      });
    }

    const updateData: Appointment = {
      id: params.id,
      clientId: params.clientId,
      serviceId: params.serviceId,
      centerId: params.centerId,
      dateTime: params.dateTime,
      duration: params.duration,
      status: params.status,
      notes: params.notes || ''
    };

    if (oldSlotSnapshot.exists()) {
      const oldSlot = oldSlotSnapshot.data() as AppointmentSlot;
      if (oldSlot.appointmentId === params.id && (!shouldHoldNewSlot || oldSlotId !== newSlotId)) {
        transaction.delete(oldSlotRef);
      }
    }

    if (newSlotRef && newSlotData) {
      transaction.set(newSlotRef, newSlotData);
    }

    transaction.set(appointmentRef, updateData);
  });
}

export async function deleteAppointmentInTransaction(
  db: Firestore,
  params: {
    appointmentId: string;
    centerId: string;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.appointmentId, 'Reservation invalide.');
    assertString(params.centerId, 'Centre invalide.');

    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) {
      throw new Error('Reservation introuvable.');
    }

    const appointment = appointmentSnapshot.data() as Appointment;
    if (appointment.centerId !== params.centerId) {
      throw new Error("Cette reservation n'appartient pas a votre centre.");
    }

    const slotRef = getAppointmentSlotRef(db, params.centerId, appointment.dateTime);
    const slotSnapshot = await transaction.get(slotRef);

    if (slotSnapshot.exists()) {
      const slot = slotSnapshot.data() as AppointmentSlot;
      if (slot.appointmentId === params.appointmentId) {
        transaction.delete(slotRef);
      }
    }

    transaction.delete(appointmentRef);
  });
}

export async function completeAppointmentWithSessionDeduction(
  db: Firestore,
  params: {
    appointmentId: string;
    centerId: string;
    clientPackageId: string;
  }
): Promise<{ sessionsRemaining: number }> {
  return runTransaction(db, async transaction => {
    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const clientPackageRef = doc(db, 'client_packages', params.clientPackageId);

    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) {
      throw new Error('Reservation introuvable.');
    }

    const appointment = appointmentSnapshot.data() as Appointment;
    if (appointment.centerId !== params.centerId) {
      throw new Error("Cette reservation n'appartient pas a votre centre.");
    }
    if (appointment.status !== 'booked') {
      throw new Error("La reservation n'est pas dans l'etat planifiee.");
    }

    const clientRef = doc(db, 'clients', appointment.clientId);
    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) {
      throw new Error("L'adherent associe est introuvable.");
    }

    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("L'adherent n'appartient pas a votre centre.");
    }

    const clientPackageSnapshot = await transaction.get(clientPackageRef);
    if (!clientPackageSnapshot.exists()) {
      throw new Error("Le forfait actif de l'adherent est introuvable.");
    }

    const clientPackage = clientPackageSnapshot.data() as ClientPackage;
    if (clientPackage.centerId !== params.centerId || clientPackage.clientId !== appointment.clientId) {
      throw new Error('Le forfait actif ne correspond pas a cette reservation.');
    }
    if (clientPackage.status !== 'active' || clientPackage.sessionsRemaining <= 0) {
      throw new Error("Le forfait actif de cet adherent est epuise.");
    }

    const sessionsRemaining = clientPackage.sessionsRemaining - 1;
    transaction.update(clientPackageRef, {
      sessionsRemaining,
      status: sessionsRemaining === 0 ? 'completed' : 'active'
    });
    transaction.update(appointmentRef, {
      status: 'completed'
    });

    return { sessionsRemaining };
  });
}

export async function cancelAppointmentInTransaction(
  db: Firestore,
  params: {
    appointmentId: string;
    centerId: string;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) {
      throw new Error('Reservation introuvable.');
    }

    const appointment = appointmentSnapshot.data() as Appointment;
    if (appointment.centerId !== params.centerId) {
      throw new Error("Cette reservation n'appartient pas a votre centre.");
    }
    if (appointment.status !== 'booked') {
      throw new Error('Seules les reservations planifiees peuvent etre annulees.');
    }

    const slotRef = getAppointmentSlotRef(db, params.centerId, appointment.dateTime);
    const slotSnapshot = await transaction.get(slotRef);

    if (slotSnapshot.exists()) {
      const slot = slotSnapshot.data() as AppointmentSlot;
      if (slot.appointmentId === params.appointmentId) {
        transaction.delete(slotRef);
      }
    }

    transaction.update(appointmentRef, {
      status: 'cancelled'
    });
  });
}

export async function acceptBookingRequestInTransaction(
  db: Firestore,
  params: {
    requestId: string;
    centerId: string;
    existingClientId?: string;
    newClientId: string;
    appointmentId: string;
    serviceId: string;
    duration: number;
    createdAt: string;
  }
): Promise<{ clientId: string; appointmentId: string }> {
  return runTransaction(db, async transaction => {
    assertString(params.requestId, 'Demande invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.newClientId, 'Identifiant client invalide.');
    assertString(params.appointmentId, 'Identifiant de reservation invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertPositiveNumber(params.duration, 'Duree de reservation invalide.');

    const requestRef = doc(db, 'booking_requests', params.requestId);
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error('Demande de reservation introuvable.');
    }

    const bookingRequest = requestSnapshot.data() as BookingRequest;
    if (bookingRequest.centerId !== params.centerId) {
      throw new Error("Cette demande n'appartient pas a votre centre.");
    }
    if (bookingRequest.status !== 'pending') {
      throw new Error('Cette demande a deja ete traitee.');
    }

    const dateTime = `${bookingRequest.bookingDate}T${bookingRequest.bookingTime}`;
    let resolvedClientId = '';

    if (params.existingClientId) {
      const existingClientRef = doc(db, 'clients', params.existingClientId);
      const existingClientSnapshot = await transaction.get(existingClientRef);
      if (existingClientSnapshot.exists()) {
        const existingClient = existingClientSnapshot.data() as Client;
        if (existingClient.centerId !== params.centerId) {
          throw new Error("Le client existant n'appartient pas a votre centre.");
        }
        if (existingClient.phone !== bookingRequest.phone) {
          throw new Error('Le client existant ne correspond pas au telephone de la demande.');
        }
        resolvedClientId = existingClient.id;
      }
    }

    let newClientRef: DocumentReference | null = null;
    let newClient: Client | null = null;

    if (!resolvedClientId) {
      newClientRef = doc(db, 'clients', params.newClientId);
      const newClientSnapshot = await transaction.get(newClientRef);
      if (newClientSnapshot.exists()) {
        throw new Error('Identifiant client deja utilise.');
      }

      newClient = {
        id: params.newClientId,
        firstName: bookingRequest.firstName,
        lastName: bookingRequest.lastName,
        phone: bookingRequest.phone,
        email: bookingRequest.email || '',
        centerId: params.centerId,
        createdAt: params.createdAt,
        gender: 'H',
        sportGoals: []
      };
      resolvedClientId = params.newClientId;
    }

    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, dateTime);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const slotSnapshot = await transaction.get(slotRef);

    if (appointmentSnapshot.exists()) {
      throw new Error('Une reservation existe deja pour cette demande.');
    }
    ensureSlotIsAvailable(slotSnapshot.exists() ? slotSnapshot.data() : null);

    const appointment: Appointment = {
      id: params.appointmentId,
      clientId: resolvedClientId,
      serviceId: params.serviceId,
      centerId: params.centerId,
      dateTime,
      duration: params.duration,
      status: 'booked',
      notes: `Demande publique - ${bookingRequest.service}`
    };

    if (newClientRef && newClient) {
      transaction.set(newClientRef, newClient);
    }
    transaction.set(appointmentRef, appointment);
    transaction.set(slotRef, buildAppointmentSlot({
      centerId: params.centerId,
      appointmentId: params.appointmentId,
      dateTime,
      createdAt: params.createdAt,
      source: 'booking_request',
      requestId: params.requestId
    }));
    transaction.update(requestRef, {
      status: 'accepted'
    });

    return {
      clientId: resolvedClientId,
      appointmentId: params.appointmentId
    };
  });
}

export async function rejectBookingRequestInTransaction(
  db: Firestore,
  params: {
    requestId: string;
    centerId: string;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.requestId, 'Demande invalide.');
    assertString(params.centerId, 'Centre invalide.');

    const requestRef = doc(db, 'booking_requests', params.requestId);
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error('Demande de reservation introuvable.');
    }

    const bookingRequest = requestSnapshot.data() as BookingRequest;
    if (bookingRequest.centerId !== params.centerId) {
      throw new Error("Cette demande n'appartient pas a votre centre.");
    }
    if (bookingRequest.status !== 'pending') {
      throw new Error('Cette demande a deja ete traitee.');
    }

    transaction.update(requestRef, {
      status: 'rejected'
    });
  });
}

export async function assignPackageToClient(
  db: Firestore,
  params: {
    clientPackageId: string;
    centerId: string;
    clientId: string;
    packageId: string;
    purchaseDate: string;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.clientId, 'Client invalide.');
    assertString(params.packageId, 'Forfait invalide.');

    const clientRef = doc(db, 'clients', params.clientId);
    const packageRef = doc(db, 'packages', params.packageId);
    const clientPackageRef = doc(db, 'client_packages', params.clientPackageId);

    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) {
      throw new Error('Client introuvable.');
    }
    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("Ce client n'appartient pas a votre centre.");
    }

    const packageSnapshot = await transaction.get(packageRef);
    if (!packageSnapshot.exists()) {
      throw new Error('Forfait introuvable.');
    }
    const packageData = packageSnapshot.data() as Package;
    if (packageData.sessionsCount <= 0) {
      throw new Error('Forfait sans sessions disponibles.');
    }

    const clientPackage: ClientPackage = {
      id: params.clientPackageId,
      clientId: params.clientId,
      packageId: params.packageId,
      centerId: params.centerId,
      sessionsRemaining: packageData.sessionsCount,
      totalSessions: packageData.sessionsCount,
      purchaseDate: params.purchaseDate,
      status: 'active'
    };

    transaction.set(clientPackageRef, clientPackage);
  });
}

export async function recordPaymentWithOptionalPackage(
  db: Firestore,
  params: {
    paymentId: string;
    clientPackageId?: string;
    centerId: string;
    clientId: string;
    packageId: string;
    amount: number;
    method: PaymentMethod;
    receiptNumber?: string;
    date: string;
    autoActivatePackage: boolean;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.clientId, 'Client invalide.');
    assertString(params.packageId, 'Forfait invalide.');
    assertPositiveNumber(params.amount, 'Montant invalide.');

    const clientRef = doc(db, 'clients', params.clientId);
    const packageRef = doc(db, 'packages', params.packageId);
    const paymentRef = doc(db, 'payments', params.paymentId);

    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) {
      throw new Error('Client introuvable.');
    }
    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("Ce client n'appartient pas a votre centre.");
    }

    const packageSnapshot = await transaction.get(packageRef);
    if (!packageSnapshot.exists()) {
      throw new Error('Forfait introuvable.');
    }
    const packageData = packageSnapshot.data() as Package;

    const payment: Payment = {
      id: params.paymentId,
      clientId: params.clientId,
      packageId: params.packageId,
      centerId: params.centerId,
      amount: params.amount,
      date: params.date,
      method: params.method
    };

    if (params.receiptNumber) {
      payment.receiptNumber = params.receiptNumber;
    }

    transaction.set(paymentRef, payment);

    if (params.autoActivatePackage) {
      assertString(params.clientPackageId, 'Identifiant de forfait client invalide.');
      if (packageData.sessionsCount <= 0) {
        throw new Error('Forfait sans sessions disponibles.');
      }

      const clientPackageRef = doc(db, 'client_packages', params.clientPackageId);
      const clientPackage: ClientPackage = {
        id: params.clientPackageId,
        clientId: params.clientId,
        packageId: params.packageId,
        centerId: params.centerId,
        sessionsRemaining: packageData.sessionsCount,
        totalSessions: packageData.sessionsCount,
        purchaseDate: params.date,
        status: 'active'
      };

      transaction.set(clientPackageRef, clientPackage);
    }
  });
}
