import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';
import { getCrmErrorResponse, verifyServerCrmAccess } from '@/src/lib/serverCrmAccess';
import { retryPendingCrmEmails } from '@/src/lib/serverNotificationOutbox';

export async function POST(request: Request) {
  try {
    await verifyServerCrmAccess(request, ['super_admin']);
    const result = await retryPendingCrmEmails(getAdminDb());
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const response = getCrmErrorResponse(error);
    return NextResponse.json({ ok: false, error: response.message }, { status: response.status });
  }
}
