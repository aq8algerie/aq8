import assert from 'node:assert/strict';
import { Appointment, Center, Client, ClientPackage, Package, Payment, Service } from '../types';
import { isBeforePreviousDayCutoff, isFullHour, validateAppointment } from './appointmentRules';
import { getBookingHoursForDate, getCenterBookingCapacity } from './bookingCapacityRules';
import {
  deductSessionFromPackage,
  findActivePackageForClient,
  findActivePackageForClientAndService,
  validateDeduction,
  validateSessionCompletion,
} from './packageRules';
import {
  isSameClientPackageActivation,
  isSamePaymentOperation,
  validatePackageActivation,
  validatePaymentRegistration,
} from './paymentRules';
import { getBookingMinimumDate, validatePublicBookingRequest, validatePublicContactMessage } from './publicFormValidation';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const services: Service[] = [
  {
    id: 'service-1',
    name: 'AQ8 EMS',
    type: 'aq8',
    duration: 20,
    price: 3500,
    description: 'EMS'
  },
  {
    id: 'service-2',
    name: 'Wonder',
    type: 'wonder',
    duration: 25,
    price: 4500,
    description: 'Wonder'
  }
];

const packageDefinitions: Package[] = [
  {
    id: 'pkg-1',
    name: 'AQ8 Vitalité',
    type: 'aq8',
    sessionsCount: 5,
    price: 15000,
    description: 'Forfait AQ8',
  },
  {
    id: 'pkg-wonder',
    name: 'Wonder Intensity',
    type: 'wonder',
    sessionsCount: 5,
    price: 18000,
    description: 'Forfait Wonder',
  },
];

const paymentCenter: Center = {
  id: 'center-1',
  name: 'AQ8 Test',
  city: 'Alger',
  address: 'Adresse test',
  phone: '0550000000',
  email: 'center@example.com',
  imageUrl: '',
  services: ['aq8', 'wonder'],
  schedule: '08:00 - 18:00',
  description: 'Centre de test',
  status: 'active',
  customActivePackages: ['pkg-1', 'pkg-wonder'],
};

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
    'center-2',
    services
  );
  assert.equal(result.valid, false);
});

