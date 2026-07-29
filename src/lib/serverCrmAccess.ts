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

  return {
    uid: token.uid,
    email: String(token.email || data.email || '').trim().toLowerCase(),
    name: String(data.displayName || data.name || token.name || token.email || token.uid),
    role,
    centerId: typeof data.centerId === 'string' ? data.centerId : null,
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
    message: error instanceof Error ? error.message : 'Erreur CRM inattendue.',
  };
}
