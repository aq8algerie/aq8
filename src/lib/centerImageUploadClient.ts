import { auth } from './firebase';

const MAX_CENTER_IMAGE_BYTES = 5 * 1024 * 1024;
const CENTER_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCenterImage(file: File): void {
  if (!CENTER_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Formats acceptés : JPG, PNG ou WebP.');
  }
  if (file.size <= 0 || file.size > MAX_CENTER_IMAGE_BYTES) {
    throw new Error('Image trop lourde. Taille maximale : 5 Mo.');
  }
}

export async function uploadCenterImage(centerId: string, file: File): Promise<string> {
  validateCenterImage(file);
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Session CRM introuvable. Reconnectez-vous avant de téléverser une image.');
  }

  const token = await user.getIdToken();
  const formData = new FormData();
  formData.set('centerId', centerId);
  formData.set('file', file);

  const response = await fetch('/api/upload-center-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = await response.json().catch(() => null) as { ok?: boolean; imageUrl?: string; error?: string } | null;
  if (!response.ok || body?.ok !== true || !body.imageUrl) {
    throw new Error(body?.error || `Téléversement refusé (${response.status}).`);
  }
  return body.imageUrl;
}
