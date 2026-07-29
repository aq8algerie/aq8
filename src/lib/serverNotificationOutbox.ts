import { createHash, randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import {
  type CrmEmailNotificationPayload,
  type EmailResult,
  sendCrmEmailNotification,
} from './serverEmailNotifications';

type DispatchOptions = {
  idempotencyKey?: string;
  source: string;
};

function getOutboxId(payload: CrmEmailNotificationPayload, key: string): string {
  return createHash('sha256')
    .update(`${payload.type}:${payload.centerId}:${key}`)
    .digest('hex');
}

function getPayloadTarget(payload: CrmEmailNotificationPayload): string {
  if ('appointmentId' in payload && payload.appointmentId) return payload.appointmentId;
  if ('requestId' in payload) return payload.requestId;
  if ('paymentId' in payload) return payload.paymentId;
  if ('clientPackageId' in payload) return payload.clientPackageId;
  return randomUUID();
}

export async function dispatchCrmEmailWithOutbox(
  db: Firestore,
  payload: CrmEmailNotificationPayload,
  options: DispatchOptions,
): Promise<EmailResult> {
  const key = options.idempotencyKey || `${getPayloadTarget(payload)}:${randomUUID()}`;
  const outboxRef = db.collection('notification_outbox').doc(getOutboxId(payload, key));
  const now = new Date();
  const claimed = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(outboxRef);
    const data = snapshot.data();
    if (data?.status === 'sent' || data?.status === 'skipped') {
      return false;
    }
    if (
      data?.status === 'processing' &&
      typeof data.processingStartedAt === 'string' &&
      now.getTime() - new Date(data.processingStartedAt).getTime() < 120_000
    ) {
      return false;
    }
    transaction.set(outboxRef, {
      payload,
      idempotencyKey: key,
      source: options.source,
      status: 'processing',
      attempts: Number(data?.attempts || 0) + 1,
      createdAt: data?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      processingStartedAt: now.toISOString(),
    }, { merge: true });
    return true;
  });

  if (!claimed) {
    return { sent: false, skipped: 'already_processed_or_processing' };
  }

  try {
    const result = await sendCrmEmailNotification(db, payload);
    const retryable = !result.sent && Boolean(result.error);
    await outboxRef.set({
      status: result.sent ? 'sent' : retryable ? 'pending' : 'skipped',
      result,
      updatedAt: new Date().toISOString(),
      ...(result.sent ? { sentAt: new Date().toISOString() } : {}),
      ...(retryable
        ? { nextAttemptAt: new Date(Date.now() + 5 * 60_000).toISOString() }
        : {}),
    }, { merge: true });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notification email impossible.';
    await outboxRef.set({
      status: 'pending',
      lastError: message,
      updatedAt: new Date().toISOString(),
      nextAttemptAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    }, { merge: true });
    return { sent: false, error: message };
  }
}


export async function retryPendingCrmEmails(
  db: Firestore,
  limit = 20,
): Promise<{ processed: number; sent: number; failed: number }> {
  const snapshot = await db.collection('notification_outbox')
    .where('status', '==', 'pending')
    .limit(Math.max(1, Math.min(limit, 50)))
    .get();
  const dueDocuments = snapshot.docs.filter(document => {
    const nextAttemptAt = document.data().nextAttemptAt;
    return !nextAttemptAt || new Date(String(nextAttemptAt)).getTime() <= Date.now();
  });
  let sent = 0;
  let failed = 0;

  for (const document of dueDocuments) {
    const data = document.data() as {
      payload?: CrmEmailNotificationPayload;
      idempotencyKey?: string;
      source?: string;
    };
    if (!data.payload || !data.idempotencyKey) {
      await document.ref.set({
        status: 'skipped',
        lastError: 'Outbox payload or idempotency key missing.',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      failed++;
      continue;
    }
    const result = await dispatchCrmEmailWithOutbox(db, data.payload, {
      source: data.source || 'outbox-retry',
      idempotencyKey: data.idempotencyKey,
    });
    if (result.sent) sent++;
    else failed++;
  }

  return { processed: dueDocuments.length, sent, failed };
}
