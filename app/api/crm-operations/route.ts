import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import {
  CrmAccessError,
  getCrmErrorResponse,
  type ServerCrmProfile,
  verifyServerCrmAccess,
} from '@/src/lib/serverCrmAccess';
import { validateSessionCompletion } from '@/src/lib/packageRules';
import { validatePaymentReversal } from '@/src/lib/financialLedgerRules';
import type { CrmEmailNotificationPayload } from '@/src/lib/serverEmailNotifications';
import { dispatchCrmEmailWithOutbox } from '@/src/lib/serverNotificationOutbox';
import {
  isSameClientPackageActivation,
  isSamePaymentOperation,
  validatePackageActivation,
  validatePaymentRegistration,
} from '@/src/lib/paymentRules';
import type {
  Appointment,
  Center,
  Client,
  ClientPackage,
  Package,
  Payment,
  Service,
} from '@/src/types';

type OperationPayload = {
  action?: string;
  centerId?: string;
  appointmentId?: string;
  clientPackageId?: string;
  clientId?: string;
  packageId?: string;
  paymentId?: string;
  amount?: number;
  method?: Payment['method'];
  receiptNumber?: string;
  date?: string;
  autoActivatePackage?: boolean;
  purchaseDate?: string;
  reason?: string;
};

const PAYMENT_METHODS: Payment['method'][] = ['cash', 'card', 'ccp', 'cheque'];

function requiredText(value: unknown, label: string, maxLength = 160): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) {
    throw new CrmAccessError(`${label} invalide.`, 400);
  }
  return text;
}

function optionalText(value: unknown, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maxLength) {
    throw new CrmAccessError('Texte trop long.', 400);
  }
  return text;
}

function requiredDate(value: unknown, label: string): string {
  const date = requiredText(value, label, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    date > new Date().toISOString().slice(0, 10)
  ) {
    throw new CrmAccessError(`${label} invalide ou située dans le futur.`, 400);
  }
  return date;
}

function getReceiptIndexId(centerId: string, receiptNumber: string): string {
  return createHash('sha256')
    .update(`${centerId}:${receiptNumber.trim().toLowerCase()}`)
    .digest('hex');
}

function assertCenterAccess(actor: ServerCrmProfile, centerId: string): void {
  if (actor.role === 'center_manager' && actor.centerId !== centerId) {
    throw new CrmAccessError("Cette opération n'appartient pas à votre centre.", 403);
  }
}

function docData<T extends { id: string }>(
  snapshot: FirebaseFirestore.DocumentSnapshot,
): T | undefined {
  if (!snapshot.exists) return undefined;
  return { ...snapshot.data(), id: snapshot.id } as T;
}

function writeAudit(
  transaction: Transaction,
  actor: ServerCrmProfile,
  input: {
    action: string;
    details: string;
    targetId: string;
    targetType: string;
    centerId: string;
    centerName?: string | null;
    timestamp: string;
  },
): void {
  const auditRef = getAdminDb().collection('audit_logs').doc();
  transaction.set(auditRef, {
    timestamp: input.timestamp,
    userId: actor.uid,
    userName: actor.name,
    role: actor.role,
    action: input.action,
    details: input.details,
    targetId: input.targetId,
    targetType: input.targetType,
    centerId: input.centerId,
    centerName: input.centerName || null,
  });
}

function getPayloadTargetForIdempotency(payload: OperationPayload): string {
  return String(
    payload.appointmentId || payload.paymentId || payload.clientPackageId || payload.clientId || '',
  );
}

