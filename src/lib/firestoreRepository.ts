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
  const sanitizedNewList = (newList || []).map((item, idx) => ({
    ...item,
    id: String(item?.id || `item-${Date.now()}-${idx}`),
  }));
  const sanitizedOldList = (oldList || []).map((item, idx) => ({
    ...item,
    id: String(item?.id || `item-${Date.now()}-${idx}`),
  }));

  const oldIds = new Set(sanitizedOldList.map(item => item.id).filter(Boolean));
  const newIds = new Set(sanitizedNewList.map(item => item.id).filter(Boolean));
  const oldById = new Map(sanitizedOldList.map(item => [item.id, item]));

  const changedItems = sanitizedNewList.filter(item => {
    if (!item.id) return false;
    const oldItem = oldById.get(item.id);
    return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(item);
  });

  const deletedIds = Array.from(oldIds).filter(id => id && !newIds.has(id));
  const affectedIds = Array.from(new Set([
    ...changedItems.map(item => item.id),
    ...deletedIds,
  ])).filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  if (affectedIds.length === 0) return;

  try {
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
          console.warn(`[syncCollection] Snapshot difference in ${collectionName} for ${id}, updating to latest.`);
        }
      }

      for (const item of changedItems) {
        if (item.id) {
          transaction.set(doc(db, collectionName, item.id), item);
        }
      }
      for (const id of deletedIds) {
        if (id) {
          transaction.delete(doc(db, collectionName, id));
        }
      }
    });
  } catch (error) {
    console.warn(`[syncCollection] Transaction fallback for ${collectionName}:`, error);
    for (const item of changedItems) {
      if (item.id) {
        await setDoc(doc(db, collectionName, item.id), item).catch(err =>
          console.error(`[syncCollection] Direct setDoc failed for ${collectionName}/${item.id}:`, err)
        );
      }
    }
  }
}

export async function saveDocument<T>(
  db: Firestore,
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> {
  await setDoc(doc(db, collectionName, documentId), data);
}
