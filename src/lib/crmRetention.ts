/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helper logic for proactive CRM client retention, inactivity detection,
 * and package renewal alerts.
 */

import { Client, Appointment, ClientPackage } from '../types';
import { isPackageExpired } from './packageRules';

export interface ClientRetentionStatus {
  client: Client;
  lastAppointmentDate: string | null;
  daysInactive: number;
  isInactive30Days: boolean;
  needsPackageRenewal: boolean;
  renewalReason?: 'expired' | 'low_credit' | 'no_package';
  sessionsRemaining?: number;
}

/**
 * Calculates inactivity and renewal status for a list of clients in a center.
 */
export function analyzeClientRetention(
  clients: Client[],
  appointments: Appointment[],
  clientPackages: ClientPackage[],
  centerId: string,
  now: Date = new Date()
): ClientRetentionStatus[] {
  const centerClients = clients.filter(c => c.centerId === centerId && c.status !== 'suspended' && c.status !== 'archived');
  const centerAppointments = appointments.filter(a => {
    const date = new Date(a.dateTime).getTime();
    return a.centerId === centerId && a.status === 'completed' && Number.isFinite(date) && date <= now.getTime();
  });
  const centerPackages = clientPackages.filter(cp => cp.centerId === centerId);

  return centerClients.map(client => {
    // 1. Find client's appointments (sorted newest first)
    const clientApts = centerAppointments
      .filter(a => a.clientId === client.id)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    const lastApt = clientApts[0];
    let daysInactive = 999;
    let lastAppointmentDate: string | null = null;

    if (lastApt) {
      lastAppointmentDate = lastApt.dateTime;
      const lastAptTime = new Date(lastApt.dateTime).getTime();
      if (!isNaN(lastAptTime)) {
        daysInactive = Math.floor((now.getTime() - lastAptTime) / (1000 * 60 * 60 * 24));
      }
    } else if (client.createdAt) {
      const createdTime = new Date(client.createdAt).getTime();
      if (!isNaN(createdTime)) {
        daysInactive = Math.max(0, Math.floor((now.getTime() - createdTime) / (1000 * 60 * 60 * 24)));
      }
    }

    const isInactive30Days = daysInactive >= 30;

    // 2. Check client's active package status
    const activePackages = centerPackages.filter(cp => cp.clientId === client.id && cp.status === 'active');
    const usablePackages = activePackages.filter(cp => !isPackageExpired(cp, now));
    const sessionsAvailable = usablePackages.reduce((sum, cp) => sum + cp.sessionsRemaining, 0);

    let needsPackageRenewal = false;
    let renewalReason: 'expired' | 'low_credit' | 'no_package' | undefined;
    let sessionsRemaining: number | undefined;

    if (activePackages.length === 0) {
      needsPackageRenewal = true;
      renewalReason = 'no_package';
    } else {
      sessionsRemaining = sessionsAvailable;
      const expired = usablePackages.length === 0;

      if (expired) {
        needsPackageRenewal = true;
        renewalReason = 'expired';
      } else if (sessionsAvailable <= 2) {
        needsPackageRenewal = true;
        renewalReason = 'low_credit';
      }
    }

    return {
      client,
      lastAppointmentDate,
      daysInactive,
      isInactive30Days,
      needsPackageRenewal,
      renewalReason,
      sessionsRemaining
    };
  });
}
