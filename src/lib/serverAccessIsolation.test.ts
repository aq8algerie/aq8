import assert from 'node:assert/strict';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
} from 'firebase/auth';

const PROJECT_ID = 'demo-aq8-security';
const FIRESTORE_HOST = '127.0.0.1:8085';
const AUTH_HOST = '127.0.0.1:9099';
const AUTH_URL = `http://${AUTH_HOST}`;

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST;
process.env.FIREBASE_ADMIN_PROJECT_ID = PROJECT_ID;
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';

type TestIdentity = {
  uid: string;
  token: string;
};

async function createIdentity(
  auth: ReturnType<typeof getAuth>,
  email: string,
): Promise<TestIdentity> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    'Security-Test-Password-2026!',
  );
  return {
    uid: credential.user.uid,
    token: await credential.user.getIdToken(),
  };
}

function authenticatedRequest(token: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/crm-clients', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
}

async function testCase(name: string, run: () => Promise<void>) {
  await run();
  console.log(`ok - ${name}`);
}

async function run() {
  const clientApp = initializeClientApp({
    apiKey: 'security-emulator-key',
    authDomain: 'localhost',
    projectId: PROJECT_ID,
  }, 'aq8-server-security');
  const auth = getAuth(clientApp);
  connectAuthEmulator(auth, AUTH_URL, { disableWarnings: true });

  const {
    CrmAccessError,
    verifyServerCrmAccess,
  } = await import('./serverCrmAccess');
  const { getAdminDb } = await import('./serverFirebaseAdmin');
  const { POST: mutateClients } = await import('../../app/api/crm-clients/route');
  const { POST: mutateCenterSettings } = await import('../../app/api/crm-center-settings/route');
  const { POST: createPublicReservation } = await import('../../app/api/public-reservations/route');

  try {
    const managerA = await createIdentity(auth, 'manager-a@security.test');
    const managerSuspended = await createIdentity(auth, 'manager-suspended@security.test');
    const managerWithoutCenter = await createIdentity(auth, 'manager-orphan@security.test');
    const inactiveManager = await createIdentity(auth, 'manager-inactive@security.test');
    const superAdmin = await createIdentity(auth, 'super-admin@security.test');

    const db = getAdminDb();
    const batch = db.batch();
    batch.set(db.collection('centers').doc('center-a'), {
      id: 'center-a',
      name: 'Centre A',
      city: 'Alger',
      address: 'Adresse Centre A',
      phone: '0550000000',
      email: 'center-a@example.com',
      imageUrl: '',
      services: ['aq8'],
      schedule: '08:00 - 18:00',
      description: 'Centre de test',
      status: 'active',
      bookingCapacity: { aq8: 2, wonder: 1 },
      bookingHours: {
        '0': [{ start: '08:00', end: '18:00' }],
        '1': [{ start: '08:00', end: '18:00' }],
        '2': [{ start: '08:00', end: '18:00' }],
        '3': [{ start: '08:00', end: '18:00' }],
        '4': [{ start: '08:00', end: '18:00' }],
        '5': [{ start: '08:00', end: '18:00' }],
        '6': [{ start: '08:00', end: '18:00' }],
      },
    });
    batch.set(db.collection('centers').doc('center-b'), {
      id: 'center-b',
      name: 'Centre B',
      status: 'active',
    });
    batch.set(db.collection('centers').doc('center-suspended'), {
      id: 'center-suspended',
      name: 'Centre suspendu',
      status: 'suspended',
    });
    batch.set(db.collection('services').doc('service-aq8'), {
      id: 'service-aq8',
      name: 'AQ8',
      type: 'aq8',
      duration: 20,
      price: 3000,
      description: 'Service de test',
    });
    batch.set(db.collection('clients').doc('privacy-client'), {
      id: 'privacy-client',
      firstName: 'Client',
      lastName: 'Confidentiel',
      phone: '0550333444',
      email: 'privacy-client@example.com',
      centerId: 'center-a',
      createdAt: '2026-07-01',
      status: 'active',
    });
    batch.set(db.collection('client_packages').doc('privacy-package'), {
      id: 'privacy-package',
      clientId: 'privacy-client',
      packageId: 'package-aq8',
      centerId: 'center-a',
      sessionsRemaining: 0,
      totalSessions: 5,
      purchaseDate: '2026-06-01',
      status: 'completed',
    });
    batch.set(db.collection('appointments').doc('privacy-appointment'), {
      id: 'privacy-appointment',
      clientId: 'privacy-client',
      serviceId: 'service-aq8',
      centerId: 'center-a',
      dateTime: '2026-08-01T10:00',
      duration: 20,
      status: 'booked',
    });
    batch.set(db.collection('users').doc(managerA.uid), {
      uid: managerA.uid,
      email: 'manager-a@security.test',
      role: 'center_manager',
      centerId: 'center-a',
      active: true,
      name: 'Manager A',
    });
    batch.set(db.collection('users').doc(managerSuspended.uid), {
      uid: managerSuspended.uid,
      email: 'manager-suspended@security.test',
      role: 'center_manager',
      centerId: 'center-suspended',
      active: true,
      name: 'Manager suspendu',
    });
    batch.set(db.collection('users').doc(managerWithoutCenter.uid), {
      uid: managerWithoutCenter.uid,
      email: 'manager-orphan@security.test',
      role: 'center_manager',
      centerId: null,
      active: true,
      name: 'Manager sans centre',
    });
    batch.set(db.collection('users').doc(inactiveManager.uid), {
      uid: inactiveManager.uid,
      email: 'manager-inactive@security.test',
      role: 'center_manager',
      centerId: 'center-a',
      active: false,
      name: 'Manager inactif',
    });
    batch.set(db.collection('users').doc(superAdmin.uid), {
      uid: superAdmin.uid,
      email: 'super-admin@security.test',
      role: 'super_admin',
      centerId: null,
      active: true,
      name: 'Super Admin',
    });
    await batch.commit();


    await testCase('valid active manager tokens are accepted by the server', async () => {
      const profile = await verifyServerCrmAccess(
        authenticatedRequest(managerA.token),
        ['center_manager'],
      );
      assert.equal(profile.uid, managerA.uid);
      assert.equal(profile.centerId, 'center-a');
    });

    await testCase('suspended centers are denied by server APIs, not only the UI', async () => {
      await assert.rejects(
        verifyServerCrmAccess(
          authenticatedRequest(managerSuspended.token),
          ['center_manager'],
        ),
        (error: unknown) => (
          error instanceof CrmAccessError
          && error.statusCode === 403
          && error.message.includes('suspendu')
        ),
      );

      const response = await mutateClients(authenticatedRequest(managerSuspended.token, {
        action: 'upsert',
        centerId: 'center-suspended',
        client: {},
      }));
      assert.equal(response.status, 403);
    });

    await testCase('manager profiles without a center are denied', async () => {
      await assert.rejects(
        verifyServerCrmAccess(
          authenticatedRequest(managerWithoutCenter.token),
          ['center_manager'],
        ),
        (error: unknown) => error instanceof CrmAccessError && error.statusCode === 403,
      );
    });

    await testCase('inactive manager profiles are denied', async () => {
      await assert.rejects(
        verifyServerCrmAccess(
          authenticatedRequest(inactiveManager.token),
          ['center_manager'],
        ),
        (error: unknown) => error instanceof CrmAccessError && error.statusCode === 403,
      );
    });

    await testCase('manager APIs reject cross-center payloads', async () => {
      const response = await mutateClients(authenticatedRequest(managerA.token, {
        action: 'upsert',
        centerId: 'center-b',
        client: {
          firstName: 'Intrus',
          lastName: 'Centre B',
          phone: '0550000000',
        },
      }));
      assert.equal(response.status, 403);
    });

    await testCase('center settings use the authenticated API with strict isolation', async () => {
      const ownCenterResponse = await mutateCenterSettings(new Request(
        'http://localhost/api/crm-center-settings',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${managerA.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            centerId: 'center-a',
            updates: { phone: '0550111111' },
          }),
        },
      ));
      assert.equal(ownCenterResponse.status, 200);
      const crossCenterResponse = await mutateCenterSettings(new Request(
        'http://localhost/api/crm-center-settings',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${managerA.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            centerId: 'center-b',
            updates: { phone: '0550222222' },
          }),
        },
      ));
      assert.equal(crossCenterResponse.status, 403);
      const externalImageResponse = await mutateCenterSettings(new Request(
        'http://localhost/api/crm-center-settings',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${managerA.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            centerId: 'center-a',
            updates: { imageUrl: 'https://tracker.example/center.png' },
          }),
        },
      ));
      assert.equal(externalImageResponse.status, 400);
    });

    await testCase('public reservations do not reveal CRM membership or package state', async () => {
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 3);
      const date = bookingDate.toISOString().slice(0, 10);
      const response = await createPublicReservation(new Request(
        'http://localhost/api/public-reservations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            centerId: 'center-a',
            centerName: 'Centre A',
            firstName: 'Visiteur',
            lastName: 'Test',
            phone: '0550333444',
            email: 'visitor@example.com',
            service: 'aq8',
            bookingDate: date,
            bookingTime: '10:00',
          }),
        },
      ));
      assert.equal(response.status, 201);
      const body = await response.json() as Record<string, unknown>;
      const serialized = JSON.stringify(body).toLowerCase();
      assert.equal('warning' in body, false);
      assert.equal(serialized.includes('forfait'), false);
      assert.equal(serialized.includes('client existant'), false);
    });

    await testCase('super admin tokens retain the explicit network role', async () => {
      const profile = await verifyServerCrmAccess(
        authenticatedRequest(superAdmin.token),
        ['super_admin'],
      );
      assert.equal(profile.role, 'super_admin');
      assert.equal(profile.centerId, null);
    });

    await testCase('missing and forged bearer tokens are rejected', async () => {
      await assert.rejects(
        verifyServerCrmAccess(
          new Request('http://localhost/api/crm-clients'),
          ['center_manager'],
        ),
        (error: unknown) => error instanceof CrmAccessError && error.statusCode === 401,
      );
      await assert.rejects(
        verifyServerCrmAccess(
          authenticatedRequest('forged-token'),
          ['center_manager'],
        ),
        (error: unknown) => error instanceof CrmAccessError && error.statusCode === 401,
      );
    });
  } finally {
    await deleteClientApp(clientApp);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
