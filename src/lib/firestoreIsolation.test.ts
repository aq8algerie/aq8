import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getBytes, ref as storageRef, uploadBytes } from 'firebase/storage';

const PROJECT_ID = 'demo-aq8-security';
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8085;
const STORAGE_EMULATOR_PORT = 9195;

let testEnv: RulesTestEnvironment;

async function seedSecurityFixtures() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const fixtures: Array<[string, Record<string, unknown>]> = [
      ['centers/center-a', { id: 'center-a', name: 'Centre A', status: 'active' }],
      ['centers/center-b', { id: 'center-b', name: 'Centre B', status: 'active' }],
      ['centers/center-suspended', { id: 'center-suspended', name: 'Suspendu', status: 'suspended' }],
      ['users/manager-a', {
        uid: 'manager-a',
        role: 'center_manager',
        centerId: 'center-a',
        active: true,
        name: 'Manager A',
      }],
      ['users/manager-b', {
        uid: 'manager-b',
        role: 'center_manager',
        centerId: 'center-b',
        active: true,
        name: 'Manager B',
      }],
      ['users/manager-suspended', {
        uid: 'manager-suspended',
        role: 'center_manager',
        centerId: 'center-suspended',
        active: true,
        name: 'Manager suspendu',
      }],
      ['users/super-admin', {
        uid: 'super-admin',
        role: 'super_admin',
        centerId: null,
        active: true,
        name: 'Super Admin',
      }],
      ['managers/manager-record-a', {
        id: 'manager-record-a',
        name: 'Manager A',
        email: 'manager-a@example.com',
        centerId: 'center-a',
        active: true,
      }],
      ['managers/manager-record-b', {
        id: 'manager-record-b',
        name: 'Manager B',
        email: 'manager-b@example.com',
        centerId: 'center-b',
        active: true,
      }],
      ['clients/client-a', {
        id: 'client-a',
        firstName: 'Client',
        lastName: 'A',
        phone: '0550000001',
        email: 'client-a@example.com',
        centerId: 'center-a',
        createdAt: '2026-07-01',
        status: 'active',
      }],
      ['clients/client-b', {
        id: 'client-b',
        firstName: 'Client',
        lastName: 'B',
        phone: '0550000002',
        email: 'client-b@example.com',
        centerId: 'center-b',
        createdAt: '2026-07-01',
        status: 'active',
      }],
      ['clients/client-suspended-center', {
        id: 'client-suspended-center',
        firstName: 'Client',
        lastName: 'Suspendu',
        phone: '0550000003',
        email: 'client-suspended@example.com',
        centerId: 'center-suspended',
        createdAt: '2026-07-01',
        status: 'active',
      }],
      ['services/service-aq8', {
        id: 'service-aq8',
        name: 'AQ8',
        type: 'aq8',
        duration: 20,
        price: 3000,
      }],
      ['appointments/appointment-a', {
        id: 'appointment-a',
        clientId: 'client-a',
        serviceId: 'service-aq8',
        centerId: 'center-a',
        dateTime: '2026-08-10T10:00',
        duration: 20,
        status: 'booked',
      }],
      ['appointments/appointment-b', {
        id: 'appointment-b',
        clientId: 'client-b',
        serviceId: 'service-aq8',
        centerId: 'center-b',
        dateTime: '2026-08-10T11:00',
        duration: 20,
        status: 'booked',
      }],
      ['booking_requests/request-a', {
        centerId: 'center-a',
        centerName: 'Centre A',
        firstName: 'Client',
        lastName: 'A',
        phone: '0550000001',
        email: 'client-a@example.com',
        service: 'aq8',
        bookingDate: '2026-08-12',
        bookingTime: '10:00',
        status: 'pending',
        createdAt: '2026-07-29T10:00:00.000Z',
      }],
      ['payments/payment-a', {
        id: 'payment-a',
        clientId: 'client-a',
        packageId: 'package-aq8',
        centerId: 'center-a',
        amount: 15000,
        date: '2026-07-20',
        method: 'cash',
      }],
      ['audit_logs/audit-a', {
        timestamp: '2026-07-29T10:00:00.000Z',
        userId: 'super-admin',
        userName: 'Super Admin',
        role: 'super_admin',
        action: 'SECURITY_FIXTURE',
        details: 'Fixture de sécurité.',
        targetId: null,
        targetType: null,
        centerId: 'center-a',
        centerName: 'Centre A',
      }],
    ];

    const batch = writeBatch(db);
    fixtures.forEach(([path, data]) => batch.set(doc(db, path), data));
    await batch.commit();

    const storage = context.storage();
    const publicImage = new Uint8Array([137, 80, 78, 71]);
    await uploadBytes(
      storageRef(storage, 'centers/center-a/public/fixture.png'),
      publicImage,
      { contentType: 'image/png' },
    );
    await uploadBytes(
      storageRef(storage, 'blog/post-a/cover/fixture.png'),
      publicImage,
      { contentType: 'image/png' },
    );
    await uploadBytes(
      storageRef(storage, 'private/secret.txt'),
      new Uint8Array([115, 101, 99, 114, 101, 116]),
      { contentType: 'text/plain' },
    );
  });
}

