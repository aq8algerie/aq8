import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp, getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeFileName(fileName: string): string {
  const resolved = fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return resolved.slice(0, 120) || 'center-image';
}

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin', 'center_manager']);
    const formData = await request.formData();
    const file = formData.get('file');
    const centerId = String(formData.get('centerId') || '').trim();

    if (!(file instanceof File) || !centerId) {
      throw new CrmAccessError('Fichier ou identifiant du centre manquant.', 400);
    }
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(centerId)) {
      throw new CrmAccessError('Identifiant du centre invalide.', 400);
    }
    if (actor.role === 'center_manager' && actor.centerId !== centerId) {
      throw new CrmAccessError('Vous ne pouvez modifier que l’image de votre centre.', 403);
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new CrmAccessError('Formats acceptés : JPG, PNG ou WebP.', 400);
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      throw new CrmAccessError('L’image doit peser moins de 5 Mo.', 400);
    }

    const centerSnapshot = await getAdminDb().collection('centers').doc(centerId).get();
    if (!centerSnapshot.exists && actor.role !== 'super_admin') {
      throw new CrmAccessError('Centre introuvable.', 404);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, file.type)) {
      throw new CrmAccessError('Le contenu du fichier ne correspond pas à une image valide.', 400);
    }

    const bucketName = process.env.FIREBASE_ADMIN_STORAGE_BUCKET || 'aq8algerie-4f675.firebasestorage.app';
    const storageBucket = getStorage(getAdminApp()).bucket(bucketName);
    const downloadToken = randomUUID();
    const destinationPath = `centers/${centerId}/public/${randomUUID()}-${sanitizeFileName(file.name)}`;
    const fileRef = storageBucket.file(destinationPath);

    await fileRef.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000,immutable',
        metadata: {
          centerId,
          usage: 'public-center-image',
          uploadedBy: actor.uid,
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${downloadToken}`;
    return NextResponse.json({ ok: true, imageUrl }, { status: 200 });
  } catch (error) {
    console.error('[upload-center-image] failed:', error);
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
