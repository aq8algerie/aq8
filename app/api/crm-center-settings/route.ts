import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import {
  CrmAccessError,
  getCrmErrorResponse,
  verifyServerCrmAccess,
} from '@/src/lib/serverCrmAccess';
import type { Center } from '@/src/types';

type EditableCenterSettings = Pick<
  Center,
  | 'bookingCapacity'
  | 'bookingHours'
  | 'phone'
  | 'email'
  | 'address'
  | 'imageUrl'
  | 'schedule'
  | 'description'
  | 'importantNotes'
  | 'menHours'
  | 'womenHours'
  | 'equipment'
  | 'cancellationRule'
>;

type CenterSettingsMutation = {
  centerId?: unknown;
  updates?: unknown;
};

const ALLOWED_KEYS = new Set<keyof EditableCenterSettings>([
  'bookingCapacity',
  'bookingHours',
  'phone',
  'email',
  'address',
  'imageUrl',
  'schedule',
  'description',
  'importantNotes',
  'menHours',
  'womenHours',
  'equipment',
  'cancellationRule',
]);

const TEXT_LIMITS: Partial<Record<keyof EditableCenterSettings, number>> = {
  phone: 60,
  email: 160,
  address: 240,
  imageUrl: 500,
  schedule: 300,
  description: 2000,
  cancellationRule: 1200,
};

const LIST_LIMITS: Partial<
  Record<keyof EditableCenterSettings, { items: number; itemLength: number }>
> = {
  importantNotes: { items: 20, itemLength: 500 },
  menHours: { items: 20, itemLength: 200 },
  womenHours: { items: 20, itemLength: 200 },
  equipment: { items: 20, itemLength: 200 },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCenterId(value: unknown): string {
  const centerId = typeof value === 'string' ? value.trim() : '';
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(centerId)) {
    throw new CrmAccessError('Identifiant du centre invalide.', 400);
  }
  return centerId;
}

function normalizeText(value: unknown, key: keyof EditableCenterSettings, maxLength: number) {
  if (typeof value !== 'string') {
    throw new CrmAccessError(`Valeur ${key} invalide.`, 400);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new CrmAccessError(`Valeur ${key} trop longue.`, 400);
  }
  return text;
}

function normalizePublicImageUrl(value: unknown): string {
  const imageUrl = normalizeText(value, 'imageUrl', TEXT_LIMITS.imageUrl!);
  if (!imageUrl || imageUrl.startsWith('/images/')) return imageUrl;
  try {
    const parsed = new URL(imageUrl);
    if (
      parsed.protocol !== 'https:'
      || parsed.hostname !== 'firebasestorage.googleapis.com'
    ) {
      throw new Error('unsupported-host');
    }
  } catch {
    throw new CrmAccessError(
      'L’image doit provenir du stockage sécurisé AQ8.',
      400,
    );
  }
  return imageUrl;
}

function normalizeCapacity(value: unknown): Center['bookingCapacity'] {
  if (!isPlainObject(value)) {
    throw new CrmAccessError('Capacité de réservation invalide.', 400);
  }
  if (Object.keys(value).some(key => key !== 'aq8' && key !== 'wonder')) {
    throw new CrmAccessError('Technologie de capacité inconnue.', 400);
  }
  const capacity: NonNullable<Center['bookingCapacity']> = {};
  for (const technology of ['aq8', 'wonder'] as const) {
    if (!(technology in value)) continue;
    const count = value[technology];
    if (!Number.isInteger(count) || Number(count) < 0 || Number(count) > 20) {
      throw new CrmAccessError(
        'La capacité doit être un entier compris entre 0 et 20.',
        400,
      );
    }
    capacity[technology] = Number(count);
  }
  return capacity;
}

