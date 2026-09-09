import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';

import { calculateClientGamification } from '@/src/lib/gamification';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
      return NextResponse.json(
        { ok: false, error: 'Authentification requise.' },
        { status: 401 }
      );
    }

    const idToken = match[1];
    let decodedToken;
    try {
      decodedToken = await getAdminAuthInstance().verifyIdToken(idToken, true);
    } catch (err) {
      console.warn('[client-portal] token verification failed:', err);
      return NextResponse.json(
        { ok: false, error: 'Session expirée ou jeton invalide. Veuillez vous reconnecter.' },
        { status: 401 }
      );
    }

    const email = decodedToken.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Email non trouvé dans les informations de connexion.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 1. Fetch client matching email from Admin Firestore
    const clientsSnap = await db.collection('clients').where('email', '==', email).get();
    if (clientsSnap.empty) {
      return NextResponse.json(
        { ok: false, client: null, error: 'Aucun profil adhérent trouvé pour cet e-mail. Veuillez contacter votre centre.' },
        { status: 200 }
      );
    }

    const allMatchingClients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const activeClients = allMatchingClients.filter((cli: any) => cli.status !== 'archived');

    if (activeClients.length === 0) {
      return NextResponse.json(
        { ok: false, client: null, error: 'Votre profil adhérent a été archivé. Veuillez contacter votre centre.' },
        { status: 200 }
      );
    }

    const foundClient = activeClients[0];
    const clientIdToUse = foundClient.id;

    // 2. Fetch appointments matching client ID
    const apptSnap = await db.collection('appointments').where('clientId', '==', clientIdToUse).get();
    const appointments = apptSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const dateA = `${a.date || a.bookingDate || ''} ${a.time || a.bookingTime || ''}`;
        const dateB = `${b.date || b.bookingDate || ''} ${b.time || b.bookingTime || ''}`;
        return dateB.localeCompare(dateA);
      });

    // 3. Fetch measurements
    const measSnap = await db.collection('measurements').where('clientId', '==', clientIdToUse).get();
    const measurements = measSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

    // 4. Fetch payments
    const paySnap = await db.collection('payments').where('clientId', '==', clientIdToUse).get();
    const payments = paySnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

    // 5. Fetch client packages
    const pkgSnap = await db.collection('clientPackages').where('clientId', '==', clientIdToUse).get();
    const clientPackages = pkgSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // 6. Calculate Gamification Stats
    const gamificationStats = calculateClientGamification(appointments, measurements);
    const clientWithGamification = { ...foundClient, gamificationStats };

    return NextResponse.json({
      ok: true,
      client: clientWithGamification,
      appointments,
      measurements,
      payments,
      clientPackages,
      gamificationStats,
    });
  } catch (error) {
    console.error('[client-portal] fetch failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur serveur est survenue lors du chargement des données.' },
      { status: 500 }
    );
  }
}
