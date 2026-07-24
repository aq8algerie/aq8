/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for Server-side Public Center Image Uploads
 * POST /api/upload-center-image
 */

import { NextResponse } from 'next/server';
import { getAdminApp } from '@/src/lib/serverFirebaseAdmin';
import { getStorage } from 'firebase-admin/storage';

export async function POST(request: Request) {
  try {
    let centerId = '';
    let fileName = 'center-image.png';
    let mimeType = 'image/png';
    let buffer: Buffer | null = null;
    let base64DataUrl = '';

    const contentTypeHeader = request.headers.get('content-type') || '';

    if (contentTypeHeader.includes('application/json')) {
      const json = await request.json();
      centerId = String(json.centerId || '').trim();
      fileName = String(json.fileName || 'center-image.png').trim();
      mimeType = String(json.mimeType || 'image/png').trim();
      base64DataUrl = String(json.imageBase64 || '').trim();

      if (base64DataUrl) {
        const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1] || mimeType;
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64DataUrl, 'base64');
        }
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      centerId = String(formData.get('centerId') || '').trim();

      if (file) {
        fileName = file.name;
        mimeType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        base64DataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    }

    if (!buffer || !centerId) {
      return NextResponse.json({ ok: false, error: 'Fichier ou identifiant du centre manquant.' }, { status: 400 });
    }

    const bucketName = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || 'aq8algerie-4f675.firebasestorage.app';
    let imageUrl = base64DataUrl;

    try {
      const storageBucket = getStorage(getAdminApp()).bucket(bucketName);
      const sanitizedFileName = fileName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._-]+/g, '-');

      const destinationPath = `centers/${centerId}/public/${Date.now()}-${sanitizedFileName}`;
      const fileRef = storageBucket.file(destinationPath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            centerId,
            usage: 'public-center-image',
          },
        },
        public: true,
      });

      await fileRef.makePublic().catch(() => null);
      imageUrl = `https://storage.googleapis.com/${bucketName}/${destinationPath}`;
    } catch (storageError) {
      console.warn('Direct Cloud Storage bucket upload failed, using Data URL storage fallback:', storageError);
      imageUrl = base64DataUrl;
    }

    return NextResponse.json({ ok: true, imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Upload center image endpoint error:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'upload de l\'image.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
