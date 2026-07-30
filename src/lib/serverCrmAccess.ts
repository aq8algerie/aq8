import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuthInstance, getAdminDb } from './serverFirebaseAdmin';

export type ServerCrmRole = 'super_admin' | 'center_manager';

export type ServerCrmProfile = {
  uid: string;
  email: string;
  name: string;
  role: ServerCrmRole;
  centerId: string | null;
  active: true;
  token: DecodedIdToken;
};

const BLOCKED_CENTER_STATUSES = new Set(['suspended', 'showcase', 'inactive', 'archived']);

export function isOperationalCrmCenterStatus(status: unknown): boolean {
  return !BLOCKED_CENTER_STATUSES.has(String(status || '').trim().toLowerCase());
}

export class CrmAccessError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'CrmAccessError';
  }
}

function readBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new CrmAccessError('Authentification CRM requise.', 401);
  }
  return match[1];
}

export async function verifyServerCrmAccess(
  request: Request,
  allowedRoles: ServerCrmRole[],
): Promise<ServerCrmProfile> {
  let token: DecodedIdToken;
  try {
    token = await getAdminAuthInstance().verifyIdToken(readBearerToken(request), true);
  } catch (error) {
    if (error instanceof CrmAccessError) throw error;
    throw new CrmAccessError('Session CRM invalide ou révoquée.', 401);
  }

  const profileSnapshot = await getAdminDb().collection('users').doc(token.uid).get();
  if (!profileSnapshot.exists) {
    throw new CrmAccessError('Profil CRM introuvable.', 403);
  }

  const data = profileSnapshot.data() || {};
  const role = data.role as ServerCrmRole;
  if (data.active !== true || !allowedRoles.includes(role)) {
    throw new CrmAccessError('Profil CRM non autorisé.', 403);
  }

  const centerId = typeof data.centerId === 'string' && data.centerId.trim()
    ? data.centerId.trim()
    : null;
  if (role === 'center_manager') {
    if (!centerId) {
      throw new CrmAccessError('Aucun centre actif n’est rattaché à ce compte manager.', 403);
    }
    const centerSnapshot = await getAdminDb().collection('centers').doc(centerId).get();
    if (!centerSnapshot.exists || !isOperationalCrmCenterStatus(centerSnapshot.data()?.status)) {
      throw new CrmAccessError('L’accès CRM de ce centre est suspendu.', 403);
    }
  }

  return {
    uid: token.uid,
    email: String(token.email || data.email || '').trim().toLowerCase(),
    name: String(data.displayName || data.name || token.name || token.email || token.uid),
    role,
    centerId,
    active: true,
    token,
  };
}

export function getCrmErrorResponse(error: unknown): { status: number; message: string } {
  if (error instanceof CrmAccessError) {
    return { status: error.statusCode, message: error.message };
  }
  return {
    status: 500,
    message: 'Erreur CRM inattendue.',
  };
}
