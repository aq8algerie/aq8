import { writeBatch, doc, getDocs, collection } from 'firebase/firestore';
import {
  AQ8Database,
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

export async function seedDatabase(db: any) {
  console.log("Seeding database to Firestore...");
  const batch = writeBatch(db);

  INITIAL_CENTERS.forEach(c => batch.set(doc(db, 'centers', c.id), c));
  INITIAL_MANAGERS.forEach(m => batch.set(doc(db, 'managers', m.id), m));
  INITIAL_SERVICES.forEach(s => batch.set(doc(db, 'services', s.id), s));
  INITIAL_PACKAGES.forEach(p => batch.set(doc(db, 'packages', p.id), p));
  INITIAL_CLIENTS.forEach(c => batch.set(doc(db, 'clients', c.id), c));
  INITIAL_CLIENT_PACKAGES.forEach(cp => batch.set(doc(db, 'client_packages', cp.id), cp));
  INITIAL_PAYMENTS.forEach(p => batch.set(doc(db, 'payments', p.id), p));
  INITIAL_APPOINTMENTS.forEach(a => batch.set(doc(db, 'appointments', a.id), a));
  INITIAL_MEASUREMENTS.forEach(m => batch.set(doc(db, 'measurements', m.id), m));
  batch.set(doc(db, 'settings', 'general'), INITIAL_SETTINGS);

  await batch.commit();
  console.log("Database seeded successfully!");
}

export async function resetDatabase(db: any, isDevToolsEnabled: boolean) {
  if (!isDevToolsEnabled) {
    console.warn('Database reset is disabled outside development.');
    return;
  }

  if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs d\'origine ? Les données sur Firestore et vos modifications locales seront effacées.')) {
    try {
      AQ8Database.clearAndReset();

      // Clear collections in Firestore
      const collectionsToClear = [
        'centers', 'managers', 'services', 'packages', 'clients',
        'appointments', 'client_packages', 'payments', 'measurements'
      ];

      const batch = writeBatch(db);
      for (const colName of collectionsToClear) {
        const snapshot = await getDocs(collection(db, colName));
        snapshot.forEach(document => {
          batch.delete(doc(db, colName, document.id));
        });
      }
      // Also delete settings
      batch.delete(doc(db, 'settings', 'general'));

      await batch.commit();
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset Firestore database:", error);
      window.location.reload();
    }
  }
}
