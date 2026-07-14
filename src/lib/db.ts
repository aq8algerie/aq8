import { db, requireFirestore } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import {
  Center,
  CenterManager,
  Service,
  Package,
  Client,
  Appointment,
  ClientPackage,
  Payment,
  Measurement,
  GeneralSettings
} from '../types';
import {
  INITIAL_CENTERS,
  INITIAL_MANAGERS,
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_CLIENTS,
  INITIAL_CLIENT_PACKAGES,
  INITIAL_PAYMENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_MEASUREMENTS,
  INITIAL_SETTINGS
} from '../mockData';

// Seeding logic
export async function seedDatabaseIfNeeded() {
  try {
    const centersSnap = await getDocs(collection(requireFirestore(), 'centers'));
    if (centersSnap.empty) {
      console.log('Firestore is empty. Seeding initial AQ8 data...');
      const batch = writeBatch(requireFirestore());

      // 1. Seed Centers
      INITIAL_CENTERS.forEach((c) => {
        const ref = doc(requireFirestore(), 'centers', c.id);
        batch.set(ref, c);
      });

      // 2. Seed Managers
      INITIAL_MANAGERS.forEach((m) => {
        // Key managers by email so we can look them up easily in security rules
        const emailKey = m.email.toLowerCase().trim();
        const ref = doc(requireFirestore(), 'managers', emailKey);
        batch.set(ref, m);
      });

      // 3. Seed Services
      INITIAL_SERVICES.forEach((s) => {
        const ref = doc(requireFirestore(), 'services', s.id);
        batch.set(ref, s);
      });

      // 4. Seed Packages
      INITIAL_PACKAGES.forEach((p) => {
        const ref = doc(requireFirestore(), 'packages', p.id);
        batch.set(ref, p);
      });

      // 5. Seed Clients
      INITIAL_CLIENTS.forEach((cl) => {
        const ref = doc(requireFirestore(), 'clients', cl.id);
        batch.set(ref, cl);
      });

      // 6. Seed Client Packages
      INITIAL_CLIENT_PACKAGES.forEach((cp) => {
        const ref = doc(requireFirestore(), 'client_packages', cp.id);
        batch.set(ref, cp);
      });

      // 7. Seed Payments
      INITIAL_PAYMENTS.forEach((pay) => {
        const ref = doc(requireFirestore(), 'payments', pay.id);
        batch.set(ref, pay);
      });

      // 8. Seed Appointments
      INITIAL_APPOINTMENTS.forEach((apt) => {
        const ref = doc(requireFirestore(), 'appointments', apt.id);
        batch.set(ref, apt);
      });

      // 9. Seed Measurements
      INITIAL_MEASUREMENTS.forEach((meas) => {
        const ref = doc(requireFirestore(), 'measurements', meas.id);
        batch.set(ref, meas);
      });

      // 10. Seed Settings
      const settingsRef = doc(requireFirestore(), 'settings', 'general');
      batch.set(settingsRef, INITIAL_SETTINGS);

      await batch.commit();
      console.log('Database seeded successfully!');
    } else {
      console.log('Database already has data. Seeding skipped.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

function scopedCollection(collectionName: string, centerId?: string) {
  const ref = collection(requireFirestore(), collectionName);
  return centerId ? query(ref, where('centerId', '==', centerId)) : ref;
}

// REAL-TIME SUBSCRIBERS
export function subscribeToCenters(callback: (centers: Center[]) => void) {
  if (!db) {
    callback(INITIAL_CENTERS);
    return () => {};
  }
  return onSnapshot(collection(requireFirestore(), 'centers'), (snap) => {
    const list: Center[] = [];
    snap.forEach((doc) => list.push(doc.data() as Center));
    callback(list);
  });
}

export function subscribeToManagers(callback: (managers: CenterManager[]) => void) {
  if (!db) {
    callback(INITIAL_MANAGERS);
    return () => {};
  }
  return onSnapshot(collection(requireFirestore(), 'managers'), (snap) => {
    const byEmail = new Map<string, { manager: CenterManager; score: number }>();

    snap.forEach((docSnap) => {
      const manager = docSnap.data() as CenterManager;
      const emailKey = manager.email.toLowerCase().trim();
      const normalized: CenterManager = { ...manager, email: emailKey };
      const score = docSnap.id === emailKey ? 2 : 1;
      const current = byEmail.get(emailKey);

      if (!current || score >= current.score) {
        byEmail.set(emailKey, { manager: normalized, score });
      }
    });

    callback(Array.from(byEmail.values()).map((entry) => entry.manager));
  });
}

export function subscribeToServices(callback: (services: Service[]) => void) {
  if (!db) {
    callback(INITIAL_SERVICES);
    return () => {};
  }
  return onSnapshot(collection(requireFirestore(), 'services'), (snap) => {
    const list: Service[] = [];
    snap.forEach((doc) => list.push(doc.data() as Service));
    callback(list);
  });
}

export function subscribeToPackages(callback: (packages: Package[]) => void) {
  if (!db) {
    callback(INITIAL_PACKAGES);
    return () => {};
  }
  return onSnapshot(collection(requireFirestore(), 'packages'), (snap) => {
    const list: Package[] = [];
    snap.forEach((doc) => list.push(doc.data() as Package));
    callback(list);
  });
}

export function subscribeToClients(callback: (clients: Client[]) => void, centerId?: string) {
  if (!db) {
    callback(centerId ? INITIAL_CLIENTS.filter((client) => client.centerId === centerId) : INITIAL_CLIENTS);
    return () => {};
  }
  return onSnapshot(scopedCollection('clients', centerId), (snap) => {
    const list: Client[] = [];
    snap.forEach((doc) => list.push(doc.data() as Client));
    callback(list);
  });
}

export function subscribeToAppointments(callback: (appointments: Appointment[]) => void, centerId?: string) {
  if (!db) {
    callback(centerId ? INITIAL_APPOINTMENTS.filter((appointment) => appointment.centerId === centerId) : INITIAL_APPOINTMENTS);
    return () => {};
  }
  return onSnapshot(scopedCollection('appointments', centerId), (snap) => {
    const list: Appointment[] = [];
    snap.forEach((doc) => list.push(doc.data() as Appointment));
    callback(list);
  });
}

export function subscribeToClientPackages(callback: (clientPackages: ClientPackage[]) => void, centerId?: string) {
  if (!db) {
    callback(centerId ? INITIAL_CLIENT_PACKAGES.filter((clientPackage) => clientPackage.centerId === centerId) : INITIAL_CLIENT_PACKAGES);
    return () => {};
  }
  return onSnapshot(scopedCollection('client_packages', centerId), (snap) => {
    const list: ClientPackage[] = [];
    snap.forEach((doc) => list.push(doc.data() as ClientPackage));
    callback(list);
  });
}

export function subscribeToPayments(callback: (payments: Payment[]) => void, centerId?: string) {
  if (!db) {
    callback(centerId ? INITIAL_PAYMENTS.filter((payment) => payment.centerId === centerId) : INITIAL_PAYMENTS);
    return () => {};
  }
  return onSnapshot(scopedCollection('payments', centerId), (snap) => {
    const list: Payment[] = [];
    snap.forEach((doc) => list.push(doc.data() as Payment));
    callback(list);
  });
}

export function subscribeToMeasurements(callback: (measurements: Measurement[]) => void, centerId?: string) {
  if (!db) {
    callback(centerId ? INITIAL_MEASUREMENTS.filter((measurement) => measurement.centerId === centerId) : INITIAL_MEASUREMENTS);
    return () => {};
  }
  return onSnapshot(scopedCollection('measurements', centerId), (snap) => {
    const list: Measurement[] = [];
    snap.forEach((doc) => list.push(doc.data() as Measurement));
    callback(list);
  });
}

export function subscribeToSettings(callback: (settings: GeneralSettings) => void) {
  if (!db) {
    callback(INITIAL_SETTINGS);
    return () => {};
  }
  return onSnapshot(doc(requireFirestore(), 'settings', 'general'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as GeneralSettings);
    } else {
      callback(INITIAL_SETTINGS);
    }
  });
}

// WRITE / SAVE OPERATIONS (MERGE = TRUE FOR SAFELY SAVING PARTIAL UPDATES)
export async function dbSaveCenter(center: Center) {
  await setDoc(doc(requireFirestore(), 'centers', center.id), center, { merge: true });
}

export async function dbDeleteCenter(centerId: string) {
  await deleteDoc(doc(requireFirestore(), 'centers', centerId));
}

export async function dbSaveManager(manager: CenterManager) {
  // Key managers by email in Firestore for easier rules querying
  const emailKey = manager.email.toLowerCase().trim();
  await setDoc(doc(requireFirestore(), 'managers', emailKey), { ...manager, email: emailKey }, { merge: true });
}

export async function ensureManagerDocForRules(manager: CenterManager) {
  const emailKey = manager.email.toLowerCase().trim();
  const normalized: CenterManager = { ...manager, email: emailKey };
  const ref = doc(requireFirestore(), 'managers', emailKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, normalized, { merge: true });
    return true;
  }

  const current = snap.data() as CenterManager;
  const isSame = current.id === normalized.id
    && current.name === normalized.name
    && current.email?.toLowerCase().trim() === emailKey
    && current.centerId === normalized.centerId
    && current.active === normalized.active;

  if (isSame) {
    return false;
  }

  await setDoc(ref, normalized, { merge: true });
  return true;
}

export async function dbDeleteManager(managerEmail: string) {
  const emailKey = managerEmail.toLowerCase().trim();
  await deleteDoc(doc(requireFirestore(), 'managers', emailKey));
}

export async function dbSaveService(service: Service) {
  await setDoc(doc(requireFirestore(), 'services', service.id), service, { merge: true });
}

export async function dbDeleteService(serviceId: string) {
  await deleteDoc(doc(requireFirestore(), 'services', serviceId));
}

export async function dbSavePackage(pkg: Package) {
  await setDoc(doc(requireFirestore(), 'packages', pkg.id), pkg, { merge: true });
}

export async function dbDeletePackage(pkgId: string) {
  await deleteDoc(doc(requireFirestore(), 'packages', pkgId));
}

export async function dbSaveClient(client: Client) {
  await setDoc(doc(requireFirestore(), 'clients', client.id), client, { merge: true });
}

export async function dbDeleteClient(clientId: string) {
  await deleteDoc(doc(requireFirestore(), 'clients', clientId));
}

export async function dbSaveAppointment(apt: Appointment) {
  await setDoc(doc(requireFirestore(), 'appointments', apt.id), apt, { merge: true });
}

export async function dbDeleteAppointment(aptId: string) {
  await deleteDoc(doc(requireFirestore(), 'appointments', aptId));
}

export async function dbSaveClientPackage(cp: ClientPackage) {
  await setDoc(doc(requireFirestore(), 'client_packages', cp.id), cp, { merge: true });
}

export async function dbSavePayment(pay: Payment) {
  await setDoc(doc(requireFirestore(), 'payments', pay.id), pay, { merge: true });
}

export async function dbDeletePayment(payId: string) {
  await deleteDoc(doc(requireFirestore(), 'payments', payId));
}

export async function dbSaveMeasurement(meas: Measurement) {
  await setDoc(doc(requireFirestore(), 'measurements', meas.id), meas, { merge: true });
}

export async function dbSaveSettings(settings: GeneralSettings) {
  await setDoc(doc(requireFirestore(), 'settings', 'general'), settings, { merge: true });
}

// Reset routine for Dev/Demo
export async function dbResetToDefaults() {
  const collections = ['centers', 'managers', 'services', 'packages', 'clients', 'client_packages', 'payments', 'appointments', 'measurements'];
  
  for (const collName of collections) {
    const snap = await getDocs(collection(requireFirestore(), collName));
    const batch = writeBatch(requireFirestore());
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(requireFirestore(), 'settings', 'general'));
  await seedDatabaseIfNeeded();
}
