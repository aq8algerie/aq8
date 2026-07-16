import {
  doc,
  DocumentReference,
  Firestore,
  runTransaction,
  Transaction,
} from 'firebase/firestore';
import { Appointment, BookingRequest, Client, ClientPackage, Package, Payment, Service } from '../types';
import {
  BookingServiceType,
  CenterCapacity,
  getCenterBookingCapacity,
  getServiceTypeLabel,
  getSlotCapacity,
  isCenterOpenForDateTime,
} from './bookingCapacityRules';

type PaymentMethod = Payment['method'];
type AppointmentSlotSource = 'manual' | 'booking_request' | 'backfill' | 'legacy';

type AppointmentSlotEntry = {
  appointmentId: string;
  serviceId: string;
  serviceType: BookingServiceType;
  source: AppointmentSlotSource;
  createdAt: string;
  requestId?: string;
};

type AppointmentSlot = {
  id: string;
  centerId: string;
  dateTime: string;
  status: 'held';
  capacities: CenterCapacity;
  counts: CenterCapacity;
  appointments: Record<string, AppointmentSlotEntry>;
  createdAt: string;
  updatedAt: string;
  migratedFromLegacy?: boolean;
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

function emptyCounts(): CenterCapacity {
  return { aq8: 0, wonder: 0 };
}

function buildEmptyAppointmentSlot(centerId: string, dateTime: string, timestamp: string): AppointmentSlot {
  return {
    id: getAppointmentSlotId(dateTime),
    centerId,
    dateTime,
    status: 'held',
    capacities: getCenterBookingCapacity(centerId),
    counts: emptyCounts(),
    appointments: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isBookingServiceType(value: unknown): value is BookingServiceType {
  return value === 'aq8' || value === 'wonder';
}

function recomputeSlot(slot: AppointmentSlot): AppointmentSlot {
  const counts = emptyCounts();
  for (const entry of Object.values(slot.appointments)) {
    counts[entry.serviceType] += 1;
  }

  return {
    ...slot,
    capacities: getCenterBookingCapacity(slot.centerId),
    counts,
  };
}

function totalSlotAppointments(slot: AppointmentSlot): number {
  return slot.counts.aq8 + slot.counts.wonder;
}

async function readServiceType(transaction: Transaction, db: Firestore, serviceId: string): Promise<BookingServiceType> {
  assertString(serviceId, 'Prestation invalide.');
  const serviceRef = doc(db, 'services', serviceId);
  const serviceSnapshot = await transaction.get(serviceRef);
  if (!serviceSnapshot.exists()) {
    throw new Error('Prestation introuvable.');
  }

  const service = serviceSnapshot.data() as Service;
  if (!isBookingServiceType(service.type)) {
    throw new Error('Type de prestation invalide.');
  }

  return service.type;
}

async function normalizeSlotEntries(
  transaction: Transaction,
  db: Firestore,
  rawSlot: Record<string, unknown>,
): Promise<Record<string, AppointmentSlotEntry>> {
  const rawAppointments = rawSlot.appointments;
  if (!rawAppointments || typeof rawAppointments !== 'object' || Array.isArray(rawAppointments)) {
    return {};
  }

  const entries: Record<string, AppointmentSlotEntry> = {};
  for (const [key, rawEntry] of Object.entries(rawAppointments as Record<string, Record<string, unknown>>)) {
    if (!rawEntry || typeof rawEntry !== 'object') continue;

    const appointmentId = String(rawEntry.appointmentId || key || '').trim();
    const serviceId = String(rawEntry.serviceId || '').trim();
    if (!appointmentId || !serviceId) continue;

    const serviceType = isBookingServiceType(rawEntry.serviceType)
      ? rawEntry.serviceType
      : await readServiceType(transaction, db, serviceId);

    entries[appointmentId] = {
      appointmentId,
      serviceId,
      serviceType,
      source: (rawEntry.source as AppointmentSlotSource) || 'legacy',
      createdAt: String(rawEntry.createdAt || rawSlot.createdAt || new Date().toISOString()),
      ...(rawEntry.requestId ? { requestId: String(rawEntry.requestId) } : {}),
    };
  }

  return entries;
}

async function normalizeLegacySlot(
  transaction: Transaction,
  db: Firestore,
  rawSlot: Record<string, unknown>,
  centerId: string,
  dateTime: string,
): Promise<Record<string, AppointmentSlotEntry>> {
  const appointmentId = String(rawSlot.appointmentId || '').trim();
  if (!appointmentId) return {};

  const appointmentRef = doc(db, 'appointments', appointmentId);
  const appointmentSnapshot = await transaction.get(appointmentRef);
  if (!appointmentSnapshot.exists()) return {};

  const appointment = appointmentSnapshot.data() as Appointment;
  if (appointment.centerId !== centerId || appointment.dateTime !== dateTime || appointment.status === 'cancelled') {
    return {};
  }

  const serviceType = await readServiceType(transaction, db, appointment.serviceId);
  return {
    [appointment.id]: {
      appointmentId: appointment.id,
      serviceId: appointment.serviceId,
      serviceType,
      source: (rawSlot.source as AppointmentSlotSource) || 'legacy',
      createdAt: String(rawSlot.createdAt || rawSlot.backfilledAt || new Date().toISOString()),
    },
  };
}

async function normalizeSlotFromSnapshot(
  transaction: Transaction,
  db: Firestore,
  snapshot: Awaited<ReturnType<Transaction['get']>>,
  centerId: string,
  dateTime: string,
  timestamp: string,
): Promise<AppointmentSlot> {
  const slot = buildEmptyAppointmentSlot(centerId, dateTime, timestamp);
  if (!snapshot.exists()) {
    return slot;
  }

  const rawSlot = snapshot.data() as Record<string, unknown>;
  const entries = await normalizeSlotEntries(transaction, db, rawSlot);
  const legacyEntries = Object.keys(entries).length === 0
    ? await normalizeLegacySlot(transaction, db, rawSlot, centerId, dateTime)
    : {};

  return recomputeSlot({
    ...slot,
    createdAt: String(rawSlot.createdAt || timestamp),
    updatedAt: timestamp,
    appointments: Object.keys(entries).length > 0 ? entries : legacyEntries,
    migratedFromLegacy: Boolean(rawSlot.appointmentId && Object.keys(entries).length === 0),
  });
}

function assertSlotCanAccept(slot: AppointmentSlot, serviceType: BookingServiceType, appointmentId: string): void {
  if (!isCenterOpenForDateTime(slot.centerId, slot.dateTime)) {
    throw new Error("Ce creneau est en dehors des horaires d'ouverture du centre.");
  }

  const booked = Object.values(slot.appointments).filter(entry => (
    entry.serviceType === serviceType && entry.appointmentId !== appointmentId
  )).length;
  const capacity = getSlotCapacity(slot.centerId, serviceType);

  if (booked >= capacity) {
    throw new Error(`Capacite ${getServiceTypeLabel(serviceType)} atteinte sur ce creneau (${booked}/${capacity}).`);
  }
}

function addAppointmentToSlot(slot: AppointmentSlot, entry: AppointmentSlotEntry): AppointmentSlot {
  assertSlotCanAccept(slot, entry.serviceType, entry.appointmentId);
  return recomputeSlot({
    ...slot,
    appointments: {
      ...slot.appointments,
      [entry.appointmentId]: entry,
    },
  });
}

function removeAppointmentFromSlot(slot: AppointmentSlot, appointmentId: string): AppointmentSlot {
  const nextAppointments = { ...slot.appointments };
  delete nextAppointments[appointmentId];
  return recomputeSlot({ ...slot, appointments: nextAppointments });
}

function writeSlotOrDelete(transaction: Transaction, slotRef: DocumentReference, slot: AppointmentSlot): void {
  if (totalSlotAppointments(slot) === 0) {
    transaction.delete(slotRef);
    return;
  }

  transaction.set(slotRef, slot);
}

function buildAppointmentSlotEntry(params: {
  appointmentId: string;
  serviceId: string;
  serviceType: BookingServiceType;
  createdAt: string;
  source: AppointmentSlotSource;
  requestId?: string;
}): AppointmentSlotEntry {
  return {
    appointmentId: params.appointmentId,
    serviceId: params.serviceId,
    serviceType: params.serviceType,
    source: params.source,
    createdAt: params.createdAt,
    ...(params.requestId ? { requestId: params.requestId } : {}),
  };
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
    const serviceType = await readServiceType(transaction, db, params.serviceId);
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, params.dateTime, params.createdAt);

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

    const nextSlot = addAppointmentToSlot(slot, buildAppointmentSlotEntry({
      appointmentId: params.appointmentId,
      serviceId: params.serviceId,
      serviceType,
      createdAt: params.createdAt,
      source: 'manual',
    }));

    transaction.set(appointmentRef, appointment);
    writeSlotOrDelete(transaction, slotRef, nextSlot);
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

    const nextServiceType = await readServiceType(transaction, db, params.serviceId);
    const oldSlotRef = getAppointmentSlotRef(db, params.centerId, currentAppointment.dateTime);
    const newSlotRef = getAppointmentSlotRef(db, params.centerId, params.dateTime);
    const oldSlotSnapshot = await transaction.get(oldSlotRef);
    const oldSlot = await normalizeSlotFromSnapshot(transaction, db, oldSlotSnapshot, params.centerId, currentAppointment.dateTime, params.updatedAt);

    const oldSlotId = getAppointmentSlotId(currentAppointment.dateTime);
    const newSlotId = getAppointmentSlotId(params.dateTime);
    const sameSlot = oldSlotId === newSlotId;
    const shouldHoldNewSlot = shouldHoldAppointmentSlot(params.status);

    let nextOldSlot = shouldHoldAppointmentSlot(currentAppointment.status)
      ? removeAppointmentFromSlot(oldSlot, params.id)
      : oldSlot;
    let nextNewSlot = nextOldSlot;

    if (!sameSlot) {
      const newSlotSnapshot = await transaction.get(newSlotRef);
      nextNewSlot = await normalizeSlotFromSnapshot(transaction, db, newSlotSnapshot, params.centerId, params.dateTime, params.updatedAt);
    }

    if (shouldHoldNewSlot) {
      nextNewSlot = addAppointmentToSlot(nextNewSlot, buildAppointmentSlotEntry({
        appointmentId: params.id,
        serviceId: params.serviceId,
        serviceType: nextServiceType,
        createdAt: params.updatedAt,
        source: 'manual',
      }));
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

    if (sameSlot) {
      writeSlotOrDelete(transaction, oldSlotRef, nextNewSlot);
    } else {
      writeSlotOrDelete(transaction, oldSlotRef, nextOldSlot);
      if (shouldHoldNewSlot) {
        writeSlotOrDelete(transaction, newSlotRef, nextNewSlot);
      }
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
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, appointment.dateTime, new Date().toISOString());
    const nextSlot = removeAppointmentFromSlot(slot, params.appointmentId);

    writeSlotOrDelete(transaction, slotRef, nextSlot);
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
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, appointment.dateTime, new Date().toISOString());
    const nextSlot = removeAppointmentFromSlot(slot, params.appointmentId);

    writeSlotOrDelete(transaction, slotRef, nextSlot);
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
    const serviceType = await readServiceType(transaction, db, params.serviceId);
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
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, dateTime, params.createdAt);

    if (appointmentSnapshot.exists()) {
      throw new Error('Une reservation existe deja pour cette demande.');
    }

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

    const nextSlot = addAppointmentToSlot(slot, buildAppointmentSlotEntry({
      appointmentId: params.appointmentId,
      serviceId: params.serviceId,
      serviceType,
      createdAt: params.createdAt,
      source: 'booking_request',
      requestId: params.requestId,
    }));

    if (newClientRef && newClient) {
      transaction.set(newClientRef, newClient);
    }
    transaction.set(appointmentRef, appointment);
    writeSlotOrDelete(transaction, slotRef, nextSlot);
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
