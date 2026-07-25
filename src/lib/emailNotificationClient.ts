import { auth } from './firebase';
import type { CrmEmailNotificationPayload } from './serverEmailNotifications';

export type CrmEmailNotificationResult = {
  sent: boolean;
  skipped?: string;
  error?: string;
};

type CrmEmailNotificationResponse = {
  ok: boolean;
  result?: CrmEmailNotificationResult;
  error?: string;
};

export async function notifyCrmEmail(payload: CrmEmailNotificationPayload): Promise<CrmEmailNotificationResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur CRM non authentifié pour envoyer la notification email.');
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/email-notifications/crm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null) as CrmEmailNotificationResponse | null;
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || `Notification email refusée (${response.status}).`);
  }

  return body?.result || { sent: true };
}

export function notifyCrmEmailBestEffort(payload: CrmEmailNotificationPayload): void {
  void notifyCrmEmail(payload).catch(error => {
    console.warn('[email] Notification CRM non envoyée:', error);
  });
}
