import { getAdminDb } from './serverFirebaseAdmin';
import type { LegacyHistoryRecord } from './legacyHistory';

// Cache only center-scoped archives; authorization is checked on EVERY request before access.
const cache = new Map<string, { expires: number; rows: Promise<LegacyHistoryRecord[]> }>();
const visibleFields = ['centerId', 'clientId', 'clientName', 'clientExists', 'date', 'type', 'amount', 'comment',
  'service', 'resource', 'planningState', 'end', 'eventId', 'cancelled', 'refunded', 'sourceState', 'relatedReservationIds', 'originalCenterMissing',
  'previousImportedCenterId', 'source'];
const visibleRecord = (data: Record<string, unknown>, id: string) => ({
  ...Object.fromEntries(visibleFields.filter(key => data[key] !== undefined).map(key => [key, data[key]])), id,
}) as unknown as LegacyHistoryRecord;
export function readArchives(centerId: string, finance: boolean) {
  const key = `${centerId}:${finance}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.rows;
  const db = getAdminDb();
  const rows = (async () => {
    const snapshot = await db.collection(finance ? 'legacy_financial_operations' : 'legacy_reservations').where('centerId', '==', centerId).select(...visibleFields).get();
    const records = snapshot.docs.map(doc => visibleRecord(doc.data(), doc.id));
    if (finance) {
      // Preserve visibility of PRE-EXISTING imports whose PDF has no center. Never create new ones.
      const existing = await db.collection('payments').where('centerId', '==', centerId).select('legacyReconciliation.unassignedSourceRecord').get();
      for (const doc of existing.docs) {
        const source = doc.data().legacyReconciliation?.unassignedSourceRecord;
        if (source) records.push(visibleRecord({ ...source, centerId, originalCenterMissing: true }, doc.id));
      }
    }
    return records;
  })();
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 300_000, rows };
  cache.set(key, entry);
  void rows.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
  return rows;
}

