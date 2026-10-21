import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { assertFinancialAccess, CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { filterLegacyHistory, summarizeLegacyHistory, type LegacyHistoryRecord } from '@/src/lib/legacyHistory';

// Cache only center-scoped archives; authorization is checked on EVERY request before access.
const cache = new Map<string, { expires: number; rows: Promise<LegacyHistoryRecord[]> }>();
const visibleFields = ['centerId', 'clientId', 'clientName', 'clientExists', 'date', 'type', 'amount', 'comment',
  'service', 'resource', 'planningState', 'end', 'eventId', 'cancelled', 'refunded', 'sourceState', 'relatedReservationIds', 'originalCenterMissing',
  'previousImportedCenterId', 'source'];
const visibleRecord = (data: Record<string, unknown>, id: string) => ({
  ...Object.fromEntries(visibleFields.filter(key => data[key] !== undefined).map(key => [key, data[key]])), id,
}) as unknown as LegacyHistoryRecord;
function readArchives(centerId: string, finance: boolean) {
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

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['center_manager', 'super_admin']);
    const body = await request.json();
    const centerId = typeof body.centerId === 'string' ? body.centerId.trim() : '';
    if (!centerId || (actor.role !== 'super_admin' && actor.centerId !== centerId)) throw new CrmAccessError('Centre non autorisé.', 403);
    if (!['finance', 'reservations'].includes(body.kind)) throw new CrmAccessError('Historique invalide.', 400);
    if (body.kind === 'finance') assertFinancialAccess(actor);
    for (const key of ['from', 'to']) if (body[key] && !/^\d{4}-\d{2}-\d{2}$/.test(body[key])) throw new CrmAccessError('Date invalide.', 400);
    if (body.from && body.to && body.from > body.to) throw new CrmAccessError('Période invalide.', 400);
    for (const key of ['search', 'clientId', 'type']) if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 200)) throw new CrmAccessError('Filtre invalide.', 400);
    const rows = await readArchives(centerId, body.kind === 'finance');
    const filtered = filterLegacyHistory(rows, body);
    const pageSize = body.pageSize === 100 ? 100 : 50;
    const page = Math.max(1, Math.min(Math.ceil(filtered.length / pageSize) || 1, Number.isSafeInteger(body.page) ? body.page : 1));
    return NextResponse.json({ ok: true, rows: filtered.slice((page - 1) * pageSize, page * pageSize), page, pageSize,
      total: filtered.length, summary: summarizeLegacyHistory(filtered), types: [...new Set(rows.map(r => r.type))].sort(),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
