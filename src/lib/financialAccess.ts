// Keep the centre-specific policy aligned with canReadFinances in firestore.rules.
export const RESTRICTED_FINANCE_CENTER_ID = 'center-5';
export const FINANCE_OWNER_EMAIL = 'contact@sculptfitcenter.com';

export function canReadCenterFinances(input: {
  role?: string | null;
  centerId?: string | null;
  email?: string | null;
  active?: boolean;
}): boolean {
  if (input.active !== true) return false;
  if (input.role === 'super_admin') return true;
  if (input.role !== 'center_manager' || !input.centerId) return false;
  return input.centerId !== RESTRICTED_FINANCE_CENTER_ID || input.email === FINANCE_OWNER_EMAIL;
}
