import { NextResponse } from 'next/server';
import { getAdminAuthInstance } from '@/src/lib/serverFirebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail || rawEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir une adresse e-mail valide.' },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { ok: false, error: 'Le mot de passe doit contenir entre 8 et 128 caractères.' },
        { status: 400 }
      );
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const auth = getAdminAuthInstance();

    // 2. Check if a Firebase Auth user already exists for this email
    try {
      await auth.getUserByEmail(normalizedEmail);
      return NextResponse.json(
        {
          ok: false,
          error: 'Un compte utilisateur existe déjà pour cette adresse e-mail. Veuillez vous connecter ou réinitialiser votre mot de passe.',
        },
        { status: 400 }
      );
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error('[client-portal/register] Firebase check error:', error);
        throw error;
      }
    }

    // 3. Create the Firebase Auth user
    const displayName = 'Adhérent';
    await auth.createUser({
      email: normalizedEmail,
      password: password,
      displayName,
    });

    return NextResponse.json({
      ok: true,
      message: 'Compte créé. Vérifiez votre adresse e-mail pour accéder à votre fiche.',
    });
  } catch (error) {
    console.error('[client-portal/register] registration failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur serveur est survenue lors de la création de votre compte.' },
      { status: 500 }
    );
  }
}
