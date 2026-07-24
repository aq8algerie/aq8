/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for Server-side Public Center Image Uploads
 * POST /api/upload-center-image
 */

import { NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { getStorage } from 'firebase-admin/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const centerId = String(formData.get('centerId') || '').trim();

    if (!file || !centerId) {
      return NextResponse.json({ ok: false, error: 'Fichier ou identifiant du centre manquant.' }, { status: 400 });
    }

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: 'Format d\'image non accepté (formats autorisés: JPG, PNG, WebP).' }, { status: 400 });
    }

    const MAX_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'L\'image dépasse la taille maximale autorisée de 10 Mo.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucketName = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || 'aq8algerie-4f675.firebasestorage.app';

    let imageUrl = '';

    try {
      const storageBucket = getStorage(getAdminApp()).bucket(bucketName);
      const sanitizedFileName = file.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._-]+/g, '-');

      const destinationPath = `centers/${centerId}/public/${Date.now()}-${sanitizedFileName}`;
      const fileRef = storageBucket.file(destinationPath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            centerId,
            usage: 'public-center-image',
          },
        },
        public: true,
      });

      // Try making the file public if possible
      await fileRef.makePublic().catch(() => null);

      imageUrl = `https://storage.googleapis.com/${bucketName}/${destinationPath}`;
    } catch (storageError) {
      console.warn('Direct Cloud Storage bucket upload failed, using Data URL storage fallback:', storageError);

      // Base64 Data URL fallback stored directly in Document metadata if GCS bucket permissions fail
      const base64 = buffer.toString('base64');
      imageUrl = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({ ok: true, imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Upload center image endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'image.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
