/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for CRM Email Notifications
 * POST /api/email-notifications/crm
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { CrmEmailNotificationPayload } from '@/src/lib/serverEmailNotifications';
import { dispatchCrmEmailWithOutbox } from '@/src/lib/serverNotificationOutbox';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && String(value[key]).trim().length > 0;
}

function isCrmEmailPayload(value: unknown): value is CrmEmailNotificationPayload {
  if (!isPlainObject(value) || !hasString(value, 'type') || !hasString(value, 'centerId')) return false;

  switch (value.type) {
    case 'booking_request_accepted':
    case 'booking_request_rejected':
      return hasString(value, 'requestId');
    case 'appointment_booked':
    case 'appointment_updated':
    case 'appointment_cancelled':
    case 'appointment_completed':
      return hasString(value, 'appointmentId');
    case 'package_assigned':
      return hasString(value, 'clientPackageId');
    case 'payment_recorded':
      return hasString(value, 'paymentId');
    default:
      return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    if (!isCrmEmailPayload(rawBody)) {
      return NextResponse.json({ ok: false, error: 'Notification CRM invalide.' }, { status: 400 });
    }

    const payload: CrmEmailNotificationPayload = rawBody;
    const actor = await verifyServerCrmAccess(request, ['super_admin', 'center_manager']);
    if (actor.role === 'center_manager' && actor.centerId !== payload.centerId) {
      throw new CrmAccessError('Ce centre ne correspond pas au manager connecté.', 403);
    }
    const result = await dispatchCrmEmailWithOutbox(getAdminDb(), payload, {
      source: 'crm-email-api',
      idempotencyKey: request.headers.get('x-idempotency-key') || undefined,
    });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    const response = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: response.message }, { status: response.status });
  }
}
