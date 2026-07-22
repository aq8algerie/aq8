/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for CRM Email Notifications
 * POST /api/email-notifications/crm
 */

import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { CrmEmailNotificationPayload, sendCrmEmailNotification } from '@/src/lib/serverEmailNotifications';

type CrmUserProfile = {
  role?: string;
  centerId?: string | null;
  active?: boolean;
};

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

async function verifyCrmEmailAccess(request: Request, centerId: string): Promise<void> {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error('Authentification CRM requise.');
  }

  const decodedToken = await getAdminAuthInstance().verifyIdToken(match[1]);
  const profileSnapshot = await getAdminDb().collection('users').doc(decodedToken.uid).get();
  if (!profileSnapshot.exists) {
    throw new Error('Profil CRM introuvable.');
  }

  const profile = profileSnapshot.data() as CrmUserProfile;
  if (profile.active !== true || (profile.role !== 'super_admin' && profile.role !== 'center_manager')) {
    throw new Error('Profil CRM non autorisé.');
  }

  if (profile.role === 'center_manager' && profile.centerId !== centerId) {
    throw new Error('Ce centre ne correspond pas au manager connecté.');
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    if (!isCrmEmailPayload(rawBody)) {
      return NextResponse.json({ ok: false, error: 'Notification CRM invalide.' }, { status: 400 });
    }

    const payload: CrmEmailNotificationPayload = rawBody;
    await verifyCrmEmailAccess(request, payload.centerId);
    const result = await sendCrmEmailNotification(getAdminDb(), payload);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Notification email impossible.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