function normalizeBookingHours(value: unknown): Center['bookingHours'] {
  if (!isPlainObject(value)) {
    throw new CrmAccessError('Horaires de réservation invalides.', 400);
  }
  const allowedDays = new Set(['0', '1', '2', '3', '4', '5', '6']);
  if (Object.keys(value).some(day => !allowedDays.has(day))) {
    throw new CrmAccessError('Jour de réservation invalide.', 400);
  }

  const normalized: NonNullable<Center['bookingHours']> = {};
  for (const [day, rawRanges] of Object.entries(value)) {
    if (!Array.isArray(rawRanges) || rawRanges.length > 4) {
      throw new CrmAccessError('Plages horaires invalides.', 400);
    }
    const ranges = rawRanges.map(rawRange => {
      if (
        !isPlainObject(rawRange)
        || Object.keys(rawRange).some(key => key !== 'start' && key !== 'end')
      ) {
        throw new CrmAccessError('Plage horaire invalide.', 400);
      }
      const start = typeof rawRange.start === 'string' ? rawRange.start : '';
      const end = typeof rawRange.end === 'string' ? rawRange.end : '';
      if (
        !/^([01][0-9]|2[0-3]):00$/.test(start)
        || !/^([01][0-9]|2[0-4]):00$/.test(end)
        || start >= end
      ) {
        throw new CrmAccessError('Heure d’ouverture ou de fermeture invalide.', 400);
      }
      return { start, end };
    });
    normalized[day as keyof NonNullable<Center['bookingHours']>] = ranges;
  }
  return normalized;
}

function normalizeTextList(
  value: unknown,
  key: keyof EditableCenterSettings,
  limits: { items: number; itemLength: number },
): string[] {
  if (!Array.isArray(value) || value.length > limits.items) {
    throw new CrmAccessError(`Liste ${key} invalide.`, 400);
  }
  return value.map(item => {
    if (typeof item !== 'string') {
      throw new CrmAccessError(`Élément ${key} invalide.`, 400);
    }
    const text = item.trim();
    if (text.length > limits.itemLength) {
      throw new CrmAccessError(`Élément ${key} trop long.`, 400);
    }
    return text;
  });
}

function normalizeUpdates(value: unknown): Partial<EditableCenterSettings> {
  if (!isPlainObject(value)) {
    throw new CrmAccessError('Paramètres du centre invalides.', 400);
  }
  const keys = Object.keys(value) as Array<keyof EditableCenterSettings>;
  if (keys.length === 0 || keys.some(key => !ALLOWED_KEYS.has(key))) {
    throw new CrmAccessError('Paramètres du centre non autorisés.', 400);
  }

  const normalized: Partial<EditableCenterSettings> = {};
  for (const key of keys) {
    if (key === 'bookingCapacity') {
      normalized.bookingCapacity = normalizeCapacity(value[key]);
    } else if (key === 'bookingHours') {
      normalized.bookingHours = normalizeBookingHours(value[key]);
    } else if (key === 'imageUrl') {
      normalized.imageUrl = normalizePublicImageUrl(value[key]);
    } else if (key === 'email') {
      const email = normalizeText(value[key], key, TEXT_LIMITS[key]!);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new CrmAccessError('Adresse e-mail du centre invalide.', 400);
      }
      normalized.email = email;
    } else if (key in LIST_LIMITS) {
      const limits = LIST_LIMITS[key];
      if (!limits) throw new CrmAccessError('Liste du centre invalide.', 400);
      (normalized as Record<string, unknown>)[key] = normalizeTextList(
        value[key],
        key,
        limits,
      );
    } else {
      const maxLength = TEXT_LIMITS[key];
      if (!maxLength) throw new CrmAccessError('Paramètre du centre invalide.', 400);
      (normalized as Record<string, unknown>)[key] = normalizeText(
        value[key],
        key,
        maxLength,
      );
    }
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['super_admin', 'center_manager']);
    const body = await request.json().catch(() => ({})) as CenterSettingsMutation;
    const centerId = readCenterId(body.centerId);
    if (actor.role === 'center_manager' && actor.centerId !== centerId) {
      throw new CrmAccessError(
        'Vous ne pouvez modifier que les paramètres de votre centre.',
        403,
      );
    }
    const updates = normalizeUpdates(body.updates);
    const db = getAdminDb();
    const centerRef = db.collection('centers').doc(centerId);
    const centerSnapshot = await centerRef.get();
    if (!centerSnapshot.exists) {
      throw new CrmAccessError('Centre introuvable.', 404);
    }

    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(centerRef, { ...updates, updatedAt: now });
    batch.set(db.collection('audit_logs').doc(), {
      timestamp: now,
      userId: actor.uid,
      userName: actor.name,
      role: actor.role,
      action: 'UPDATE_CENTER_SETTINGS',
      details: `Mise à jour sécurisée des paramètres du centre ${centerId}.`,
      targetId: centerId,
      targetType: 'center',
      centerId,
      centerName: String(centerSnapshot.data()?.name || centerId),
    });
    await batch.commit();
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (error) {
    const resolved = getCrmErrorResponse(error);
    if (resolved.status >= 500) {
      console.error('[crm-center-settings] mutation failed:', error);
    }
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
