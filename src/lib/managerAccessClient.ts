import { auth } from './firebase';
import type { CenterManager } from '../types';

type ManagerAccessAction =
  | {
      action: 'upsert';
      managerId?: string;
      name: string;
      email: string;
      centerId: string;
      active: boolean;
    }
  | {
      action: 'set_active';
      managerId: string;
      active: boolean;
    }
  | {
      action: 'archive';
      managerId: string;
    };

type ManagerAccessResponse = {
  ok: boolean;
  manager?: CenterManager;
  error?: string;
};

export async function mutateManagerAccess(payload: ManagerAccessAction): Promise<CenterManager | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Session super administrateur introuvable.');
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/crm-managers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null) as ManagerAccessResponse | null;

  if (!response.ok || body?.ok !== true) {
    throw new Error(body?.error || `Gestion des accès refusée (${response.status}).`);
  }

  return body.manager || null;
}
