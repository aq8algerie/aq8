/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Appointment, Payment, Measurement, ClientPackage } from '../types';

/**
 * Gets the current date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  // Always return the standard formatted YYYY-MM-DD local date
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a number to DZD Currency (e.g. "27,000 DZD")
 */
export function formatDZD(amount: number): string {
  return `${amount.toLocaleString('fr-DZ')} DZD`;
}

/**
 * Formats ISO or T-divided DateTime string into a readable date or time
 */
export function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  return dateTimeStr.replace('T', ' à ');
}

/**
 * Compiles dashboard statistics for a center
 */
export interface CenterStats {
  clientsCount: number;
  revenue: number;
  appointmentsCount: number;
  measurementsCount: number;
}

export function compileCenterStats(
  centerId: string,
  clients: Client[],
  appointments: Appointment[],
  payments: Payment[],
  measurements: Measurement[]
): CenterStats {
  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerAppointments = appointments.filter(a => a.centerId === centerId);
  const centerPayments = payments.filter(p => p.centerId === centerId);
  
  const centerMeasurements = measurements.filter(m => {
    const matchedClient = clients.find(c => c.id === m.clientId);
    return matchedClient && matchedClient.centerId === centerId;
  });

  const revenue = centerPayments.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    clientsCount: centerClients.length,
    revenue,
    appointmentsCount: centerAppointments.length,
    measurementsCount: centerMeasurements.length
  };
}
