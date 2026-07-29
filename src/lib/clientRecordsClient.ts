import { auth } from './firebase';
import type { Client, ClientStatus } from '../types';

type ClientMutation =
  | { action: 'upsert'; centerId: string; client: Partial<Client> & { id?: string } }
  | { action: 'set_status'; centerId: string; clientIds: string[]; status: ClientStatus }
  | { action: 'archive'; centerId: string; clientIds: string[] };

export async function mutateClientRecords<T = { ok: true }>(
  payload: ClientMutation,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Votre session CRM a expiré. Reconnectez-vous.');
  }

  const response = await fetch('/api/crm-clients', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as T & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || 'Mise à jour du client impossible.');
  }

  return result;
}
