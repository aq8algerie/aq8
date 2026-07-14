import assert from 'node:assert/strict';
import { Appointment, Client, ClientPackage } from '../types';
import { isBeforePreviousDayCutoff, isFullHour, validateAppointment } from './appointmentRules';
import { deductSessionFromPackage, findActivePackageForClient, validateDeduction } from './packageRules';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

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

test('appointment slots must be full-hour', () => {
  assert.equal(isFullHour('09:00'), true);
  assert.equal(isFullHour('09:30'), false);
  assert.equal(isFullHour(''), false);
});

test('appointment cutoff is previous day at 21:30', () => {
  assert.equal(isBeforePreviousDayCutoff('2026-07-12T10:00', new Date('2026-07-11T21:29:00')), true);
  assert.equal(isBeforePreviousDayCutoff('2026-07-12T10:00', new Date('2026-07-11T21:31:00')), false);
});

test('appointment validation rejects clients from another center', () => {
  const result = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-1',
      dateTime: '2026-07-12T11:00',
      duration: 20
    },
    existingAppointments,
    'center-2'
  );
  assert.equal(result.valid, false);
});

test('appointment validation rejects duplicate active slots', () => {
  const result = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-1',
      dateTime: '2026-07-12T10:00',
      duration: 20
    },
    existingAppointments,
    'center-1'
  );
  assert.equal(result.valid, false);
});

test('appointment validation accepts valid full-hour slots', () => {
  const result = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-1',
      dateTime: '2026-07-12T11:00',
      duration: 20
    },
    existingAppointments,
    'center-1'
  );
  assert.equal(result.valid, true);
});

test('package lookup finds an active package with remaining sessions', () => {
  assert.equal(findActivePackageForClient(client.id, [activePackage])?.id, activePackage.id);
});

test('package deduction rejects appointments outside the manager center', () => {
  assert.equal(validateDeduction(appointment, client, activePackage, 'center-2').valid, false);
});

test('package deduction rejects missing active packages', () => {
  assert.equal(validateDeduction(appointment, client, undefined, 'center-1').valid, false);
});

test('package deduction decrements sessions and completes at zero', () => {
  assert.deepEqual(deductSessionFromPackage(activePackage), {
    ...activePackage,
    sessionsRemaining: 1,
    status: 'active'
  });
  assert.equal(deductSessionFromPackage({ ...activePackage, sessionsRemaining: 1 }).status, 'completed');
});

console.log('All business-rule tests passed.');