test('appointment validation accepts shared AQ8 slots under center capacity', () => {
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

test('appointment validation rejects slots once AQ8 capacity is reached', () => {
  const fullSlot = [
    ...existingAppointments,
    { ...existingAppointments[0], id: 'apt-existing-2' },
    { ...existingAppointments[0], id: 'apt-existing-3' }
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

test('appointment validation honors flexible center capacity and hours', () => {
  const flexibleCenter = {
    bookingCapacity: { aq8: 2, wonder: 1 },
    bookingHours: {
      '0': [{ start: '08:00', end: '10:00' }]
    }
  };

  assert.deepEqual(getCenterBookingCapacity('center-flex', flexibleCenter), { aq8: 2, wonder: 1 });
  assert.deepEqual(getBookingHoursForDate('center-flex', '2026-07-12', flexibleCenter), ['08:00', '09:00']);

  const oneAq8Booking: Appointment[] = [
    { ...existingAppointments[0], id: 'apt-flex-1', centerId: 'center-flex', dateTime: '2026-07-12T08:00' }
  ];

  const available = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-flex',
      dateTime: '2026-07-12T08:00',
      duration: 20
    },
    oneAq8Booking,
    'center-flex',
    services,
    undefined,
    flexibleCenter
  );
  assert.equal(available.valid, true);

  const fullAq8Slot: Appointment[] = [
    ...oneAq8Booking,
    { ...oneAq8Booking[0], id: 'apt-flex-2' }
  ];

  const saturated = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-flex',
      dateTime: '2026-07-12T08:00',
      duration: 20
    },
    fullAq8Slot,
    'center-flex',
    services,
    undefined,
    flexibleCenter
  );
  assert.equal(saturated.valid, false);

  const closed = validateAppointment(
    {
      clientId: 'client-1',
      serviceId: 'service-1',
      centerId: 'center-flex',
      dateTime: '2026-07-12T10:00',
      duration: 20
    },
    [],
    'center-flex',
    services,
    undefined,
    flexibleCenter
  );
  assert.equal(closed.valid, false);
});
test('appointment validation accepts valid full-hour open slots', () => {
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

test('session completion selects a package compatible with the booked technology', () => {
  const wonderClientPackage: ClientPackage = {
    ...activePackage,
    id: 'pkg-client-wonder',
    packageId: 'pkg-wonder',
    purchaseDate: '2026-07-02',
  };

  const selected = findActivePackageForClientAndService(
    client.id,
    services[1],
    [activePackage, wonderClientPackage],
    packageDefinitions
  );

  assert.equal(selected?.id, wonderClientPackage.id);
});

test('session completion accepts a valid center, client, service and package', () => {
  const result = validateSessionCompletion({
    appointment,
    client,
    clientPackage: activePackage,
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });

  assert.equal(result.valid, true);
});

test('session completion blocks a second validation of the same appointment', () => {
  const result = validateSessionCompletion({
    appointment: { ...appointment, status: 'completed' },
    client,
    clientPackage: activePackage,
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });

  assert.equal(result.valid, false);
});

test('session completion blocks insufficient credit and cross-center use', () => {
  const noCredit = validateSessionCompletion({
    appointment,
    client,
    clientPackage: { ...activePackage, sessionsRemaining: 0 },
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });
  const wrongCenter = validateSessionCompletion({
    appointment,
    client,
    clientPackage: activePackage,
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-2',
  });

  assert.equal(noCredit.valid, false);
  assert.equal(wrongCenter.valid, false);
});

test('session completion blocks a package from another technology', () => {
  const result = validateSessionCompletion({
    appointment: { ...appointment, serviceId: services[1].id },
    client,
    clientPackage: activePackage,
    service: services[1],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });

  assert.equal(result.valid, false);
});

test('session completion blocks expired packages and suspended clients', () => {
  const expiredPackage = validateSessionCompletion({
    appointment,
    client,
    clientPackage: { ...activePackage, purchaseDate: '2020-01-01' },
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });
  const suspendedClient = validateSessionCompletion({
    appointment,
    client: { ...client, status: 'suspended' },
    clientPackage: activePackage,
    service: services[0],
    packageDefinition: packageDefinitions[0],
    managerCenterId: 'center-1',
  });

  assert.equal(expiredPackage.valid, false);
  assert.equal(suspendedClient.valid, false);
});

test('payment registration accepts a valid payment and package activation', () => {
  const result = validatePaymentRegistration({
    center: paymentCenter,
    client,
    packageDefinition: packageDefinitions[0],
    centerId: 'center-1',
    amount: 15000,
    method: 'cash',
    receiptNumber: 'REC-TEST-001',
    autoActivatePackage: true,
  });

  assert.equal(result.valid, true);
});

test('payment registration blocks invalid amount, suspended clients and inactive packages', () => {
  const invalidAmount = validatePaymentRegistration({
    center: paymentCenter,
    client,
    packageDefinition: packageDefinitions[0],
    centerId: 'center-1',
    amount: 0,
    method: 'cash',
    receiptNumber: 'REC-TEST-002',
    autoActivatePackage: true,
  });
  const suspendedClient = validatePaymentRegistration({
    center: paymentCenter,
    client: { ...client, status: 'suspended' },
    packageDefinition: packageDefinitions[0],
    centerId: 'center-1',
    amount: 15000,
    method: 'cash',
    receiptNumber: 'REC-TEST-003',
    autoActivatePackage: true,
  });
  const inactivePackage = validatePaymentRegistration({
    center: { ...paymentCenter, customActivePackages: [] },
    client,
    packageDefinition: packageDefinitions[0],
    centerId: 'center-1',
    amount: 15000,
    method: 'cash',
    receiptNumber: 'REC-TEST-004',
    autoActivatePackage: true,
  });

  assert.equal(invalidAmount.valid, false);
  assert.equal(suspendedClient.valid, false);
  assert.equal(inactivePackage.valid, false);
});

test('payment idempotency accepts only an identical repeated operation', () => {
  const payment: Payment = {
    id: 'pay-operation-1',
    clientId: client.id,
    packageId: packageDefinitions[0].id,
    centerId: paymentCenter.id,
    amount: 15000,
    date: '2026-07-25',
    method: 'cash',
    receiptNumber: 'REC-TEST-005',
    clientPackageId: 'clipkg-operation-1',
  };

  assert.equal(isSamePaymentOperation(payment, { ...payment }), true);
  assert.equal(isSamePaymentOperation(payment, { ...payment, amount: 14000 }), false);
  assert.equal(isSamePaymentOperation(payment, { ...payment, date: '2026-07-26' }), false);
  assert.equal(isSamePaymentOperation(payment, { ...payment, clientPackageId: undefined }), false);
});

test('direct package activation validates scope and remains idempotent', () => {
  const validation = validatePackageActivation({
    center: paymentCenter,
    client,
    packageDefinition: packageDefinitions[0],
    centerId: paymentCenter.id,
  });
  const activation: ClientPackage = {
    id: 'clipkg-operation-2',
    clientId: client.id,
    packageId: packageDefinitions[0].id,
    centerId: paymentCenter.id,
    sessionsRemaining: 5,
    totalSessions: 5,
    purchaseDate: '2026-07-25',
    status: 'active',
  };

  assert.equal(validation.valid, true);
  assert.equal(isSameClientPackageActivation(activation, { ...activation }), true);
  assert.equal(isSameClientPackageActivation(activation, { ...activation, clientId: 'client-2' }), false);
  assert.equal(isSameClientPackageActivation(activation, { ...activation, sourcePaymentId: 'pay-other' }), false);
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

test('public booking validation rejects unsupported, stale and closed slots', () => {
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

  const closedSlot = validatePublicBookingRequest(
    {
      centerId: 'center-1',
      centerName: 'AQ8 Alger',
      firstName: 'Amira',
      lastName: 'Cherif',
      phone: '0550112233',
      email: '',
      service: 'aq8',
      bookingDate: '2026-07-13',
      bookingTime: '10:00'
    },
    ['aq8'],
    new Date('2026-07-11T12:00:00')
  );

  assert.equal(stale.valid, false);
  assert.equal(unsupportedSlot.valid, false);
  assert.equal(closedSlot.valid, false);
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