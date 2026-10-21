import { NextResponse } from 'next/server';
import { readArchives } from '@/src/lib/serverLegacyArchives';
import { assertFinancialAccess, CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { filterLegacyHistory, summarizeLegacyHistory } from '@/src/lib/legacyHistory';

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
