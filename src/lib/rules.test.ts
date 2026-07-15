import assert from 'node:assert/strict';
import { Appointment, Client, ClientPackage } from '../types';
import { isBeforePreviousDayCutoff, isFullHour, validateAppointment } from './appointmentRules';
import { deductSessionFromPackage, findActivePackageForClient, validateDeduction } from './packageRules';
import { getBookingMinimumDate, validatePublicBookingRequest, validatePublicContactMessage } from './publicFormValidation';

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


test('public booking validation normalizes and accepts valid requests', () => {
  const result = validatePublicBookingRequest(
    {
      centerId: 'center-1',
      centerName: 'AQ8 Alger',
      firstName: '  Amira  ',
      lastName: 'Cherif',
      phone: '0550112233',
      email: 'AMIRA@EXAMPLE.COM',
      service: 'aq8',
      bookingDate: '2026-07-12',
      bookingTime: '10:00'
    },
    ['aq8'],
    new Date('2026-07-11T12:00:00')
  );

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.data.firstName, 'Amira');
    assert.equal(result.data.email, 'amira@example.com');
  }
});

test('public booking validation rejects unsupported slots and stale dates', () => {
  const stale = validatePublicBookingRequest(
    {
      centerId: 'center-1',
      centerName: 'AQ8 Alger',
      firstName: 'Amira',
      lastName: 'Cherif',
      phone: '0550112233',
      email: '',
      service: 'aq8',
      bookingDate: '2026-07-11',
      bookingTime: '10:00'
    },
    ['aq8'],
    new Date('2026-07-11T12:00:00')
  );

  const unsupportedSlot = validatePublicBookingRequest(
    {
      centerId: 'center-1',
      centerName: 'AQ8 Alger',
      firstName: 'Amira',
      lastName: 'Cherif',
      phone: '0550112233',
      email: '',
      service: 'aq8',
      bookingDate: '2026-07-12',
      bookingTime: '10:30'
    },
    ['aq8'],
    new Date('2026-07-11T12:00:00')
  );

  assert.equal(stale.valid, false);
  assert.equal(unsupportedSlot.valid, false);
});

test('booking minimum date moves after the 21:30 cutoff', () => {
  assert.equal(getBookingMinimumDate(new Date('2026-07-11T21:29:00')), '2026-07-12');
  assert.equal(getBookingMinimumDate(new Date('2026-07-11T21:30:00')), '2026-07-13');
});

test('public contact validation rejects invalid center and long messages', () => {
  const invalidCenter = validatePublicContactMessage(
    {
      name: 'Yacine',
      phone: '0660112233',
      email: '',
      requestType: 'general',
      centerId: 'unknown-center',
      message: 'Bonjour'
    },
    ['center-1']
  );

  const longMessage = validatePublicContactMessage(
    {
      name: 'Yacine',
      phone: '0660112233',
      email: '',
      requestType: 'general',
      centerId: 'center-1',
      message: 'x'.repeat(2001)
    },
    ['center-1']
  );

  assert.equal(invalidCenter.valid, false);
  assert.equal(longMessage.valid, false);
});

console.log('All business-rule tests passed.');