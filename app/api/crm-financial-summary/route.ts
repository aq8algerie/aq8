import { NextResponse } from 'next/server';
import { isHistoricalRecord } from '@/src/lib/legacyHistory';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { assertFinancialAccess, CrmAccessError, getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';

export async function POST(request: Request) {
  try {
    const actor = await verifyServerCrmAccess(request, ['center_manager', 'super_admin']);
    assertFinancialAccess(actor);
    const body = await request.json();
    const centerId = typeof body.centerId === 'string' ? body.centerId.trim() : '';
    if (!centerId || (actor.role !== 'super_admin' && actor.centerId !== centerId)) {
      throw new CrmAccessError('Centre non autorisé.', 403);
    }
    const gender = body.gender ?? 'All';
    if (!['All', 'F', 'H'].includes(gender)) throw new CrmAccessError('Filtre invalide.', 400);
    const db = getAdminDb();
    const base = db.collection('payments').where('centerId', '==', centerId);
    let chunks: string[][] | null = null;
    if (gender !== 'All') {
      const clients = await db.collection('clients').where('centerId', '==', centerId).where('gender', '==', gender).select().get();
      chunks = [];
      for (let index = 0; index < clients.docs.length; index += 30) chunks.push(clients.docs.slice(index, index + 30).map(doc => doc.id));
    }
    const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const sum = async (start: string, end: string) => {
      const range = base.where('date', '>=', start).where('date', '<', end);
      const queries = chunks === null ? [range] : chunks.map(ids => range.where('clientId', 'in', ids));
      const totals = await Promise.all(queries.map(async query => {
        const snapshot = await query.select('amount', 'historicalOnly').get();
        return snapshot.docs.reduce((total, doc) => {
          const data = doc.data();
          return total + (isHistoricalRecord({ ...data, id: doc.id }) ? 0 : Number(data.amount) || 0);
        }, 0);
      }));
      return totals.reduce((total, value) => total + value, 0);
    };
    const now = new Date();
    const endMonth = now;
    const trendMonths = Array.from({ length: 6 }, (_, index) => new Date(endMonth.getFullYear(), endMonth.getMonth() - 5 + index, 1));
    const [month, year, previousMonth, trend] = await Promise.all([
      sum(key(now), key(new Date(now.getFullYear(), now.getMonth() + 1, 1))),
      sum(`${now.getFullYear()}-01-01`, `${now.getFullYear() + 1}-01-01`),
      sum(key(new Date(now.getFullYear(), now.getMonth() - 1, 1)), key(now)),
      Promise.all(trendMonths.map(async date => ({
        label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        value: await sum(key(date), key(new Date(date.getFullYear(), date.getMonth() + 1, 1))),
      }))),
    ]);
    return NextResponse.json({ ok: true, month, year, previousMonth, trend, scope: 'current_crm_excluding_legacy' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const resolved = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: resolved.message }, { status: resolved.status });
  }
}
