import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { assertFinancialAccess, CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { readArchives } from '@/src/lib/serverLegacyArchives';
import { buildReconciliation, filterReconciliation, reconciliationLabels, type ReconciliationIssue } from '@/src/lib/reconciliation';
import type { Client, ClientPackage, Payment } from '@/src/types';

type Analysis = { rows: ReconciliationIssue[]; checkedAt: string };
// Authorization always precedes cache access, including when a manager's permissions change.
const cache = new Map<string, { expires: number; analysis: Promise<Analysis> }>();
function analyze(centerId: string) {
  const existing = cache.get(centerId);
  if (existing && existing.expires > Date.now()) return existing.analysis;
  const db = getAdminDb();
  const read = async (name: string, fields: string[]) => {
    const snapshot = await db.collection(name).where('centerId', '==', centerId).select(...fields).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  };
  const analysis = (async () => {
    const [clients, payments, packages, finance, reservations] = await Promise.all([
      read('clients', ['centerId', 'firstName', 'lastName', 'status']),
      read('payments', ['centerId', 'clientId', 'amount', 'date', 'receiptNumber', 'kind', 'status', 'historicalOnly', 'reportingExcluded', 'reversalOfPaymentId', 'reversedByPaymentId', 'clientPackageId']),
      read('client_packages', ['centerId', 'clientId', 'purchaseDate', 'totalSessions', 'sessionsRemaining', 'sourcePaymentId', 'status', 'historicalOnly']),
      readArchives(centerId, true), readArchives(centerId, false),
    ]);
    return { rows: buildReconciliation({ centerId, clients: clients as Client[], payments: payments as Payment[], packages: packages as ClientPackage[], finance, reservations }), checkedAt: new Date().toISOString() };
  })();
  if (cache.size >= 8) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 120_000, analysis };
  cache.set(centerId, entry);
  void analysis.catch(() => { if (cache.get(centerId) === entry) cache.delete(centerId); });
  return analysis;
}
export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['center_manager', 'super_admin']);
    assertFinancialAccess(actor);
    const body = await request.json();
    const centerId = typeof body.centerId === 'string' ? body.centerId.trim() : '';
    if (!centerId || centerId.length > 200 || centerId.includes('/') || (actor.role !== 'super_admin' && actor.centerId !== centerId)) throw new CrmAccessError('Centre non autorisé.', 403);
    for (const key of ['origin', 'problem', 'search']) if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 200)) throw new CrmAccessError('Filtre invalide.', 400);
    if (body.origin && !['current', 'legacy'].includes(body.origin)) throw new CrmAccessError('Origine invalide.', 400);
    if (body.problem && !Object.hasOwn(reconciliationLabels, body.problem)) throw new CrmAccessError('Contrôle invalide.', 400);
    const result = await analyze(centerId);
    const rows = filterReconciliation(result.rows, body);
    const pageSize = 30;
    const page = Math.max(1, Math.min(Math.ceil(rows.length / pageSize) || 1, Number.isSafeInteger(body.page) ? body.page : 1));
    return NextResponse.json({ ok: true, rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, checkedAt: result.checkedAt,
      scope: 'Paiements et forfaits CRM ; références clients et centres des archives financières et réservations. Ce contrôle ne constitue pas un audit exhaustif de la base.',
      counts: { current: result.rows.filter(r => r.origin === 'current').length, legacy: result.rows.filter(r => r.origin === 'legacy').length } },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
