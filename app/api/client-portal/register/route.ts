import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir une adresse e-mail valide.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const db = getAdminDb();
    const auth = getAdminAuthInstance();

    // 1. Check if email exists in clients Firestore collection
    const clientsSnap = await db.collection('clients').where('email', '==', normalizedEmail).get();
    if (clientsSnap.empty) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cet e-mail n'est pas enregistré dans notre base d'adhérents. Veuillez contacter votre centre pour l'ajouter à votre fiche.",
        },
        { status: 400 }
      );
    }

    const allMatchingClients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const activeClients = allMatchingClients.filter(cli => cli.status !== 'archived');

    if (activeClients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Votre profil adhérent a été archivé. Veuillez contacter votre centre.',
        },
        { status: 400 }
      );
    }

    const clientDoc = activeClients[0];

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
    const displayName = `${clientDoc.firstName || ''} ${clientDoc.lastName || ''}`.trim() || 'Adhérente';
    await auth.createUser({
      email: normalizedEmail,
      password: password,
      displayName,
    });

    return NextResponse.json({
      ok: true,
      message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
    });
  } catch (error) {
    console.error('[client-portal/register] registration failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur serveur est survenue lors de la création de votre compte.' },
      { status: 500 }
    );
  }
}
