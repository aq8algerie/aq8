import type { Appointment, Client, ClientPackage, Payment } from '../types';
import { isPackageExpired } from './packageRules';
import { isHistoricalRecord } from './legacyHistory';
import { matchesCrmSearch } from './crmSearch';

export type BalanceCategory = 'none' | 'available' | 'low' | 'expired' | 'closed' | 'suspended';
export type BalanceFilter = 'with_package' | 'all' | 'available' | 'low' | 'expired' | 'closed' | 'none' | 'suspended';
export type BalanceSort = 'alpha_asc' | 'alpha_desc' | 'balance_desc' | 'balance_asc' | 'spent_desc';
const quantity = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
export const netReceipts = (payments: Payment[]) => payments.filter(p => !isHistoricalRecord(p))
  .reduce((total, p) => total + (Number.isFinite(p.amount) ? p.amount : 0), 0);

export function packageStatusLabel(pkg: ClientPackage, now: Date) {
  if (pkg.status === 'cancelled') return 'Annulé';
  if (pkg.status === 'completed') return 'Terminé';
  if (isPackageExpired(pkg, now)) return 'Expiré';
  return pkg.sessionsRemaining > 0 ? 'En cours' : 'Épuisé';
}

export function buildClientBalances(input: {
  centerId: string; clients: Client[]; clientPackages: ClientPackage[];
  payments: Payment[]; appointments: Appointment[]; now: Date;
}) {
  const { centerId, now } = input;
  const packages = input.clientPackages.filter(p => p.centerId === centerId && !isHistoricalRecord(p));
  const payments = input.payments.filter(p => p.centerId === centerId && !isHistoricalRecord(p));
  const appointments = input.appointments.filter(a => a.centerId === centerId && !isHistoricalRecord(a));
  return input.clients.filter(c => c.centerId === centerId && c.status !== 'archived').map(client => {
    const pkgs = packages.filter(p => p.clientId === client.id).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    const usable = pkgs.filter(p => p.status === 'active' && p.sessionsRemaining > 0 && !isPackageExpired(p, now));
    const clientActive = !client.status || client.status === 'active';
    const activePkgs = clientActive ? usable : [];
    const totalRemaining = activePkgs.reduce((sum, p) => sum + quantity(p.sessionsRemaining), 0);
    const nonUsableRemaining = pkgs.filter(p => p.status !== 'cancelled' && !activePkgs.includes(p))
      .reduce((sum, p) => sum + quantity(p.sessionsRemaining), 0);
    const pays = payments.filter(p => p.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));
    let statusCategory: BalanceCategory = 'none';
    if (pkgs.length) {
      if (totalRemaining > 2) statusCategory = 'available';
      else if (totalRemaining > 0) statusCategory = 'low';
      else if (!clientActive && usable.length) statusCategory = 'suspended';
      else if (pkgs.some(p => p.status !== 'cancelled' && quantity(p.sessionsRemaining) > 0 && isPackageExpired(p, now))) statusCategory = 'expired';
      else statusCategory = 'closed';
    }
    return { client, pkgs, activePkgs, activePkg: activePkgs[0], pkgsCount: pkgs.length,
      totalRemaining, nonUsableRemaining, statusCategory,
      // The purchased snapshot is authoritative; today's catalog may have different quantities.
      totalAcquired: pkgs.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + quantity(p.totalSessions), 0),
      completedApts: appointments.filter(a => a.clientId === client.id && a.status === 'completed').length,
      totalSpent: netReceipts(pays), hasPayments: pays.length > 0, lastPaymentDate: pays[0]?.date || null,
    };
  });
}
export type ClientBalanceRow = ReturnType<typeof buildClientBalances>[number];
export const balanceLabels: Record<BalanceCategory, string> = {
  none: 'Aucun forfait CRM enregistré', available: 'Crédits disponibles', low: 'À renouveler · 1 à 2 crédits',
  expired: 'Forfait expiré', closed: 'Forfaits terminés ou annulés', suspended: 'Client suspendu',
};
export function matchesBalanceFilter(row: ClientBalanceRow, filter: BalanceFilter) {
  if (filter === 'all') return true;
  if (filter === 'with_package') return row.pkgsCount > 0;
  if (filter === 'available') return row.totalRemaining > 0;
  return row.statusCategory === filter;
}
export function filterClientBalances(rows: ClientBalanceRow[], filter: BalanceFilter, search: string, sort: BalanceSort) {
  return rows.filter(row => {
    return matchesBalanceFilter(row, filter) && matchesCrmSearch(search, [row.client.firstName, row.client.lastName], row.client.phone || '');
  }).sort((a, b) => {
    const name = `${a.client.firstName} ${a.client.lastName}`.localeCompare(`${b.client.firstName} ${b.client.lastName}`, 'fr', { sensitivity: 'base' });
    if (sort === 'balance_desc') return b.totalRemaining - a.totalRemaining || name;
    if (sort === 'balance_asc') return a.totalRemaining - b.totalRemaining || name;
    if (sort === 'spent_desc') return b.totalSpent - a.totalSpent || name;
    return sort === 'alpha_desc' ? -name : name;
  });
}
