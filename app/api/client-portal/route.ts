import { NextResponse } from 'next/server';
import { getAdminAuthInstance, getAdminDb } from '@/src/lib/serverFirebaseAdmin';

import { calculateClientGamification } from '@/src/lib/gamification';
import { isOperationalCrmCenterStatus } from '@/src/lib/serverCrmAccess';

function publicRecord(document: { id: string; data(): Record<string, any> }, fields: string[]) {
  const data = document.data();
  return { ...Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]])), id: document.id };
}

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

    const authUser = await getAdminAuthInstance().getUser(decodedToken.uid);
    if (authUser.disabled || !authUser.emailVerified || !decodedToken.email_verified) {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_VERIFICATION_REQUIRED', error: 'Vérifiez votre adresse e-mail pour accéder à votre espace.' },
        { status: 403 },
      );
    }
    const email = authUser.email?.trim().toLowerCase();
    if (email !== decodedToken.email?.trim().toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Veuillez vous reconnecter.' }, { status: 401 });
    }
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

    const allMatchingClients = clientsSnap.docs.map(doc => ({ ...doc.data() as any, id: doc.id }));
    const activeClients = allMatchingClients.filter((cli: any) => !cli.status || cli.status === 'active');

    if (activeClients.length === 0) {
      return NextResponse.json(
        { ok: false, client: null, error: 'Votre profil adhérent a été archivé. Veuillez contacter votre centre.' },
        { status: 200 }
      );
    }

    if (activeClients.length !== 1) {
      return NextResponse.json({ ok: false, error: 'Plusieurs fiches utilisent cette adresse. Contactez votre centre pour les vérifier.' }, { status: 409 });
    }
    const foundClient = activeClients[0];
    const clientIdToUse = foundClient.id;
    const center = await db.collection('centers').doc(foundClient.centerId).get();
    if (!center.exists || !isOperationalCrmCenterStatus(center.data()?.status)) {
      return NextResponse.json({ ok: false, error: 'L’accès à ce centre est suspendu.' }, { status: 403 });
    }
    const ownCenter = (document: { data(): Record<string, any> }) => document.data().centerId === foundClient.centerId;

    const [apptSnap, measSnap, paySnap, pkgSnap] = await Promise.all(
      ['appointments', 'measurements', 'payments', 'client_packages'].map(collection =>
        db.collection(collection).where('clientId', '==', clientIdToUse).get(),
      ),
    );

    // 2. Fetch appointments matching client ID
    const appointments = apptSnap.docs.filter(ownCenter)
      .map(doc => publicRecord(doc, ['clientId', 'centerId', 'dateTime', 'date', 'time', 'bookingDate', 'bookingTime', 'duration', 'status', 'serviceId', 'service', 'serviceName', 'serviceType', 'completedAt']))
      .sort((a: any, b: any) => {
        const dateA = a.dateTime || `${a.date || a.bookingDate || ''} ${a.time || a.bookingTime || ''}`;
        const dateB = b.dateTime || `${b.date || b.bookingDate || ''} ${b.time || b.bookingTime || ''}`;
        return dateB.localeCompare(dateA);
      });

    // 3. Fetch measurements
    const measurements = measSnap.docs.filter(ownCenter)
      .map(doc => publicRecord(doc, ['clientId', 'centerId', 'date', 'createdAt', 'weight', 'bodyFat', 'muscleMass', 'chest', 'waist', 'hips', 'thighs']))
      .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

    // 4. Fetch payments
    const payments = paySnap.docs.filter(ownCenter)
      .map(doc => publicRecord(doc, ['clientId', 'centerId', 'packageId', 'amount', 'date', 'createdAt', 'method', 'receiptNumber', 'kind', 'status', 'reversalOfPaymentId']))
      .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

    // 5. Fetch client packages
    const clientPackages = pkgSnap.docs.filter(ownCenter)
      .map(doc => publicRecord(doc, ['clientId', 'centerId', 'packageId', 'name', 'packageName', 'sessionsRemaining', 'totalSessions', 'sessionsCount', 'purchaseDate', 'createdAt', 'activatedAt', 'status']))
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // 6. Calculate Gamification Stats
    const gamificationStats = calculateClientGamification(appointments, measurements);
    const publicClient = Object.fromEntries(
      ['id', 'firstName', 'lastName', 'email', 'phone', 'centerId', 'createdAt', 'status', 'gender', 'dob', 'avatarUrl']
        .filter(key => foundClient[key] !== undefined)
        .map(key => [key, foundClient[key]]),
    );
    const clientWithGamification = { ...publicClient, centerName: center.data()?.name || '', gamificationStats };

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
