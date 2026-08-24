import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';
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
    const db = getAdminDb();
    const appUrl = (process.env.APP_URL || process.env.PUBLIC_APP_URL || 'https://aq8algerie.com').replace(/\/+$/, '');

    // 1. Check if Firebase Auth account already exists
    let user;
    let userExists = true;
    try {
      user = await auth.getUserByEmail(rawEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userExists = false;
      } else {
        console.error('[auth/reset-password] Firebase user fetch error:', error);
        throw error;
      }
    }

    // 2. Fetch client from database (if any)
    const clientsSnap = await db.collection('clients').where('email', '==', rawEmail).get();
    const isClient = !clientsSnap.empty;

    // 3. Handle user creation if client exists but doesn't have a Firebase account yet
    if (!userExists) {
      if (!isClient) {
        return NextResponse.json(
          { ok: false, error: "Cette adresse e-mail n'est pas enregistrée dans notre base d'adhérents. Veuillez contacter votre centre." },
          { status: 400 }
        );
      }

      const allMatchingClients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const activeClients = allMatchingClients.filter(cli => cli.status !== 'archived');

      if (activeClients.length === 0) {
        return NextResponse.json(
          { ok: false, error: 'Votre profil adhérent a été archivé. Veuillez contacter votre centre.' },
          { status: 400 }
        );
      }

      const clientDoc = activeClients[0];

      // Provision Firebase user automatically with a temporary random password
      const randomPassword = Math.random().toString(36).slice(-12) + 'aA1!';
      try {
        user = await auth.createUser({
          email: rawEmail,
          password: randomPassword,
          displayName: `${clientDoc.firstName || ''} ${clientDoc.lastName || ''}`.trim() || 'Adhérente',
        });
      } catch (createError) {
        console.error('[auth/reset-password] Auto-provisioning user failed:', createError);
        return NextResponse.json(
          { ok: false, error: 'Erreur lors de l\'initialisation de votre compte. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    }

    // 4. Generate secure action link with custom handler domain
    let rawResetLink;
    try {
      rawResetLink = await auth.generatePasswordResetLink(rawEmail, {
        url: isClient ? `${appUrl}/client` : `${appUrl}/crm`,
      });
    } catch (linkError) {
      console.error('[auth/reset-password] Generate link failed:', linkError);
      return NextResponse.json({
        ok: true,
        emailSent: false,
        useFirebaseFallback: true,
        message: 'Impossible de générer le lien personnalisé, basculement vers Firebase Auth.',
      });
    }

    // Transform link to point to custom app frontend route if needed
    const urlObj = new URL(rawResetLink);
    const oobCode = urlObj.searchParams.get('oobCode');
    const customResetUrl = oobCode
      ? `${appUrl}/auth/reset-password?oobCode=${oobCode}${isClient ? '&role=client' : ''}`
      : rawResetLink;

    // 5. Send branded luxury email via Resend API
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

    return NextResponse.json({
      ok: true,
      emailSent: true,
      message: 'Un e-mail de réinitialisation vous a été envoyé.',
    });
  } catch (error) {
    console.error('[auth/reset-password] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur serveur est survenue lors de la réinitialisation.' },
      { status: 500 }
    );
  }
}
