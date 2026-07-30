import type { Center } from '../types';
import { auth } from './firebase';

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

export async function updateCenterSettings(
  centerId: string,
  updates: Partial<EditableCenterSettings>,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Votre session CRM a expiré. Reconnectez-vous.');
  }

  const response = await fetch('/api/crm-center-settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ centerId, updates }),
  });
  const result = await response.json().catch(() => ({})) as {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || 'Mise à jour du centre impossible.');
  }
}
