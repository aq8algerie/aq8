import {
  collection,
  doc,
  DocumentReference,
  Firestore,
  runTransaction,
  Transaction,
} from 'firebase/firestore';
import { Appointment, BookingRequest, Center, Client, Service } from '../types';
import { validateSessionCompletion } from './packageRules';
import {
  BookingServiceType,
  CenterBookingConfig,
  CenterCapacity,
  getBookingSlotId,
  getCenterBookingCapacity,
  getServiceTypeLabel,
  getSlotCapacity,
  isCenterOpenForDateTime,
} from './bookingCapacityRules';

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

type CrmTransactionAuditContext = {
  userId: string;
  userName: string;
  userRole: 'super_admin' | 'center_manager';
  centerName?: string | null;
};

type CrmTransactionAuditInput = {
  action: string;
  details: string;
  targetId?: string | null;
  targetType?: string | null;
  centerId?: string | null;
  centerName?: string | null;
  timestamp: string;
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

function assertFullHourDateTime(dateTime: string): void {
  const [, time = ''] = dateTime.split('T');
  if (!/^\d{2}:00$/.test(time)) {
    throw new Error("Les réservations doivent être positionnées sur une heure pleine.");
  }
}

function isBookingRequestServiceType(value: string): value is BookingServiceType {
  return value === 'aq8' || value === 'wonder';
}

function writeCrmAuditLog(
  transaction: Transaction,
  db: Firestore,
  context: CrmTransactionAuditContext,
  input: CrmTransactionAuditInput,
): void {
  assertString(context.userId, 'Utilisateur CRM invalide pour le journal d\'audit.');
  assertString(context.userRole, 'Rôle CRM invalide pour le journal d\'audit.');
  assertString(input.action, 'Action CRM invalide pour le journal d\'audit.');
  assertString(input.details, 'Détails CRM invalides pour le journal d\'audit.');
  assertString(input.timestamp, 'Horodatage CRM invalide pour le journal d\'audit.');

  const auditRef = doc(collection(db, 'audit_logs'));
  transaction.set(auditRef, {
    timestamp: input.timestamp,
    userId: context.userId,
    userName: context.userName || context.userId,
    role: context.userRole,
    action: input.action,
    details: input.details,
    targetId: input.targetId || null,
    targetType: input.targetType || null,
    centerId: input.centerId || null,
    centerName: input.centerName || context.centerName || null,
  });
}

export function getAppointmentSlotId(dateTime: string): string {
  return getBookingSlotId(dateTime);
}

function getAppointmentSlotRef(db: Firestore, centerId: string, dateTime: string): DocumentReference {
  return doc(db, 'appointment_slots', centerId, 'slots', getAppointmentSlotId(dateTime));
}

function getPublicBookingSlotRef(db: Firestore, centerId: string, dateTime: string): DocumentReference {
  return doc(db, 'public_booking_slots', centerId, 'slots', getAppointmentSlotId(dateTime));
}

function emptyCounts(): CenterCapacity {
  return { aq8: 0, wonder: 0 };
}

function buildEmptyAppointmentSlot(centerId: string, dateTime: string, timestamp: string, center?: CenterBookingConfig): AppointmentSlot {
  return {
    id: getAppointmentSlotId(dateTime),
    centerId,
    dateTime,
    status: 'held',
    capacities: getCenterBookingCapacity(centerId, center),
    counts: emptyCounts(),
    appointments: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isBookingServiceType(value: unknown): value is BookingServiceType {
  return value === 'aq8' || value === 'wonder';
}

function recomputeSlot(slot: AppointmentSlot, center?: CenterBookingConfig): AppointmentSlot {
  const counts = emptyCounts();
  for (const entry of Object.values(slot.appointments)) {
    counts[entry.serviceType] += 1;
  }

  return {
    ...slot,
    capacities: getCenterBookingCapacity(slot.centerId, center),
    counts,
  };
}

function totalSlotAppointments(slot: AppointmentSlot): number {
  return slot.counts.aq8 + slot.counts.wonder;
}

function buildPublicBookingSlot(slot: AppointmentSlot) {
  const remaining = {
    aq8: Math.max(slot.capacities.aq8 - slot.counts.aq8, 0),
    wonder: Math.max(slot.capacities.wonder - slot.counts.wonder, 0),
  };
  const [date, time] = slot.dateTime.split('T');

  return {
    id: slot.id,
    centerId: slot.centerId,
    dateTime: slot.dateTime,
    date: date || '',
    time: time || '',
    capacities: slot.capacities,
    counts: slot.counts,
    remaining,
    updatedAt: slot.updatedAt,
  };
}

function removeBookingRequestHold(slot: AppointmentSlot, requestId: string, center?: CenterBookingConfig): AppointmentSlot {
  const nextAppointments = { ...slot.appointments };
  for (const [entryId, entry] of Object.entries(nextAppointments)) {
    if (entry.requestId === requestId && entry.source === 'booking_request') {
      delete nextAppointments[entryId];
    }
  }
  return recomputeSlot({ ...slot, appointments: nextAppointments }, center);
}

async function readCenterConfig(transaction: Transaction, db: Firestore, centerId: string): Promise<Center> {
  const centerRef = doc(db, 'centers', centerId);
  const centerSnapshot = await transaction.get(centerRef);
  if (!centerSnapshot.exists()) {
    throw new Error('Centre introuvable.');
  }

  return { id: centerId, ...(centerSnapshot.data() as Omit<Center, 'id'>) } as Center;
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
  center?: CenterBookingConfig,
): Promise<AppointmentSlot> {
  const slot = buildEmptyAppointmentSlot(centerId, dateTime, timestamp, center);
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
  }, center);
}

function assertSlotCanAccept(slot: AppointmentSlot, serviceType: BookingServiceType, appointmentId: string, center?: CenterBookingConfig): void {
  assertFullHourDateTime(slot.dateTime);

  if (!isCenterOpenForDateTime(slot.centerId, slot.dateTime, center)) {
    throw new Error("Ce créneau est en dehors des horaires d'ouverture du centre.");
  }

  const booked = Object.values(slot.appointments).filter(entry => (
    entry.serviceType === serviceType && entry.appointmentId !== appointmentId
  )).length;
  const capacity = getSlotCapacity(slot.centerId, serviceType, center);

  if (booked >= capacity) {
    throw new Error(`Capacité ${getServiceTypeLabel(serviceType)} atteinte sur ce créneau (${booked}/${capacity}).`);
  }
}

function addAppointmentToSlot(slot: AppointmentSlot, entry: AppointmentSlotEntry, center?: CenterBookingConfig): AppointmentSlot {
  assertSlotCanAccept(slot, entry.serviceType, entry.appointmentId, center);
  return recomputeSlot({
    ...slot,
    appointments: {
      ...slot.appointments,
      [entry.appointmentId]: entry,
    },
  }, center);
}

function removeAppointmentFromSlot(slot: AppointmentSlot, appointmentId: string, center?: CenterBookingConfig): AppointmentSlot {
  const nextAppointments = { ...slot.appointments };
  delete nextAppointments[appointmentId];
  return recomputeSlot({ ...slot, appointments: nextAppointments }, center);
}

function writeSlotOrDelete(transaction: Transaction, db: Firestore, slotRef: DocumentReference, slot: AppointmentSlot): void {
  const publicSlotRef = getPublicBookingSlotRef(db, slot.centerId, slot.dateTime);

  if (totalSlotAppointments(slot) === 0) {
    transaction.delete(slotRef);
    transaction.delete(publicSlotRef);
    return;
  }

  const nextSlot = { ...slot, updatedAt: slot.updatedAt || new Date().toISOString() };
  transaction.set(slotRef, nextSlot);
  transaction.set(publicSlotRef, buildPublicBookingSlot(nextSlot));
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
    assertString(params.appointmentId, 'Identifiant de réservation invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.clientId, 'Client invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertString(params.dateTime, 'Date de réservation invalide.');
    assertPositiveNumber(params.duration, 'Durée de réservation invalide.');

    const clientRef = doc(db, 'clients', params.clientId);
    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, params.dateTime);

    const clientSnapshot = await transaction.get(clientRef);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const serviceType = await readServiceType(transaction, db, params.serviceId);
    const centerConfig = await readCenterConfig(transaction, db, params.centerId);
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, params.dateTime, params.createdAt, centerConfig);

    if (!clientSnapshot.exists()) {
      throw new Error('Client introuvable.');
    }
    const client = clientSnapshot.data() as Client;
    if (client.centerId !== params.centerId) {
      throw new Error("Ce client n'appartient pas a votre centre.");
    }
    if (appointmentSnapshot.exists()) {
      throw new Error('Identifiant de réservation déjà utilisé.');
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
    }), centerConfig);

    transaction.set(appointmentRef, appointment);
    writeSlotOrDelete(transaction, db, slotRef, nextSlot);
  });
}

