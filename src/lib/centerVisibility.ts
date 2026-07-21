import { Center } from '../types';

const HIDDEN_PUBLIC_STATUSES = new Set(['suspended', 'maintenance', 'construction']);

export function normalizeCenterStatus(status?: string): string {
  return (status || 'active').trim().toLowerCase();
}

export function isCenterSuspended(center: Center): boolean {
  return normalizeCenterStatus(center.status) === 'suspended';
}

export function isCenterPubliclyVisible(center: Center): boolean {
  return !HIDDEN_PUBLIC_STATUSES.has(normalizeCenterStatus(center.status));
}

export function getPublicCenters(centers: Center[]): Center[] {
  return centers.filter(isCenterPubliclyVisible);
}

export function getCenterOperationalStatus(center: Center): 'active' | 'suspended' | 'maintenance' | 'construction' {
  const status = normalizeCenterStatus(center.status);
  if (status === 'suspended' || status === 'maintenance' || status === 'construction') return status;
  return 'active';
}

export function getCenterStatusLabel(center: Center): string {
  const status = normalizeCenterStatus(center.status);
  if (status === 'suspended') return 'Suspendu';
  if (status === 'showcase') return 'Vitrine uniquement';
  if (status === 'maintenance') return 'En maintenance';
  if (status === 'construction') return 'En construction';
  if (status === 'active') return 'Operationnel';
  return center.status || 'Operationnel';
}

export function getPublicCenterBadgeLabel(center: Center): string {
  const status = normalizeCenterStatus(center.status);
  if (status === 'active' || status === 'suspended' || status === 'maintenance' || status === 'construction') return '';
  return center.status || '';
}
