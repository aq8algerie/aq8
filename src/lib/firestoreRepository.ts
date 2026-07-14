import { deleteDoc, doc, Firestore, setDoc } from 'firebase/firestore';

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

  for (const item of newList) {
    const oldItem = oldList.find(existing => existing.id === item.id);
    if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
      await setDoc(doc(db, collectionName, item.id), item);
    }
  }

  for (const id of oldIds) {
    if (!newIds.has(id)) {
      await deleteDoc(doc(db, collectionName, id));
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