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
  | 'customServicePrices'
  | 'customPackagePrices'
  | 'customActiveServices'
  | 'customActivePackages'
  | 'customServices'
  | 'customPackages'
  | 'services'
  | 'sessionValidationMode'
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
  'customServicePrices',
  'customPackagePrices',
  'customActiveServices',
  'customActivePackages',
  'customServices',
  'customPackages',
  'services',
  'sessionValidationMode',
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

function normalizePricesDict(value: unknown, label: string): Record<string, number> {
  if (!isPlainObject(value)) {
    throw new CrmAccessError(`Tarification ${label} invalide.`, 400);
  }
  const result: Record<string, number> = {};
  for (const [key, rawPrice] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(key)) {
      throw new CrmAccessError(`Clé ${key} invalide.`, 400);
    }
    const numPrice = Number(rawPrice);
    if (!Number.isFinite(numPrice) || numPrice < 0 || numPrice > 5000000) {
      throw new CrmAccessError(`Tarif pour ${key} invalide (doit être entre 0 et 5 000 000 DA).`, 400);
    }
    result[key] = Math.round(numPrice);
  }
  return result;
}

function normalizeStringList(value: unknown, label: string, maxItems = 50, maxLen = 120): string[] {
  if (!Array.isArray(value)) {
    throw new CrmAccessError(`Liste ${label} invalide.`, 400);
  }
  if (value.length > maxItems) {
    throw new CrmAccessError(`Trop d'éléments dans ${label}.`, 400);
  }
  return value.map(item => {
    if (typeof item !== 'string') {
      throw new CrmAccessError(`Élément invalide dans ${label}.`, 400);
    }
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > maxLen) {
      throw new CrmAccessError(`Longueur invalide dans ${label}.`, 400);
    }
    return trimmed;
  });
}

function normalizeServicesList(value: unknown): ('aq8' | 'wonder')[] {
  if (!Array.isArray(value)) {
    throw new CrmAccessError('Liste des technologies invalide.', 400);
  }
  const valid = new Set(['aq8', 'wonder']);
  for (const item of value) {
    if (typeof item !== 'string' || !valid.has(item)) {
      throw new CrmAccessError('Technologie invalide.', 400);
    }
  }
  return Array.from(new Set(value)) as ('aq8' | 'wonder')[];
}

function normalizeSessionValidationMode(value: unknown): 'auto' | 'manual' {
  if (value !== 'auto' && value !== 'manual') {
    throw new CrmAccessError('Mode de déduction des séances invalide.', 400);
  }
  return value;
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

function normalizeCustomServices(value: unknown): any[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new CrmAccessError('Liste de prestations invalide.', 400);
  }
  return value.map((srv, index) => {
    if (!isPlainObject(srv)) {
      throw new CrmAccessError(`Prestation #${index + 1} invalide.`, 400);
    }
    const id = typeof srv.id === 'string' ? srv.id.trim() : '';
    const name = typeof srv.name === 'string' ? srv.name.trim() : '';
    const type = srv.type === 'wonder' ? 'wonder' : 'aq8';
    const duration = Math.max(1, Math.min(300, Math.round(Number(srv.duration) || 0)));
    const price = Math.max(0, Math.min(1000000, Math.round(Number(srv.price) || 0)));
    const description = typeof srv.description === 'string' ? srv.description.trim().slice(0, 500) : '';

    if (!id || !name) {
      throw new CrmAccessError(`Nom ou identifiant de prestation manquant.`, 400);
    }

    return { id, name, type, duration, price, description };
  });
}

function normalizeCustomPackages(value: unknown): any[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new CrmAccessError('Liste de forfaits invalide.', 400);
  }
  return value.map((pkg, index) => {
    if (!isPlainObject(pkg)) {
      throw new CrmAccessError(`Forfait #${index + 1} invalide.`, 400);
    }
    const id = typeof pkg.id === 'string' ? pkg.id.trim() : '';
    const name = typeof pkg.name === 'string' ? pkg.name.trim() : '';
    const type = (pkg.type === 'wonder' || pkg.type === 'mix') ? pkg.type : 'aq8';
    const sessionsCount = Math.max(1, Math.min(500, Math.round(Number(pkg.sessionsCount) || 0)));
    const price = Math.max(0, Math.min(5000000, Math.round(Number(pkg.price) || 0)));
    const description = typeof pkg.description === 'string' ? pkg.description.trim().slice(0, 500) : '';
    const tag = typeof pkg.tag === 'string' ? pkg.tag.trim().slice(0, 50) : undefined;
    const aq8Sessions = pkg.aq8Sessions !== undefined ? Math.max(0, Math.min(500, Math.round(Number(pkg.aq8Sessions) || 0))) : undefined;
    const wonderSessions = pkg.wonderSessions !== undefined ? Math.max(0, Math.min(500, Math.round(Number(pkg.wonderSessions) || 0))) : undefined;
    const details = Array.isArray(pkg.details)
      ? pkg.details.filter((d: unknown) => typeof d === 'string').map((d: unknown) => (d as string).trim().slice(0, 200))
      : undefined;

    if (!id || !name) {
      throw new CrmAccessError(`Nom ou identifiant de forfait manquant.`, 400);
    }

    return {
      id,
      name,
      type,
      sessionsCount,
      price,
      description,
      tag,
      aq8Sessions,
      wonderSessions,
      details,
    };
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
    } else if (key === 'customServicePrices') {
      normalized.customServicePrices = normalizePricesDict(value[key], 'des prestations');
    } else if (key === 'customPackagePrices') {
      normalized.customPackagePrices = normalizePricesDict(value[key], 'des forfaits');
    } else if (key === 'customActiveServices') {
      normalized.customActiveServices = normalizeStringList(value[key], 'services actifs', 50, 100);
    } else if (key === 'customActivePackages') {
      normalized.customActivePackages = normalizeStringList(value[key], 'forfaits actifs', 50, 100);
    } else if (key === 'customServices') {
      normalized.customServices = normalizeCustomServices(value[key]);
    } else if (key === 'customPackages') {
      normalized.customPackages = normalizeCustomPackages(value[key]);
    } else if (key === 'services') {
      normalized.services = normalizeServicesList(value[key]);
    } else if (key === 'sessionValidationMode') {
      normalized.sessionValidationMode = normalizeSessionValidationMode(value[key]);
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
