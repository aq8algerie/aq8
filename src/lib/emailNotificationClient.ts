import { auth } from './firebase';
import type { CrmEmailNotificationPayload } from './serverEmailNotifications';

async function postCrmEmailNotification(payload: CrmEmailNotificationPayload): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.info('[email] Notification ignoree: utilisateur CRM non authentifie.');
    return;
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

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || `Notification email refusee (${response.status}).`);
  }
}

export function notifyCrmEmailBestEffort(payload: CrmEmailNotificationPayload): void {
  void postCrmEmailNotification(payload).catch(error => {
    console.warn('[email] Notification CRM non envoyee:', error);
  });
}