export async function updateAppointmentInTransaction(
  db: Firestore,
  params: Appointment & { updatedAt: string; audit: CrmTransactionAuditContext }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.id, 'Reservation invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.clientId, 'Client invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertString(params.dateTime, 'Date de réservation invalide.');
    assertPositiveNumber(params.duration, 'Durée de réservation invalide.');

    const appointmentRef = doc(db, 'appointments', params.id);
    const clientRef = doc(db, 'clients', params.clientId);

    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) {
      throw new Error('Reservation introuvable.');
    }

    const currentAppointment = appointmentSnapshot.data() as Appointment;
    if (currentAppointment.centerId !== params.centerId) {
      throw new Error("Cette réservation n'appartient pas à votre centre.");
    }

    if (currentAppointment.status !== 'booked' || params.status !== 'booked') {
      throw new Error(
        'Seules les réservations planifiées peuvent être modifiées. Utilisez les actions dédiées pour valider ou annuler une séance.'
      );
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
    const centerConfig = await readCenterConfig(transaction, db, params.centerId);
    const oldSlotRef = getAppointmentSlotRef(db, params.centerId, currentAppointment.dateTime);
    const newSlotRef = getAppointmentSlotRef(db, params.centerId, params.dateTime);
    const oldSlotSnapshot = await transaction.get(oldSlotRef);
    const oldSlot = await normalizeSlotFromSnapshot(transaction, db, oldSlotSnapshot, params.centerId, currentAppointment.dateTime, params.updatedAt, centerConfig);

    const oldSlotId = getAppointmentSlotId(currentAppointment.dateTime);
    const newSlotId = getAppointmentSlotId(params.dateTime);
    const sameSlot = oldSlotId === newSlotId;
    const shouldHoldNewSlot = true;
    let nextOldSlot = removeAppointmentFromSlot(oldSlot, params.id, centerConfig);
    let nextNewSlot = nextOldSlot;

    if (!sameSlot) {
      const newSlotSnapshot = await transaction.get(newSlotRef);
      nextNewSlot = await normalizeSlotFromSnapshot(transaction, db, newSlotSnapshot, params.centerId, params.dateTime, params.updatedAt, centerConfig);
    }

    if (shouldHoldNewSlot) {
      nextNewSlot = addAppointmentToSlot(nextNewSlot, buildAppointmentSlotEntry({
        appointmentId: params.id,
        serviceId: params.serviceId,
        serviceType: nextServiceType,
        createdAt: params.updatedAt,
        source: 'manual',
      }), centerConfig);
    }

    const updateData: Partial<Appointment> = {
      clientId: params.clientId,
      serviceId: params.serviceId,
      dateTime: params.dateTime,
      duration: params.duration,
      notes: params.notes || '',
      updatedAt: params.updatedAt,
    };

    if (sameSlot) {
      writeSlotOrDelete(transaction, db, oldSlotRef, nextNewSlot);
    } else {
      writeSlotOrDelete(transaction, db, oldSlotRef, nextOldSlot);
      if (shouldHoldNewSlot) {
        writeSlotOrDelete(transaction, db, newSlotRef, nextNewSlot);
      }
    }

    transaction.update(appointmentRef, updateData);
    writeCrmAuditLog(transaction, db, params.audit, {
      action: 'UPDATE_APPOINTMENT',
      details: `Modification de la réservation ${params.id}. Nouvelle date/heure : ${params.dateTime.replace('T', ' ')}.`,
      targetId: params.id,
      targetType: 'appointment',
      centerId: params.centerId,
      centerName: params.audit.centerName,
      timestamp: params.updatedAt,
    });
  });
}

