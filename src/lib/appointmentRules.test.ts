import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Appointment, Service } from '../types';
import { isBeforePreviousDayCutoff, isFullHour, validateAppointment } from './appointmentRules';

const services: Service[] = [
  { id: 'service-1', name: 'AQ8 EMS', type: 'aq8', duration: 20, price: 3500, description: 'EMS' },
  { id: 'service-2', name: 'Wonder', type: 'wonder', duration: 25, price: 4500, description: 'Wonder' },
];

const existingAppointments: Appointment[] = [
  {
    id: 'apt-existing',
    clientId: 'client-1',
    serviceId: 'service-1',
    centerId: 'center-1',
    dateTime: '2026-07-12T10:00',
    duration: 20,
    status: 'booked'
  }
];

describe('appointmentRules', () => {
  it('accepts full-hour slots and rejects partial-hour slots', () => {
    assert.equal(isFullHour('09:00'), true);
    assert.equal(isFullHour('09:30'), false);
    assert.equal(isFullHour(''), false);
  });

  it('enforces the previous-day 21:30 booking cutoff', () => {
    assert.equal(
      isBeforePreviousDayCutoff('2026-07-12T10:00', new Date('2026-07-11T21:29:00')),
      true
    );
    assert.equal(
      isBeforePreviousDayCutoff('2026-07-12T10:00', new Date('2026-07-11T21:31:00')),
      false
    );
  });

  it('rejects appointments for clients attached to another center', () => {
    const result = validateAppointment(
      {
        clientId: 'client-1',
        serviceId: 'service-1',
        centerId: 'center-1',
        dateTime: '2026-07-12T11:00',
        duration: 20
      },
      existingAppointments,
      'center-2',
      services
    );

    assert.equal(result.valid, false);
  });

  it('accepts shared active AQ8 slots under center capacity', () => {
    const result = validateAppointment(
      {
        clientId: 'client-1',
        serviceId: 'service-1',
        centerId: 'center-1',
        dateTime: '2026-07-12T10:00',
        duration: 20
      },
      existingAppointments,
      'center-1',
      services
    );

    assert.equal(result.valid, true);
  });

  it('rejects active AQ8 slots once center capacity is reached', () => {
    const fullSlot = [
      ...existingAppointments,
      { ...existingAppointments[0], id: 'apt-existing-2' },
      { ...existingAppointments[0], id: 'apt-existing-3' },
    ];

    const result = validateAppointment(
      {
        clientId: 'client-1',
        serviceId: 'service-1',
        centerId: 'center-1',
        dateTime: '2026-07-12T10:00',
        duration: 20
      },
      fullSlot,
      'center-1',
      services
    );

    assert.equal(result.valid, false);
  });

  it('accepts a valid full-hour appointment in the client center', () => {
    const result = validateAppointment(
      {
        clientId: 'client-1',
        serviceId: 'service-1',
        centerId: 'center-1',
        dateTime: '2026-07-12T11:00',
        duration: 20
      },
      existingAppointments,
      'center-1',
      services
    );

    assert.equal(result.valid, true);
  });
});