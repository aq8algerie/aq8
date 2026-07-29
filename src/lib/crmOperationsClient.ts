import { auth } from './firebase';

export type CrmOperationAction =
  | 'complete_appointment'
  | 'assign_package'
  | 'record_payment'
  | 'reverse_payment';

type CrmOperationPayload = {
  action: CrmOperationAction;
  centerId: string;
  [key: string]: unknown;
};

export async function runCrmOperation<T>(
  payload: CrmOperationPayload,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Votre session CRM a expiré. Reconnectez-vous.');
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/crm-operations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as {
    ok?: boolean;
    error?: string;
  } & T;

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Opération CRM impossible.');
  }

  return result;
}
