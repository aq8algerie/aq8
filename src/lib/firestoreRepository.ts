import { doc, Firestore, runTransaction, setDoc } from 'firebase/firestore';

export type EntityWithId = {
  id: string;
};

export async function syncCollection<T extends EntityWithId>(
  db: Firestore,
  collectionName: string,
  newList: T[],
  oldList: T[]
): Promise<void> {
  const oldIds = new Set(oldList.map(item => item.id));
  const newIds = new Set(newList.map(item => item.id));
  const oldById = new Map(oldList.map(item => [item.id, item]));
  const changedItems = newList.filter(item => {
    const oldItem = oldById.get(item.id);
    return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(item);
  });
  const deletedIds = Array.from(oldIds).filter(id => !newIds.has(id));
  const affectedIds = Array.from(new Set([
    ...changedItems.map(item => item.id),
    ...deletedIds,
  ]));
  if (affectedIds.length === 0) return;

  await runTransaction(db, async transaction => {
    const snapshots = await Promise.all(
      affectedIds.map(id => transaction.get(doc(db, collectionName, id))),
    );
    const snapshotsById = new Map(
      snapshots.map(snapshot => [snapshot.id, snapshot]),
    );

    for (const id of affectedIds) {
      const expectedData = oldById.get(id);
      const snapshot = snapshotsById.get(id);
      const currentData = snapshot?.exists() ? snapshot.data() : undefined;
      if (JSON.stringify(currentData) !== JSON.stringify(expectedData)) {
        throw new Error(
          `Conflit détecté dans ${collectionName}. Les données ont changé depuis leur chargement ; actualisez la page avant de réessayer.`,
        );
      }
    }

    for (const item of changedItems) {
      transaction.set(doc(db, collectionName, item.id), item);
    }
    for (const id of deletedIds) {
      transaction.delete(doc(db, collectionName, id));
    }
  });
}

export async function saveDocument<T>(
  db: Firestore,
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> {
  await setDoc(doc(db, collectionName, documentId), data);
}
