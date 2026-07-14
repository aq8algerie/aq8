/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Appointment, Client, ClientPackage, Package, Service } from '../../../types';
import { findActivePackageForClient } from '../../../lib/packageRules';

export const getCenterScheduleData = (
  centerId: string,
  clients: Client[],
  appointments: Appointment[],
) => ({
  centerClients: clients.filter(client => client.centerId === centerId),
  centerAppointments: appointments.filter(appointment => appointment.centerId === centerId),
});

export const getFilteredScheduleAppointments = (
  centerAppointments: Appointment[],
  centerClients: Client[],
  services: Service[],
  searchTerm: string,
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return centerAppointments;
  }

  return centerAppointments.filter(appointment => {
    const client = centerClients.find(candidate => candidate.id === appointment.clientId);
    const service = services.find(candidate => candidate.id === appointment.serviceId);
    const fullName = client ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.toLowerCase() : '';
    const phone = String(client?.phone ?? '').toLowerCase();
    const serviceName = String(service?.name ?? '').toLowerCase();

    return (
      fullName.includes(normalizedSearch) ||
      phone.includes(normalizedSearch) ||
      serviceName.includes(normalizedSearch)
    );
  });
};

export const getTechnologyForClient = (
  clientId: string,
  clientPackages: ClientPackage[],
  packages: Package[],
) => {
  const activePackage = findActivePackageForClient(clientId, clientPackages);
  if (!activePackage) {
    return null;
  }

  const packageDefinition = packages.find(candidate => candidate.id === activePackage.packageId);
  return packageDefinition ? packageDefinition.type : null;
};

export const getAppointmentsForDayAndHour = (
  appointmentsToRender: Appointment[],
  dateStr: string,
  hourStr: string,
) => appointmentsToRender.filter(appointment => {
  if (!appointment.dateTime.startsWith(dateStr)) {
    return false;
  }

  const appointmentTime = appointment.dateTime.split('T')[1];
  if (!appointmentTime) {
    return false;
  }

  return appointmentTime.split(':')[0] === hourStr.split(':')[0];
});