async function completeAppointment(
  actor: ServerCrmProfile,
  payload: OperationPayload,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  const appointmentId = requiredText(payload.appointmentId, 'Réservation', 120);
  const clientPackageId = requiredText(payload.clientPackageId, 'Forfait client', 120);
  assertCenterAccess(actor, centerId);

  return db.runTransaction(async transaction => {
    const appointmentRef = db.collection('appointments').doc(appointmentId);
    const clientPackageRef = db.collection('client_packages').doc(clientPackageId);
    const appointmentSnapshot = await transaction.get(appointmentRef);
    const clientPackageSnapshot = await transaction.get(clientPackageRef);
    const appointment = docData<Appointment>(appointmentSnapshot);
    const clientPackage = docData<ClientPackage>(clientPackageSnapshot);

    if (!appointment || appointment.centerId !== centerId) {
      throw new CrmAccessError('Réservation introuvable dans ce centre.', 404);
    }
    if (
      appointment.status === 'completed' &&
      appointment.completedWithClientPackageId === clientPackageId &&
      appointment.deductedCredits === 1 &&
      clientPackage
    ) {
      return {
        ok: true,
        created: false,
        clientPackageId,
        sessionsRemaining: clientPackage.sessionsRemaining,
        packageStatus: clientPackage.status,
      };
    }

    const clientSnapshot = await transaction.get(db.collection('clients').doc(appointment.clientId));
    const serviceSnapshot = await transaction.get(db.collection('services').doc(appointment.serviceId));
    const client = docData<Client>(clientSnapshot);
    const service = docData<Service>(serviceSnapshot);
    const packageSnapshot = clientPackage
      ? await transaction.get(db.collection('packages').doc(clientPackage.packageId))
      : null;
    const packageDefinition = packageSnapshot ? docData<Package>(packageSnapshot) : undefined;

    const validation = validateSessionCompletion({
      appointment,
      client,
      clientPackage,
      service,
      packageDefinition,
      managerCenterId: centerId,
    });
    if (validation.valid === false) {
      throw new CrmAccessError(validation.error, 409);
    }

    const completedAt = new Date().toISOString();
    const sessionsRemaining = clientPackage.sessionsRemaining - 1;
    const packageStatus: ClientPackage['status'] = sessionsRemaining === 0 ? 'completed' : 'active';
    const clientName = `${client.firstName} ${client.lastName}`.trim() || appointment.clientId;
    const serviceName = service.name || (service.type === 'aq8' ? 'AQ8' : 'Wonder');

    transaction.update(clientPackageRef, {
      sessionsRemaining,
      status: packageStatus,
      updatedAt: completedAt,
      lastSessionAt: completedAt,
      lastCompletedAppointmentId: appointment.id,
    });
    transaction.update(appointmentRef, {
      status: 'completed',
      completedAt,
      completedByUserId: actor.uid,
      completedByUserName: actor.name,
      completedWithClientPackageId: clientPackage.id,
      deductedCredits: 1,
      updatedAt: completedAt,
    });
    writeAudit(transaction, actor, {
      action: 'COMPLETE_APPOINTMENT',
      details: `Validation de la séance du ${appointment.dateTime.replace('T', ' ')} pour ${clientName}. 1 crédit ${serviceName} déduit du forfait ${packageDefinition.name}. Solde restant : ${sessionsRemaining} séance(s).`,
      targetId: appointment.id,
      targetType: 'appointment',
      centerId,
      timestamp: completedAt,
    });

    return {
      ok: true,
      created: true,
      clientPackageId,
      sessionsRemaining,
      packageStatus,
    };
  });
}

