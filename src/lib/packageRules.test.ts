import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Appointment, Client, ClientPackage } from '../types';
import { deductSessionFromPackage, findActivePackageForClient, validateDeduction } from './packageRules';

const client: Client = {
  id: 'client-1',
  firstName: 'Amira',
  lastName: 'Cherif',
  email: 'amira@example.com',
  phone: '0550112233',
  centerId: 'center-1',
  createdAt: '2026-07-10'
};

const appointment: Appointment = {
  id: 'apt-1',
  clientId: client.id,
  serviceId: 'service-1',
  centerId: 'center-1',
  dateTime: '2026-07-12T10:00',
  duration: 20,
  status: 'booked'
};

const activePackage: ClientPackage = {
  id: 'pkg-client-1',
  clientId: client.id,
  packageId: 'pkg-1',
  centerId: 'center-1',
  sessionsRemaining: 2,
  totalSessions: 5,
  purchaseDate: '2026-07-01',
  status: 'active'
};

describe('packageRules', () => {
  it('finds an active package with remaining sessions', () => {
    assert.equal(findActivePackageForClient(client.id, [activePackage])?.id, activePackage.id);
  });

  it('rejects deduction outside the manager center', () => {
    const result = validateDeduction(appointment, client, activePackage, 'center-2');
    assert.equal(result.valid, false);
  });

  it('rejects deduction without an active package', () => {
    const result = validateDeduction(appointment, client, undefined, 'center-1');
    assert.equal(result.valid, false);
  });

  it('deducts one session and completes the package at zero', () => {
    assert.deepEqual(deductSessionFromPackage(activePackage), {
      ...activePackage,
      sessionsRemaining: 1,
      status: 'active'
    });

    assert.equal(
      deductSessionFromPackage({ ...activePackage, sessionsRemaining: 1 }).status,
      'completed'
    );
  });
});