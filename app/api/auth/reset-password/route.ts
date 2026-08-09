import { NextResponse } from 'next/server';
import { getAdminAuthInstance } from '@/src/lib/serverFirebaseAdmin';
import { sendCustomPasswordResetEmail } from '@/src/lib/serverEmailNotifications';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir une adresse e-mail valide.' },
        { status: 400 }
      );
    }

    const auth = getAdminAuthInstance();
    const appUrl = (process.env.APP_URL || process.env.PUBLIC_APP_URL || 'https://aq8algerie.com').replace(/\/+$/, '');

    try {
      const user = await auth.getUserByEmail(rawEmail);

      // Generate secure action link with custom handler domain
      const rawResetLink = await auth.generatePasswordResetLink(rawEmail, {
        url: `${appUrl}/auth/reset-password`,
      });

      // Transform link to point to custom app frontend route if needed
      const urlObj = new URL(rawResetLink);
      const oobCode = urlObj.searchParams.get('oobCode');
      const customResetUrl = oobCode
        ? `${appUrl}/auth/reset-password?oobCode=${oobCode}`
        : rawResetLink;

      // Send branded luxury email via Resend API
      const emailResult = await sendCustomPasswordResetEmail({
        email: rawEmail,
        name: user.displayName || undefined,
        resetLink: customResetUrl,
      });

      if (!emailResult.sent) {
        console.warn('[auth/reset-password] Custom email skipped or failed:', emailResult);
        return NextResponse.json({
          ok: true,
          emailSent: false,
          useFirebaseFallback: true,
          message: 'Service d\'e-mail personnalisé non disponible, basculement vers Firebase Auth.',
        });
      }
    } catch (error) {
      console.warn('[auth/reset-password] Request for email:', rawEmail, error);
      return NextResponse.json({
        ok: true,
        emailSent: false,
        useFirebaseFallback: true,
      });
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      message: 'Un e-mail de réinitialisation vous a été envoyé.',
    });
  } catch (error) {
    console.error('[auth/reset-password] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, useFirebaseFallback: true, error: 'Une erreur serveur est survenue.' },
      { status: 500 }
    );
  }
}
