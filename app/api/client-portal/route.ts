import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';

function normalizePhoneDigits(phone: string): string {
  return String(phone || '').replace(/[^0-9]/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const cleanPhone = normalizePhoneDigits(rawPhone);

    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir un numéro de téléphone valide (ex: 0795 12 84 09).' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const digitsTarget = cleanPhone.slice(-8);

    // 1. Fetch all clients from Admin Firestore
    const clientsSnap = await db.collection('clients').get();
    const allClients: any[] = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const foundClient: any = allClients.find((cli: any) => {
      const cliPhone = normalizePhoneDigits(cli.phone || '');
      return cliPhone.slice(-8) === digitsTarget;
    }) || null;

    const clientIdToUse = foundClient?.id || null;

    // 2. Fetch appointments matching phone or client ID
    const apptSnap = await db.collection('appointments').get();
    const allAppts: any[] = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const appointments = allAppts
      .filter((appt: any) => {
        const apptPhone = normalizePhoneDigits(appt.clientPhone || appt.phone || '');
        const apptClientId = String(appt.clientId || '').trim();
        return (
          (clientIdToUse && apptClientId === String(clientIdToUse).trim()) ||
          (apptPhone && apptPhone.slice(-8) === digitsTarget)
        );
      })
      .sort((a: any, b: any) => {
        const dateA = `${a.date || a.bookingDate || ''} ${a.time || a.bookingTime || ''}`;
        const dateB = `${b.date || b.bookingDate || ''} ${b.time || b.bookingTime || ''}`;
        return dateB.localeCompare(dateA);
      });

    // 3. Fetch measurements if client exists
    let measurements: any[] = [];
    if (clientIdToUse) {
      const measSnap = await db.collection('measurements').where('clientId', '==', clientIdToUse).get();
      measurements = measSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
    }

    // 4. Fetch payments if client exists
    let payments: any[] = [];
    if (clientIdToUse) {
      const paySnap = await db.collection('payments').where('clientId', '==', clientIdToUse).get();
      payments = paySnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
    }

    // Fallback profile if appointments exist but no client profile document
    let resolvedClient: any = foundClient;
    if (!resolvedClient && appointments.length > 0) {
      const firstAppt: any = appointments[0];
      resolvedClient = {
        firstName: firstAppt.clientFirstName || firstAppt.firstName || 'Adhérent(e)',
        lastName: firstAppt.clientLastName || firstAppt.lastName || '',
        phone: rawPhone,
        centerName: firstAppt.centerName || 'Centre AQ8',
        totalSessions: appointments.length,
        status: 'Actif',
      };
    }

    if (!resolvedClient && appointments.length === 0) {
      return NextResponse.json({
        ok: false,
        notFound: true,
        error: 'Aucun compte ou rendez-vous trouvé avec ce numéro. Si vous êtes nouveau client, vous pouvez réserver votre 1ère séance ci-dessous.',
      });
    }

    return NextResponse.json({
      ok: true,
      client: resolvedClient,
      appointments,
      measurements,
      payments,
    });
  } catch (error) {
    console.error('[client-portal] fetch failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur serveur est survenue lors du chargement des données.' },
      { status: 500 }
    );
  }
}
