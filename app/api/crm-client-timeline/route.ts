import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { buildClientTimeline, filterClientTimeline } from '@/src/lib/clientTimeline';
import type { Appointment, Client, ClientPackage, Payment } from '@/src/types';
import type { LegacyHistoryRecord } from '@/src/lib/legacyHistory';
import { buildClientStatement } from '@/src/lib/clientStatement';

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['center_manager', 'super_admin']);
    const body = await request.json();
    if (body.mode !== undefined && body.mode !== 'statement') throw new CrmAccessError('Mode invalide.', 400);
    if (body.mode === 'statement' && ['search', 'kind', 'origin', 'from', 'to'].some(key => body[key])) throw new CrmAccessError('Le relevé complet ne peut pas être filtré.', 400);
    for (const key of ['centerId', 'clientId']) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 200 || body[key].includes('/')) throw new CrmAccessError('Dossier invalide.', 400);
    const centerId = body.centerId.trim(), clientId = body.clientId.trim();
    if (actor.role !== 'super_admin' && actor.centerId !== centerId) throw new CrmAccessError('Centre non autorisé.', 403);
    for (const key of ['search', 'kind', 'origin', 'from', 'to']) if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 200)) throw new CrmAccessError('Filtre invalide.', 400);
    if (body.kind && !['payment', 'package', 'reservation'].includes(body.kind)) throw new CrmAccessError('Type invalide.', 400);
    if (body.origin && !['current', 'legacy'].includes(body.origin)) throw new CrmAccessError('Origine invalide.', 400);
    for (const key of ['from', 'to']) if (body[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(body[key]) || !Number.isFinite(Date.parse(body[key])) || new Date(body[key]).toISOString().slice(0, 10) !== body[key])) throw new CrmAccessError('Date invalide.', 400);
    if (body.from && body.to && body.from > body.to) throw new CrmAccessError('Période invalide.', 400);
    const db = getAdminDb();
    const doc = await db.collection('clients').doc(clientId).get();
    if (!doc.exists || doc.data()?.centerId !== centerId) throw new CrmAccessError('Dossier introuvable dans ce centre.', 404);
    const read = async (collection: string) => {
      // A single-field query avoids requiring a new composite index. Enforce both ownership fields again below.
      const snapshot = await db.collection(collection).where('clientId', '==', clientId).limit(5001).get();
      if (snapshot.size > 5000) throw new CrmAccessError('Ce dossier dépasse la capacité de consultation. Contactez le responsable.', 413);
      return snapshot.docs.filter(d => d.data().centerId === centerId).map(d => ({ ...d.data(), id: d.id }));
    };
    const [appointments, packages, payments, finance, reservations] = await Promise.all([
      read('appointments'), read('client_packages'), actor.canReadFinances ? read('payments') : [],
      actor.canReadFinances ? read('legacy_financial_operations') : [], read('legacy_reservations'),
    ]);
    // Keep pre-existing imports without a PDF center visible, without importing or duplicating archive records.
    const unassigned = payments.flatMap((p: any) => p.legacyReconciliation?.unassignedSourceRecord
      ? [{ ...p.legacyReconciliation.unassignedSourceRecord, id: p.id, centerId, originalCenterMissing: true }] : []);
    const input = { client: { ...doc.data(), id: doc.id } as Client, centerId, financialVisible: actor.canReadFinances,
      appointments: appointments as Appointment[], packages: packages as ClientPackage[], payments: payments as Payment[],
      finance: [...finance, ...unassigned] as LegacyHistoryRecord[], reservations: reservations as LegacyHistoryRecord[] };
    if (body.mode === 'statement') {
      const center = await db.collection('centers').doc(centerId).get();
      return NextResponse.json({ ok: true, statement: buildClientStatement(input, center.data() || {}) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const events = buildClientTimeline(input);
    const filtered = filterClientTimeline(events, body);
    const pageSize = 30;
    const page = Math.max(1, Math.min(Math.ceil(filtered.length / pageSize) || 1, Number.isSafeInteger(body.page) ? body.page : 1));
    return NextResponse.json({ ok: true, rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize,
      financialVisible: actor.canReadFinances }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