export async function cancelAppointmentInTransaction(
  db: Firestore,
  params: {
    appointmentId: string;
    centerId: string;
    reason?: string;
    audit: CrmTransactionAuditContext;
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
      throw new Error("Cette réservation n'appartient pas à votre centre.");
    }
    if (appointment.status !== 'booked') {
      throw new Error('Seules les réservations planifiées peuvent être annulées.');
    }

    const cancelledAt = new Date().toISOString();
    const centerConfig = await readCenterConfig(transaction, db, params.centerId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, appointment.dateTime);
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, appointment.dateTime, cancelledAt, centerConfig);
    const nextSlot = removeAppointmentFromSlot(slot, params.appointmentId, centerConfig);

    writeSlotOrDelete(transaction, db, slotRef, nextSlot);
    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledAt,
      cancelledByUserId: params.audit.userId,
      cancelledByUserName: params.audit.userName || params.audit.userId,
      cancellationReason: params.reason?.trim() || 'Annulation manager',
      updatedAt: cancelledAt,
    });
    writeCrmAuditLog(transaction, db, params.audit, {
      action: 'CANCEL_APPOINTMENT',
      details: `Annulation de la réservation ${appointment.id} du ${appointment.dateTime.replace('T', ' ')}. Motif : ${params.reason?.trim() || 'Annulation manager'}.`,
      targetId: appointment.id,
      targetType: 'appointment',
      centerId: params.centerId,
      centerName: params.audit.centerName,
      timestamp: cancelledAt,
    });;
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
    processedAt: string;
    audit: CrmTransactionAuditContext;
  }
): Promise<{ clientId: string; appointmentId: string }> {
  return runTransaction(db, async transaction => {
    assertString(params.requestId, 'Demande invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.newClientId, 'Identifiant client invalide.');
    assertString(params.appointmentId, 'Identifiant de réservation invalide.');
    assertString(params.serviceId, 'Prestation invalide.');
    assertString(params.processedAt, 'Date de validation invalide.');
    assertPositiveNumber(params.duration, 'Durée de réservation invalide.');

    const requestRef = doc(db, 'booking_requests', params.requestId);
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error('Demande de réservation introuvable.');
    }

    const bookingRequest = requestSnapshot.data() as BookingRequest;
    if (bookingRequest.centerId !== params.centerId) {
      throw new Error("Cette demande n'appartient pas à votre centre.");
    }
    if (bookingRequest.status !== 'pending') {
      throw new Error('Cette demande a déjà été traitée.');
    }
    assertString(bookingRequest.bookingDate, 'Date de réservation invalide.');
    assertString(bookingRequest.bookingTime, 'Heure de réservation invalide.');

    const dateTime = `${bookingRequest.bookingDate}T${bookingRequest.bookingTime}`;
    assertFullHourDateTime(dateTime);

    const serviceType = await readServiceType(transaction, db, params.serviceId);
    const requestedServiceType = String(bookingRequest.service || '').toLowerCase();
    if (!isBookingRequestServiceType(requestedServiceType) || requestedServiceType !== serviceType) {
      throw new Error('La prestation CRM ne correspond pas à la demande client.');
    }

    const centerConfig = await readCenterConfig(transaction, db, params.centerId);
    let resolvedClientId = '';

    if (params.existingClientId) {
      const existingClientRef = doc(db, 'clients', params.existingClientId);
      const existingClientSnapshot = await transaction.get(existingClientRef);
      if (existingClientSnapshot.exists()) {
        const existingClient = existingClientSnapshot.data() as Client;
        if (existingClient.centerId !== params.centerId) {
          throw new Error("Le client existant n'appartient pas à votre centre.");
        }
        if (existingClient.phone !== bookingRequest.phone) {
          throw new Error('Le client existant ne correspond pas au téléphone de la demande.');
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
        throw new Error('Identifiant client déjà utilisé.');
      }

      newClient = {
        id: params.newClientId,
        firstName: bookingRequest.firstName,
        lastName: bookingRequest.lastName,
        phone: bookingRequest.phone,
        email: bookingRequest.email || '',
        centerId: params.centerId,
        createdAt: params.createdAt,
        status: 'active',
        gender: 'H',
        sportGoals: []
      };
      resolvedClientId = params.newClientId;
    }

    const appointmentRef = doc(db, 'appointments', params.appointmentId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, dateTime);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, dateTime, params.processedAt, centerConfig);

    if (appointmentSnapshot.exists()) {
      throw new Error('Une réservation existe déjà pour cette demande.');
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

    const slotWithoutRequestHold = removeBookingRequestHold(slot, params.requestId, centerConfig);
    const nextSlot = addAppointmentToSlot(slotWithoutRequestHold, buildAppointmentSlotEntry({
      appointmentId: params.appointmentId,
      serviceId: params.serviceId,
      serviceType,
      createdAt: params.processedAt,
      source: 'booking_request',
      requestId: params.requestId,
    }), centerConfig);

    const processedByUserName = params.audit.userName || params.audit.userId;
    const clientLabel = `${bookingRequest.firstName || ''} ${bookingRequest.lastName || ''}`.trim() || bookingRequest.phone || params.requestId;

    if (newClientRef && newClient) {
      transaction.set(newClientRef, newClient);
    }
    transaction.set(appointmentRef, appointment);
    writeSlotOrDelete(transaction, db, slotRef, nextSlot);
    transaction.update(requestRef, {
      status: 'accepted',
      clientId: resolvedClientId,
      appointmentId: params.appointmentId,
      processedAt: params.processedAt,
      processedByUserId: params.audit.userId,
      processedByUserName,
      acceptedAt: params.processedAt,
    });
    writeCrmAuditLog(transaction, db, params.audit, {
      action: 'ACCEPT_BOOKING_REQUEST',
      details: `Approbation de la demande de réservation en ligne pour : ${clientLabel} (Date : ${bookingRequest.bookingDate} à ${bookingRequest.bookingTime})`,
      targetId: params.requestId,
      targetType: 'booking_request',
      centerId: params.centerId,
      centerName: params.audit.centerName || centerConfig.name,
      timestamp: params.processedAt,
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
    processedAt: string;
    audit: CrmTransactionAuditContext;
  }
): Promise<void> {
  await runTransaction(db, async transaction => {
    assertString(params.requestId, 'Demande invalide.');
    assertString(params.centerId, 'Centre invalide.');
    assertString(params.processedAt, 'Date de refus invalide.');

    const requestRef = doc(db, 'booking_requests', params.requestId);
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error('Demande de réservation introuvable.');
    }

    const bookingRequest = requestSnapshot.data() as BookingRequest;
    if (bookingRequest.centerId !== params.centerId) {
      throw new Error("Cette demande n'appartient pas à votre centre.");
    }
    if (bookingRequest.status !== 'pending') {
      throw new Error('Cette demande a déjà été traitée.');
    }

    const dateTime = `${bookingRequest.bookingDate}T${bookingRequest.bookingTime}`;
    const centerConfig = await readCenterConfig(transaction, db, params.centerId);
    const slotRef = getAppointmentSlotRef(db, params.centerId, dateTime);
    const slotSnapshot = await transaction.get(slotRef);
    const slot = await normalizeSlotFromSnapshot(transaction, db, slotSnapshot, params.centerId, dateTime, params.processedAt, centerConfig);
    const nextSlot = removeBookingRequestHold(slot, params.requestId, centerConfig);
    const processedByUserName = params.audit.userName || params.audit.userId;
    const clientLabel = `${bookingRequest.firstName || ''} ${bookingRequest.lastName || ''}`.trim() || bookingRequest.phone || params.requestId;

    writeSlotOrDelete(transaction, db, slotRef, nextSlot);
    transaction.update(requestRef, {
      status: 'rejected',
      processedAt: params.processedAt,
      processedByUserId: params.audit.userId,
      processedByUserName,
      rejectedAt: params.processedAt,
    });
    writeCrmAuditLog(transaction, db, params.audit, {
      action: 'REJECT_BOOKING_REQUEST',
      details: `Rejet de la demande de réservation en ligne pour : ${clientLabel} (Date : ${bookingRequest.bookingDate} à ${bookingRequest.bookingTime})`,
      targetId: params.requestId,
      targetType: 'booking_request',
      centerId: params.centerId,
      centerName: params.audit.centerName || centerConfig.name,
      timestamp: params.processedAt,
    });
  });
}
