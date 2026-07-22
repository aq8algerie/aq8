/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Next.js App Router API Route for Health Check
 * GET /api/health
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
}