async function assignPackage(
  actor: ServerCrmProfile,
  payload: OperationPayload,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  const clientPackageId = requiredText(payload.clientPackageId, 'Forfait client', 120);
  const clientId = requiredText(payload.clientId, 'Client', 120);
  const packageId = requiredText(payload.packageId, 'Forfait', 120);
  const purchaseDate = requiredDate(payload.purchaseDate, "Date d'activation");
  assertCenterAccess(actor, centerId);

  return db.runTransaction(async transaction => {
    const clientPackageRef = db.collection('client_packages').doc(clientPackageId);
    const existingSnapshot = await transaction.get(clientPackageRef);
    if (existingSnapshot.exists) {
      const existing = docData<ClientPackage>(existingSnapshot)!;
      const expected = {
        id: clientPackageId,
        clientId,
        packageId,
        centerId,
        purchaseDate,
        sessionsRemaining: existing.sessionsRemaining,
        totalSessions: existing.totalSessions,
        status: existing.status,
      } as ClientPackage;
      if (!isSameClientPackageActivation(existing, expected)) {
        throw new CrmAccessError('Cet identifiant correspond déjà à une autre activation.', 409);
      }
      return { ok: true, created: false, clientPackageId };
    }

    const clientSnapshot = await transaction.get(db.collection('clients').doc(clientId));
    const packageSnapshot = await transaction.get(db.collection('packages').doc(packageId));
    const centerSnapshot = await transaction.get(db.collection('centers').doc(centerId));
    const client = docData<Client>(clientSnapshot);
    const packageDefinition = docData<Package>(packageSnapshot);
    const center = docData<Center>(centerSnapshot);
    const validation = validatePackageActivation({ center, client, packageDefinition, centerId });
    if (validation.valid === false) {
      throw new CrmAccessError(validation.error, 409);
    }

    const activatedAt = new Date().toISOString();
    const clientPackage: ClientPackage = {
      id: clientPackageId,
      clientId,
      packageId,
      centerId,
      sessionsRemaining: packageDefinition.sessionsCount,
      totalSessions: packageDefinition.sessionsCount,
      purchaseDate,
      status: 'active',
      activatedAt,
      activatedByUserId: actor.uid,
      activatedByUserName: actor.name,
    };
    transaction.create(clientPackageRef, clientPackage);
    writeAudit(transaction, actor, {
      action: 'ASSIGN_PACKAGE',
      details: `Activation du forfait ${packageDefinition.name} pour ${client.firstName} ${client.lastName}, avec ${packageDefinition.sessionsCount} séance(s).`,
      targetId: clientPackageId,
      targetType: 'client_package',
      centerId,
      centerName: center.name,
      timestamp: activatedAt,
    });
    return { ok: true, created: true, clientPackageId };
  });
}

async function recordPayment(
  actor: ServerCrmProfile,
  payload: OperationPayload,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  const paymentId = requiredText(payload.paymentId, 'Paiement', 120);
  const clientId = requiredText(payload.clientId, 'Client', 120);
  const packageId = requiredText(payload.packageId, 'Forfait', 120);
  const receiptNumber = requiredText(payload.receiptNumber, 'Référence du reçu', 80);
  const date = requiredDate(payload.date, 'Date du paiement');
  const amount = payload.amount;
  const method = payload.method;
  const autoActivatePackage = payload.autoActivatePackage === true;
  const clientPackageId = autoActivatePackage
    ? requiredText(payload.clientPackageId, 'Forfait client', 120)
    : undefined;
  if (typeof amount !== 'number' || !PAYMENT_METHODS.includes(method as Payment['method'])) {
    throw new CrmAccessError('Montant ou mode de paiement invalide.', 400);
  }
  assertCenterAccess(actor, centerId);

  return db.runTransaction(async transaction => {
    const paymentRef = db.collection('payments').doc(paymentId);
    const receiptIndexRef = db.collection('payment_receipts').doc(getReceiptIndexId(centerId, receiptNumber));
    const [paymentSnapshot, receiptIndexSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(receiptIndexRef),
    ]);
    const expectedPayment: Payment = {
      id: paymentId,
      clientId,
      packageId,
      centerId,
      amount,
      date,
      method: method as Payment['method'],
      receiptNumber,
      ...(clientPackageId ? { clientPackageId } : {}),
    };

    if (receiptIndexSnapshot.exists && receiptIndexSnapshot.data()?.paymentId !== paymentId) {
      throw new CrmAccessError('Cette référence de reçu est déjà utilisée dans ce centre.', 409);
    }

    if (paymentSnapshot.exists) {
      const existing = docData<Payment>(paymentSnapshot)!;
      if (!isSamePaymentOperation(existing, expectedPayment)) {
        throw new CrmAccessError('Cet identifiant correspond déjà à un autre paiement.', 409);
      }
      if (clientPackageId) {
        const packageActivationSnapshot = await transaction.get(
          db.collection('client_packages').doc(clientPackageId),
        );
        if (
          !packageActivationSnapshot.exists ||
          packageActivationSnapshot.data()?.sourcePaymentId !== paymentId
        ) {
          throw new CrmAccessError("Le paiement existe mais l'activation associée est incohérente.", 409);
        }
      }
      return {
        ok: true,
        created: false,
        paymentId,
        clientPackageId,
        packageActivated: autoActivatePackage,
      };
    }

    const clientSnapshot = await transaction.get(db.collection('clients').doc(clientId));
    const packageSnapshot = await transaction.get(db.collection('packages').doc(packageId));
    const centerSnapshot = await transaction.get(db.collection('centers').doc(centerId));
    const client = docData<Client>(clientSnapshot);
    const packageDefinition = docData<Package>(packageSnapshot);
    const center = docData<Center>(centerSnapshot);
    const validation = validatePaymentRegistration({
      center,
      client,
      packageDefinition,
      centerId,
      amount,
      method: method as Payment['method'],
      receiptNumber,
      autoActivatePackage,
    });
    if (validation.valid === false) {
      throw new CrmAccessError(validation.error, 409);
    }

    const clientPackageRef = clientPackageId
      ? db.collection('client_packages').doc(clientPackageId)
      : null;
    if (clientPackageRef) {
      const clientPackageSnapshot = await transaction.get(clientPackageRef);
      if (clientPackageSnapshot.exists) {
        throw new CrmAccessError('Cet identifiant de forfait client est déjà utilisé.', 409);
      }
    }

    const recordedAt = new Date().toISOString();
    const payment: Payment = {
      ...expectedPayment,
      kind: 'payment',
      status: 'posted',
      createdAt: recordedAt,
      recordedByUserId: actor.uid,
      recordedByUserName: actor.name,
    };
    transaction.create(paymentRef, payment);
    transaction.set(receiptIndexRef, {
      centerId,
      receiptNumber,
      paymentId,
      createdAt: recordedAt,
    });

    if (clientPackageRef && clientPackageId) {
      transaction.create(clientPackageRef, {
        id: clientPackageId,
        clientId,
        packageId,
        centerId,
        sessionsRemaining: packageDefinition.sessionsCount,
        totalSessions: packageDefinition.sessionsCount,
        purchaseDate: date,
        status: 'active',
        activatedAt: recordedAt,
        activatedByUserId: actor.uid,
        activatedByUserName: actor.name,
        sourcePaymentId: paymentId,
      } satisfies ClientPackage);
    }

    writeAudit(transaction, actor, {
      action: autoActivatePackage ? 'RECORD_PAYMENT_AND_ACTIVATE_PACKAGE' : 'RECORD_PAYMENT',
      details: `Paiement de ${amount} DZD enregistré pour ${client.firstName} ${client.lastName}, forfait ${packageDefinition.name}, référence ${receiptNumber}.${autoActivatePackage ? ' Forfait activé dans la même opération.' : ''}`,
      targetId: paymentId,
      targetType: 'payment',
      centerId,
      centerName: center.name,
      timestamp: recordedAt,
    });

    return {
      ok: true,
      created: true,
      paymentId,
      clientPackageId,
      packageActivated: autoActivatePackage,
    };
  });
}