async function testCase(name: string, run: () => Promise<void>) {
  await run();
  console.log(`ok - ${name}`);
}

async function run() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
      rules: await readFile('firestore.rules', 'utf8'),
    },
    storage: {
      host: EMULATOR_HOST,
      port: STORAGE_EMULATOR_PORT,
      rules: await readFile('storage.rules', 'utf8'),
    },
  });

  try {
    await testEnv.clearFirestore();
    await seedSecurityFixtures();

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    const managerADb = testEnv.authenticatedContext('manager-a').firestore();
    const managerBDb = testEnv.authenticatedContext('manager-b').firestore();
    const suspendedManagerDb = testEnv.authenticatedContext('manager-suspended').firestore();
    const superAdminDb = testEnv.authenticatedContext('super-admin').firestore();
    const anonymousStorage = testEnv.unauthenticatedContext().storage();
    const managerAStorage = testEnv.authenticatedContext('manager-a').storage();
    const superAdminStorage = testEnv.authenticatedContext('super-admin').storage();

    await testCase('public Storage assets are readable but private paths stay closed', async () => {
      await assertSucceeds(
        getBytes(storageRef(anonymousStorage, 'centers/center-a/public/fixture.png')),
      );
      await assertSucceeds(
        getBytes(storageRef(anonymousStorage, 'blog/post-a/cover/fixture.png')),
      );
      await assertFails(
        getBytes(storageRef(anonymousStorage, 'private/secret.txt')),
      );
    });

    await testCase('Storage writes remain API-only for every browser role', async () => {
      const payload = new Uint8Array([137, 80, 78, 71]);
      await assertFails(uploadBytes(
        storageRef(managerAStorage, 'centers/center-a/public/forged.png'),
        payload,
        { contentType: 'image/png' },
      ));
      await assertFails(uploadBytes(
        storageRef(superAdminStorage, 'blog/post-a/cover/forged.png'),
        payload,
        { contentType: 'image/png' },
      ));
    });

    await testCase('anonymous users cannot read CRM clients', async () => {
      await assertFails(getDoc(doc(anonymousDb, 'clients', 'client-a')));
    });

    await testCase('manager A can read only center A clients', async () => {
      await assertSucceeds(getDoc(doc(managerADb, 'clients', 'client-a')));
      await assertFails(getDoc(doc(managerADb, 'clients', 'client-b')));
      const ownCenterQuery = query(
        collection(managerADb, 'clients'),
        where('centerId', '==', 'center-a'),
      );
      const snapshot = await assertSucceeds(getDocs(ownCenterQuery));
      assert.equal(snapshot.size, 1);
      await assertFails(getDocs(collection(managerADb, 'clients')));
    });

    await testCase('manager B cannot read center A data', async () => {
      await assertFails(getDoc(doc(managerBDb, 'clients', 'client-a')));
      await assertFails(getDoc(doc(managerBDb, 'appointments', 'appointment-a')));
      await assertFails(getDoc(doc(managerBDb, 'payments', 'payment-a')));
    });

    await testCase('a suspended center loses Firestore CRM access immediately', async () => {
      await assertFails(
        getDoc(doc(suspendedManagerDb, 'clients', 'client-suspended-center')),
      );
      await assertFails(
        updateDoc(doc(suspendedManagerDb, 'centers', 'center-suspended'), {
          phone: '0550999999',
          updatedAt: '2026-07-29T12:00:00.000Z',
        }),
      );
    });

    await testCase('browser managers cannot update center documents directly', async () => {
      await assertFails(updateDoc(doc(managerADb, 'centers', 'center-a'), {
        phone: '0550111111',
        updatedAt: '2026-07-29T12:00:00.000Z',
      }));
      await assertFails(updateDoc(doc(managerADb, 'centers', 'center-b'), {
        phone: '0550222222',
        updatedAt: '2026-07-29T12:00:00.000Z',
      }));
    });

    await testCase('super admin retains network-wide read access', async () => {
      await assertSucceeds(getDoc(doc(superAdminDb, 'clients', 'client-a')));
      await assertSucceeds(getDoc(doc(superAdminDb, 'clients', 'client-b')));
      await assertSucceeds(getDoc(doc(superAdminDb, 'audit_logs', 'audit-a')));
    });

    await testCase('cross-center appointment references are denied', async () => {
      await assertFails(setDoc(doc(managerADb, 'appointments', 'appointment-cross'), {
        id: 'appointment-cross',
        clientId: 'client-b',
        serviceId: 'service-aq8',
        centerId: 'center-a',
        dateTime: '2026-08-13T10:00',
        duration: 20,
        status: 'booked',
      }));

      await assertSucceeds(setDoc(doc(managerADb, 'appointments', 'appointment-valid'), {
        id: 'appointment-valid',
        clientId: 'client-a',
        serviceId: 'service-aq8',
        centerId: 'center-a',
        dateTime: '2026-08-13T11:00',
        duration: 20,
        status: 'booked',
      }));
    });

    await testCase('cross-center measurement references are denied', async () => {
      await assertFails(setDoc(doc(managerADb, 'measurements', 'measurement-cross'), {
        id: 'measurement-cross',
        clientId: 'client-b',
        centerId: 'center-a',
        date: '2026-07-29',
        weight: 70,
        loggedBy: 'Manager A',
      }));

      await assertSucceeds(setDoc(doc(managerADb, 'measurements', 'measurement-valid'), {
        id: 'measurement-valid',
        clientId: 'client-a',
        centerId: 'center-a',
        date: '2026-07-29',
        weight: 70,
        loggedBy: 'Manager A',
      }));
    });

    await testCase('booking decisions cannot point to another center', async () => {
      await assertFails(updateDoc(doc(managerADb, 'booking_requests', 'request-a'), {
        status: 'accepted',
        clientId: 'client-b',
        appointmentId: 'appointment-b',
        processedAt: '2026-07-29T12:00:00.000Z',
        processedByUserId: 'manager-a',
        processedByUserName: 'Manager A',
        acceptedAt: '2026-07-29T12:00:00.000Z',
      }));

      const batch = writeBatch(managerADb);
      batch.set(doc(managerADb, 'appointments', 'appointment-request-a'), {
        id: 'appointment-request-a',
        clientId: 'client-a',
        serviceId: 'service-aq8',
        centerId: 'center-a',
        dateTime: '2026-08-12T10:00',
        duration: 20,
        status: 'booked',
      });
      batch.update(doc(managerADb, 'booking_requests', 'request-a'), {
        status: 'accepted',
        clientId: 'client-a',
        appointmentId: 'appointment-request-a',
        processedAt: '2026-07-29T12:01:00.000Z',
        processedByUserId: 'manager-a',
        processedByUserName: 'Manager A',
        acceptedAt: '2026-07-29T12:01:00.000Z',
      });
      await assertSucceeds(batch.commit());
    });

    await testCase('financial collections remain server-write-only', async () => {
      await assertFails(setDoc(doc(managerADb, 'payments', 'payment-forged'), {
        id: 'payment-forged',
        clientId: 'client-a',
        packageId: 'package-aq8',
        centerId: 'center-a',
        amount: 1,
        date: '2026-07-29',
        method: 'cash',
      }));
      await assertFails(setDoc(doc(managerADb, 'client_packages', 'package-forged'), {
        id: 'package-forged',
        clientId: 'client-a',
        packageId: 'package-aq8',
        centerId: 'center-a',
        sessionsRemaining: 999,
        totalSessions: 999,
        purchaseDate: '2026-07-29',
        status: 'active',
      }));
    });

    await testCase('managers cannot forge financial audit events', async () => {
      await assertFails(setDoc(doc(managerADb, 'audit_logs', 'forged-payment-audit'), {
        timestamp: '2026-07-29T12:00:00.000Z',
        userId: 'manager-a',
        userName: 'Manager A',
        role: 'center_manager',
        action: 'RECORD_PAYMENT',
        details: 'Faux paiement.',
        targetId: 'payment-forged',
        targetType: 'payment',
        centerId: 'center-a',
        centerName: 'Centre A',
      }));
      await assertSucceeds(setDoc(doc(managerADb, 'audit_logs', 'valid-appointment-audit'), {
        timestamp: '2026-07-29T12:00:00.000Z',
        userId: 'manager-a',
        userName: 'Manager A',
        role: 'center_manager',
        action: 'CREATE_APPOINTMENT',
        details: 'Création contrôlée.',
        targetId: 'appointment-valid',
        targetType: 'appointment',
        centerId: 'center-a',
        centerName: 'Centre A',
      }));
    });
  } finally {
    await testEnv.cleanup();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
