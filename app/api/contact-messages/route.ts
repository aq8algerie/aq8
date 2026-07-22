/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for Contact Form Messages
 * POST /api/contact-messages
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { validatePublicContactMessage } from '@/src/lib/publicFormValidation';
import { sendPublicContactNotifications } from '@/src/lib/serverEmailNotifications';
import type { Center } from '@/src/types';

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => ({}));
    const db = getAdminDb();
    const centersSnapshot = await db.collection('centers').get();
    const centers = centersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Center));

    const validation = validatePublicContactMessage(data, centers.map(c => c.id));
    if (validation.valid === false) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const validData = validation.data;
    const createdAt = new Date().toISOString();
    const messageRef = await db.collection('contact_messages').add({
      ...validData,
      status: 'new',
      createdAt,
    });

    const selectedCenter = centers.find(center => center.id === validData.centerId) || null;
    sendPublicContactNotifications({
      center: selectedCenter,
      messageId: messageRef.id,
      message: validData,
    }).catch(error => {
      console.error('Public contact email notification failed:', error);
    });

    return NextResponse.json({ ok: true, id: messageRef.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible d\'envoyer le message.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