async function reversePayment(
  actor: ServerCrmProfile,
  payload: OperationPayload,
) {
  const db = getAdminDb();
  const centerId = requiredText(payload.centerId, 'Centre', 80);
  const paymentId = requiredText(payload.paymentId, 'Paiement', 120);
  const reason = optionalText(payload.reason, 500) || 'Annulation comptable';
  const reversalId = `reversal-${paymentId}`;
  assertCenterAccess(actor, centerId);

  return db.runTransaction(async transaction => {
    const paymentRef = db.collection('payments').doc(paymentId);
    const reversalRef = db.collection('payments').doc(reversalId);
    const paymentSnapshot = await transaction.get(paymentRef);
    const reversalSnapshot = await transaction.get(reversalRef);
    const payment = docData<Payment>(paymentSnapshot);
    const basicValidation = validatePaymentReversal({ payment, clientPackage: undefined, centerId });
    if (basicValidation.valid === false) {
      throw new CrmAccessError(basicValidation.error, 404);
    }
    if (reversalSnapshot.exists) {
      const existingReversal = docData<Payment>(reversalSnapshot);
      if (
        existingReversal?.kind !== 'reversal' ||
        existingReversal.reversalOfPaymentId !== payment.id ||
        existingReversal.amount !== -payment.amount
      ) {
        throw new CrmAccessError("L'écriture d'annulation existante est incohérente.", 409);
      }
      if (payment.status !== 'reversed' || payment.reversedByPaymentId !== reversalId) {
        throw new CrmAccessError("Le paiement et son écriture d'annulation sont désynchronisés.", 409);
      }
      return { ok: true, created: false, paymentId, reversalPaymentId: reversalId };
    }
    if (payment.status === 'reversed') {
      throw new CrmAccessError("Le paiement est marqué annulé sans écriture de contrepartie.", 409);
    }

    const clientPackageRef = payment.clientPackageId
      ? db.collection('client_packages').doc(payment.clientPackageId)
      : null;
    const clientPackageSnapshot = clientPackageRef
      ? await transaction.get(clientPackageRef)
      : null;
    const clientPackage = clientPackageSnapshot ? docData<ClientPackage>(clientPackageSnapshot) : undefined;
    const reversalValidation = validatePaymentReversal({ payment, clientPackage, centerId });
    if (reversalValidation.valid === false) {
      throw new CrmAccessError(reversalValidation.error, 409);
    }

    const reversedAt = new Date().toISOString();
    const reversal: Payment = {
      id: reversalId,
      clientId: payment.clientId,
      packageId: payment.packageId,
      centerId,
      amount: -payment.amount,
      date: reversedAt.slice(0, 10),
      method: payment.method,
      receiptNumber: `ANN-${payment.receiptNumber || payment.id}`.slice(0, 80),
      kind: 'reversal',
      status: 'posted',
      reversalOfPaymentId: payment.id,
      reason,
      createdAt: reversedAt,
      recordedByUserId: actor.uid,
      recordedByUserName: actor.name,
    };
    transaction.create(reversalRef, reversal);
    transaction.update(paymentRef, {
      status: 'reversed',
      reversedAt,
      reversedByPaymentId: reversalId,
      reversalReason: reason,
    });
    if (clientPackageRef && clientPackage) {
      transaction.update(clientPackageRef, {
        status: 'expired',
        updatedAt: reversedAt,
        reversedAt,
        reversedByPaymentId: reversalId,
      });
    }
    writeAudit(transaction, actor, {
      action: 'REVERSE_PAYMENT',
      details: `Annulation comptable du paiement ${payment.receiptNumber || payment.id} pour ${payment.amount} DZD. Motif : ${reason}.`,
      targetId: paymentId,
      targetType: 'payment',
      centerId,
      timestamp: reversedAt,
    });

    return { ok: true, created: true, paymentId, reversalPaymentId: reversalId };
  });
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin', 'center_manager']);
    const payload = await request.json().catch(() => ({})) as OperationPayload;
    let result: Record<string, unknown>;
    let notification: CrmEmailNotificationPayload | null = null;

    switch (payload.action) {
      case 'complete_appointment':
        result = await completeAppointment(actor, payload);
        if (result.created !== false) {
          notification = {
            type: 'appointment_completed',
            centerId: requiredText(payload.centerId, 'Centre', 80),
            appointmentId: requiredText(payload.appointmentId, 'Reservation', 120),
            sessionsRemaining: Number(result.sessionsRemaining),
          };
        }
        break;
      case 'assign_package':
        result = await assignPackage(actor, payload);
        if (result.created !== false) {
          notification = {
            type: 'package_assigned',
            centerId: requiredText(payload.centerId, 'Centre', 80),
            clientPackageId: requiredText(payload.clientPackageId, 'Forfait client', 120),
          };
        }
        break;
      case 'record_payment':
        result = await recordPayment(actor, payload);
        if (result.created !== false) {
          notification = {
            type: 'payment_recorded',
            centerId: requiredText(payload.centerId, 'Centre', 80),
            paymentId: requiredText(payload.paymentId, 'Paiement', 120),
            ...(payload.clientPackageId
              ? { clientPackageId: requiredText(payload.clientPackageId, 'Forfait client', 120) }
              : {}),
          };
        }
        break;
      case 'reverse_payment':
        result = await reversePayment(actor, payload);
        break;
      default:
        throw new CrmAccessError('Opération CRM inconnue.', 400);
    }

    const email = notification
      ? await dispatchCrmEmailWithOutbox(getAdminDb(), notification, {
          source: 'crm-operation',
          idempotencyKey: `${payload.action}:${getPayloadTargetForIdempotency(payload)}`,
        })
      : undefined;
    return NextResponse.json({ ...result, ...(email ? { email } : {}) });
  } catch (error) {
    const response = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: response.message }, { status: response.status });
  }
}
