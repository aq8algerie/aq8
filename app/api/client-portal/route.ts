import { NextResponse } from 'next/server';
import { getAdminDb } from '@/src/lib/serverFirebaseAdmin';

function formatInternationalPhone(phone: string): { full: string; digits9: string; isFrench: boolean } {
  const trimmed = String(phone || '').trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');

  if (trimmed.startsWith('+33') || (digitsOnly.startsWith('33') && digitsOnly.length >= 11)) {
    const mainDigits = digitsOnly.startsWith('33') ? digitsOnly.slice(2) : digitsOnly;
    return { full: `+33${mainDigits}`, digits9: mainDigits.slice(-9), isFrench: true };
  }

  // Algerian default: starting with 05, 06, 07 or +213
  let mainDigits = digitsOnly;
  if (digitsOnly.startsWith('213')) {
    mainDigits = digitsOnly.slice(3);
  }
  if (mainDigits.startsWith('0')) {
    mainDigits = mainDigits.slice(1);
  }

  return { full: `+213${mainDigits}`, digits9: mainDigits.slice(-9), isFrench: false };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const pinInput = typeof body.pin === 'string' ? body.pin.trim() : '';

    if (!rawPhone || rawPhone.replace(/[^0-9]/g, '').length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir un numéro de téléphone valide (ex: 0795 12 84 09 ou +213 795...).' },
        { status: 400 }
      );
    }

    const parsedInput = formatInternationalPhone(rawPhone);
    const db = getAdminDb();

    // 1. Fetch all clients from Admin Firestore
    const clientsSnap = await db.collection('clients').get();
    const allClients: any[] = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const foundClient: any = allClients.find((cli: any) => {
      if (!cli.phone) return false;
      const parsedCli = formatInternationalPhone(cli.phone);
      // Exact international match or 9-digit match if same country type
      if (parsedCli.full === parsedInput.full) return true;
      return parsedCli.digits9 === parsedInput.digits9 && parsedCli.isFrench === parsedInput.isFrench;
    }) || null;

    // Security PIN verification if client has a security PIN configured
    if (foundClient && foundClient.pin) {
      if (!pinInput) {
        return NextResponse.json({
          ok: false,
          requiresPin: true,
          error: 'Un code PIN de sécurité à 4 chiffres est configuré pour ce compte. Veuillez le saisir.',
        });
      }
      if (String(foundClient.pin).trim() !== pinInput) {
        return NextResponse.json({
          ok: false,
          requiresPin: true,
          error: 'Code PIN de sécurité incorrect. Veuillez vérifier auprès de votre centre.',
        }, { status: 401 });
      }
    }

    const clientIdToUse = foundClient?.id || null;

    // 2. Fetch appointments matching phone or client ID
    const apptSnap = await db.collection('appointments').get();
    const allAppts: any[] = apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const appointments = allAppts
      .filter((appt: any) => {
        const rawApptPhone = appt.clientPhone || appt.phone || '';
        const apptClientId = String(appt.clientId || '').trim();
        if (clientIdToUse && apptClientId === String(clientIdToUse).trim()) return true;
        if (!rawApptPhone) return false;
        const parsedAppt = formatInternationalPhone(rawApptPhone);
        return (
          parsedAppt.full === parsedInput.full ||
          (parsedAppt.digits9 === parsedInput.digits9 && parsedAppt.isFrench === parsedInput.isFrench)
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
