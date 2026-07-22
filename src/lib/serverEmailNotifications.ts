import type { Firestore } from 'firebase-admin/firestore';
import type {
  Appointment,
  BookingRequest,
  Center,
  Client,
  ClientPackage,
  Package,
  Payment,
  Service,
} from '../types';
import type { PublicBookingRequestInput, PublicContactMessageInput, PublicContactRequestType } from './publicFormValidation';

type EmailResult = {
  sent: boolean;
  skipped?: string;
  error?: string;
};

type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type CrmEmailNotificationPayload =
  | { type: 'booking_request_accepted'; centerId: string; requestId: string; appointmentId?: string }
  | { type: 'booking_request_rejected'; centerId: string; requestId: string }
  | { type: 'appointment_booked'; centerId: string; appointmentId: string }
  | { type: 'appointment_updated'; centerId: string; appointmentId: string }
  | { type: 'appointment_cancelled'; centerId: string; appointmentId: string }
  | { type: 'appointment_completed'; centerId: string; appointmentId: string; sessionsRemaining?: number }
  | { type: 'package_assigned'; centerId: string; clientPackageId: string }
  | { type: 'payment_recorded'; centerId: string; paymentId: string; clientPackageId?: string };

const BRAND_NAME = 'AQ8 Algérie';
const BRAND_COLOR = '#ff5757';
const DARK_COLOR = '#242424';

function getEmailConfig() {
  const apiKey = (process.env.RESEND_API_KEY || process.env.EMAIL_RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'AQ8 Algérie <notifications@aq8algerie-dz.com>').trim();
  const replyTo = (process.env.EMAIL_REPLY_TO || process.env.ADMIN_NOTIFICATION_EMAILS || 'notifications@aq8algerie-dz.com').split(',')[0].trim();
  const adminRecipients = splitEmails(
    process.env.ADMIN_NOTIFICATION_EMAILS ||
    process.env.AQ8_NOTIFICATION_EMAILS ||
    process.env.CONTACT_EMAIL ||
    'notifications@aq8algerie-dz.com'
  );
  const appUrl = (process.env.APP_URL || process.env.PUBLIC_APP_URL || 'https://aq8algerie.com').replace(/\/+$/, '');
  const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
  const adminCopiesEnabled = process.env.EMAIL_ADMIN_COPIES_ENABLED === 'true';

  return { apiKey, from, replyTo, adminRecipients, appUrl, enabled, adminCopiesEnabled };
}

function splitEmails(value: string): string[] {
  return value
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueEmails(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const value of values) {
    const email = String(value || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string): string {
  if (!value) return 'Date à confirmer';
  const normalized = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function formatTime(value?: string): string {
  if (!value) return 'Horaire à confirmer';
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const time = value.split('T')[1];
  return time ? time.slice(0, 5) : value;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Date et horaire à confirmer';
  const [date, time] = value.split('T');
  return `${formatDate(date)} à ${formatTime(time)}`;
}

function formatDzd(amount?: number): string {
  return `${Number(amount || 0).toLocaleString('fr-DZ')} DZD`;
}

function serviceLabel(service?: string): string {
  const value = String(service || '').toLowerCase();
  if (value === 'aq8') return 'AQ8 EMS';
  if (value === 'wonder') return 'Wonder Sculpt';
  return service || 'Prestation AQ8';
}

function clientName(client?: Pick<Client, 'firstName' | 'lastName' | 'email' | 'phone'> | null): string {
  const fullName = `${client?.firstName || ''} ${client?.lastName || ''}`.trim();
  return fullName || client?.email || client?.phone || 'Client AQ8';
}

function rowsToHtml(rows: Array<[string, unknown]>): string {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:14px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:800;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');
}

function rowsToText(rows: Array<[string, unknown]>): string {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

function emailLayout(params: {
  eyebrow: string;
  title: string;
  intro: string;
  rows?: Array<[string, unknown]>;
  note?: string;
  cta?: { label: string; href: string };
}) {
  const rows = params.rows || [];
  const cta = params.cta ? `
    <div style="margin-top:28px;text-align:center;">
      <a href="${escapeHtml(params.cta.href)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:900;">
        ${escapeHtml(params.cta.label)}
      </a>
    </div>
  ` : '';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;background:#f7f7f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="max-width:640px;margin:28px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
          <div style="background:${DARK_COLOR};padding:28px 32px;border-bottom:4px solid ${BRAND_COLOR};">
            <div style="color:#ffffff;font-size:22px;font-weight:900;">${BRAND_NAME}</div>
            <div style="margin-top:8px;color:#fca5a5;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(params.eyebrow)}</div>
          </div>
          <div style="padding:32px;">
            <h1 style="margin:0 0 14px;color:#111827;font-size:24px;line-height:1.25;">${escapeHtml(params.title)}</h1>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">${escapeHtml(params.intro)}</p>
            ${rows.length > 0 ? `<table style="width:100%;border-collapse:collapse;margin:0 0 22px;">${rowsToHtml(rows)}</table>` : ''}
            ${params.note ? `<div style="border:1px solid #fee2e2;background:#fff7f7;border-radius:14px;padding:16px;color:#7f1d1d;font-size:13px;line-height:1.6;">${escapeHtml(params.note)}</div>` : ''}
            ${cta}
          </div>
          <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;color:#64748b;font-size:12px;line-height:1.55;">
            Message automatique AQ8 Algérie. Pour toute question, répondez directement à cet e-mail ou contactez votre centre.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    `${BRAND_NAME} - ${params.eyebrow}`,
    '',
    params.title,
    params.intro,
    rows.length > 0 ? rowsToText(rows) : '',
    params.note || '',
    params.cta ? `${params.cta.label}: ${params.cta.href}` : '',
  ].filter(Boolean).join('\n\n');

  return { html, text };
}

async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const config = getEmailConfig();
  const to = uniqueEmails(message.to);

  if (!config.enabled) return { sent: false, skipped: 'disabled' };
  if (!config.apiKey) return { sent: false, skipped: 'missing_resend_api_key' };
  if (!config.from) return { sent: false, skipped: 'missing_sender' };
  if (to.length === 0) return { sent: false, skipped: 'missing_recipient' };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const error = `Resend ${response.status}: ${body || response.statusText}`;
      console.error('[email] send failed:', error);
      return { sent: false, error };
    }

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[email] send failed:', error);
    return { sent: false, error: message };
  }
}

export function getEmailNotificationDiagnostics() {
  const config = getEmailConfig();
  const fromDomain = config.from.match(/@([^>\s]+)/)?.[1] || null;

  return {
    enabled: config.enabled,
    hasResendApiKey: Boolean(config.apiKey),
    fromConfigured: Boolean(config.from),
    fromDomain,
    replyToConfigured: Boolean(config.replyTo),
    adminCopiesEnabled: config.adminCopiesEnabled,
    adminRecipientsCount: config.adminCopiesEnabled ? config.adminRecipients.length : 0,
    appUrl: config.appUrl,
  };
}

function centerRecipients(center?: Center | null): string[] {
  return uniqueEmails([center?.email]);
}

function adminRecipients(excluding: string[] = []): string[] {
  const config = getEmailConfig();
  if (!config.adminCopiesEnabled) return [];
  const excluded = new Set(excluding.map(email => email.toLowerCase()));
  return config.adminRecipients.filter(email => !excluded.has(email));
}

async function getDoc<T>(db: Firestore, collectionName: string, id: string): Promise<T | null> {
  if (!id) return null;
  const snapshot = await db.collection(collectionName).doc(id).get();
  return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
}

async function getCenter(db: Firestore, centerId: string): Promise<Center | null> {
  return getDoc<Center>(db, 'centers', centerId);
}

async function getService(db: Firestore, serviceId: string): Promise<Service | null> {
  return getDoc<Service>(db, 'services', serviceId);
}

async function getClient(db: Firestore, clientId: string): Promise<Client | null> {
  return getDoc<Client>(db, 'clients', clientId);
}

async function getPackage(db: Firestore, packageId: string): Promise<Package | null> {
  return getDoc<Package>(db, 'packages', packageId);
}

async function getClientPackage(db: Firestore, clientPackageId: string): Promise<ClientPackage | null> {
  return getDoc<ClientPackage>(db, 'client_packages', clientPackageId);
}

async function getAppointmentBundle(db: Firestore, appointmentId: string, centerId: string) {
  const appointment = await getDoc<Appointment>(db, 'appointments', appointmentId);
  if (!appointment || appointment.centerId !== centerId) return null;

  const [center, client, service] = await Promise.all([
    getCenter(db, centerId),
    getClient(db, appointment.clientId),
    getService(db, appointment.serviceId),
  ]);

  return { appointment, center, client, service };
}

export async function sendPublicReservationNotifications(params: {
  center: Center;
  input: PublicBookingRequestInput;
  reservationId: string;
}): Promise<EmailResult[]> {
  const { center, input, reservationId } = params;
  const config = getEmailConfig();
  const shortRef = reservationId.slice(0, 8).toUpperCase();
  const rows: Array<[string, unknown]> = [
    ['Référence', shortRef],
    ['Centre', center.name],
    ['Client', `${input.firstName} ${input.lastName}`.trim()],
    ['Téléphone', input.phone],
    ['E-mail', input.email || 'Non renseigné'],
    ['Prestation', serviceLabel(input.service)],
    ['Date souhaitée', formatDate(input.bookingDate)],
    ['Heure', input.bookingTime],
  ];

  const adminTemplate = emailLayout({
    eyebrow: 'Nouvelle pré-réservation',
    title: 'Un client vient de pré-réserver un créneau.',
    intro: 'La demande est disponible dans le CRM du centre. Le créneau est bloqué en attente de validation par le manager.',
    rows,
    cta: { label: 'Ouvrir les pré-réservations', href: `${config.appUrl}/crm` },
  });

  const clientTemplate = emailLayout({
    eyebrow: 'Pré-réservation reçue',
    title: `Bonjour ${input.firstName}, votre créneau est bien pré-réservé.`,
    intro: "L'équipe du centre va vérifier le planning et vous recontactera pour confirmer définitivement le rendez-vous.",
    rows,
    note: "La confirmation finale reste faite par l'équipe du centre après vérification du planning et du paiement.",
  });

  const centerTo = centerRecipients(center);
  const results = await Promise.all([
    sendEmail({
      to: centerTo,
      replyTo: input.email || config.replyTo,
      subject: `Nouvelle pré-réservation AQ8 - ${center.name} - ${shortRef}`,
      ...adminTemplate,
    }),
    sendEmail({
      to: adminRecipients(centerTo),
      replyTo: input.email || config.replyTo,
      subject: `Copie admin - Nouvelle pré-réservation AQ8 - ${center.name} - ${shortRef}`,
      ...adminTemplate,
    }),
    sendEmail({
      to: uniqueEmails([input.email]),
      replyTo: center.email || config.replyTo,
      subject: `Votre pré-réservation AQ8 - ${center.name} - ${shortRef}`,
      ...clientTemplate,
    }),
  ]);

  return results;
}

export async function sendPublicContactNotifications(params: {
  center?: Center | null;
  messageId: string;
  message: PublicContactMessageInput & { requestType: PublicContactRequestType };
}): Promise<EmailResult[]> {
  const config = getEmailConfig();
  const { center, message, messageId } = params;
  const shortRef = messageId.slice(0, 8).toUpperCase();
  const requestTypeLabels: Record<PublicContactRequestType, string> = {
    general: 'Question générale',
    reservation: 'Demande liée à une réservation',
    partnership: 'Partenariat / franchise',
    recruitment: 'Recrutement',
  };
  const rows: Array<[string, unknown]> = [
    ['Référence', shortRef],
    ['Nom', message.name],
    ['Téléphone', message.phone],
    ['E-mail', message.email || 'Non renseigné'],
    ['Objet', requestTypeLabels[message.requestType]],
    ['Centre', center?.name || (message.centerId === 'general' ? 'Demande générale' : message.centerId)],
    ['Message', message.message || 'Non renseigné'],
  ];

  const adminTemplate = emailLayout({
    eyebrow: 'Nouveau message public',
    title: 'Un nouveau message vient du site AQ8 Algérie.',
    intro: "Le message est enregistré dans Firestore et peut être traité par l'équipe.",
    rows,
    cta: { label: 'Ouvrir le CRM', href: `${config.appUrl}/crm` },
  });

  const clientTemplate = emailLayout({
    eyebrow: 'Message reçu',
    title: `Merci ${message.name}, votre message est bien reçu.`,
    intro: "L'équipe AQ8 Algérie reviendra vers vous selon la nature de votre demande.",
    rows: rows.filter(([label]) => label !== 'Message'),
  });

  return Promise.all([
    sendEmail({
      to: centerRecipients(center),
      replyTo: message.email || config.replyTo,
      subject: `Nouveau message AQ8 - ${requestTypeLabels[message.requestType]} - ${shortRef}`,
      ...adminTemplate,
    }),
    sendEmail({
      to: adminRecipients(centerRecipients(center)),
      replyTo: message.email || config.replyTo,
      subject: `Copie admin - Nouveau message AQ8 - ${requestTypeLabels[message.requestType]} - ${shortRef}`,
      ...adminTemplate,
    }),
    sendEmail({
      to: uniqueEmails([message.email]),
      replyTo: center?.email || config.replyTo,
      subject: `Votre message AQ8 Algérie - ${shortRef}`,
      ...clientTemplate,
    }),
  ]);
}

async function sendAppointmentEmail(db: Firestore, payload: Extract<CrmEmailNotificationPayload, { appointmentId: string }>): Promise<EmailResult> {
  const bundle = await getAppointmentBundle(db, payload.appointmentId, payload.centerId);
  if (!bundle || !bundle.client) return { sent: false, skipped: 'appointment_or_client_not_found' };

  const { appointment, center, client, service } = bundle;
  const config = getEmailConfig();
  const rows: Array<[string, unknown]> = [
    ['Centre', center?.name || appointment.centerId],
    ['Client', clientName(client)],
    ['Prestation', service?.name || serviceLabel(service?.type)],
    ['Date et heure', formatDateTime(appointment.dateTime)],
    ['Durée', `${appointment.duration} min`],
  ];

  const copy = {
    appointment_booked: {
      eyebrow: 'Rendez-vous confirmé',
      title: 'Votre séance AQ8 est planifiée.',
      intro: "Votre rendez-vous a été ajouté au planning du centre. Merci de vous présenter quelques minutes avant l'heure indiquée.",
      subject: 'Confirmation de votre séance AQ8',
      note: center?.cancellationRule || undefined,
    },
    appointment_updated: {
      eyebrow: 'Rendez-vous mis à jour',
      title: 'Votre rendez-vous AQ8 a été modifié.',
      intro: 'Voici les nouvelles informations de votre séance.',
      subject: 'Mise à jour de votre rendez-vous AQ8',
      note: center?.cancellationRule || undefined,
    },
    appointment_cancelled: {
      eyebrow: 'Rendez-vous annulé',
      title: 'Votre séance AQ8 a été annulée.',
      intro: "Le créneau n'est plus réservé. Vous pouvez contacter votre centre pour choisir une nouvelle date.",
      subject: 'Annulation de votre séance AQ8',
      note: undefined,
    },
    appointment_completed: {
      eyebrow: 'Séance validée',
      title: 'Votre séance AQ8 est bien validée.',
      intro: payload.type === 'appointment_completed' && typeof payload.sessionsRemaining === 'number'
        ? `Un crédit a été déduit de votre forfait. Il vous reste ${payload.sessionsRemaining} séance(s).`
        : 'Un crédit a été déduit de votre forfait.',
      subject: 'Séance AQ8 validée',
      note: undefined,
    },
  }[payload.type];

  const template = emailLayout({
    eyebrow: copy.eyebrow,
    title: copy.title,
    intro: copy.intro,
    rows,
    note: copy.note,
  });

  return sendEmail({
    to: uniqueEmails([client.email]),
    replyTo: center?.email || config.replyTo,
    subject: `${copy.subject} - ${formatDateTime(appointment.dateTime)}`,
    ...template,
  });
}

async function sendBookingRequestDecisionEmail(db: Firestore, payload: Extract<CrmEmailNotificationPayload, { requestId: string }>): Promise<EmailResult> {
  const request = await getDoc<BookingRequest>(db, 'booking_requests', payload.requestId);
  if (!request || request.centerId !== payload.centerId) return { sent: false, skipped: 'booking_request_not_found' };
  const center = await getCenter(db, payload.centerId);
  const isAccepted = payload.type === 'booking_request_accepted';
  const rows: Array<[string, unknown]> = [
    ['Centre', center?.name || request.centerName],
    ['Client', `${request.firstName} ${request.lastName}`.trim()],
    ['Prestation', serviceLabel(request.service)],
    ['Date', formatDate(request.bookingDate)],
    ['Heure', request.bookingTime],
  ];

  const template = emailLayout({
    eyebrow: isAccepted ? 'Réservation confirmée' : 'Pré-réservation refusée',
    title: isAccepted
      ? 'Votre rendez-vous AQ8 est confirmé.'
      : "Votre demande de réservation n'a pas pu être confirmée.",
    intro: isAccepted
      ? "Le centre a validé votre demande. Votre créneau est maintenant inscrit au planning."
      : "Le créneau demandé n'est plus disponible ou ne peut pas être confirmé. Contactez le centre pour choisir une autre disponibilité.",
    rows,
    note: isAccepted ? center?.cancellationRule : undefined,
  });

  return sendEmail({
    to: uniqueEmails([request.email]),
    replyTo: center?.email || getEmailConfig().replyTo,
    subject: isAccepted ? 'Confirmation de votre réservation AQ8' : 'Suite à votre demande de réservation AQ8',
    ...template,
  });
}

async function sendPackageAssignedEmail(db: Firestore, payload: Extract<CrmEmailNotificationPayload, { type: 'package_assigned' }>): Promise<EmailResult> {
  const clientPackage = await getClientPackage(db, payload.clientPackageId);
  if (!clientPackage || clientPackage.centerId !== payload.centerId) return { sent: false, skipped: 'client_package_not_found' };

  const [center, client, pack] = await Promise.all([
    getCenter(db, payload.centerId),
    getClient(db, clientPackage.clientId),
    getPackage(db, clientPackage.packageId),
  ]);
  if (!client) return { sent: false, skipped: 'client_not_found' };

  const template = emailLayout({
    eyebrow: 'Forfait activé',
    title: 'Votre forfait AQ8 est actif.',
    intro: "Votre forfait est maintenant disponible dans votre centre. Vous pouvez planifier vos séances avec l'équipe.",
    rows: [
      ['Centre', center?.name || payload.centerId],
      ['Client', clientName(client)],
      ['Forfait', pack?.name || clientPackage.packageId],
      ['Sessions', `${clientPackage.sessionsRemaining} / ${clientPackage.totalSessions}`],
      ['Date d\'activation', formatDate(clientPackage.purchaseDate)],
    ],
  });

  return sendEmail({
    to: uniqueEmails([client.email]),
    replyTo: center?.email || getEmailConfig().replyTo,
    subject: `Votre forfait AQ8 est activé - ${pack?.name || 'AQ8'}`,
    ...template,
  });
}

async function sendPaymentRecordedEmail(db: Firestore, payload: Extract<CrmEmailNotificationPayload, { type: 'payment_recorded' }>): Promise<EmailResult> {
  const payment = await getDoc<Payment>(db, 'payments', payload.paymentId);
  if (!payment || payment.centerId !== payload.centerId) return { sent: false, skipped: 'payment_not_found' };

  const [center, client, pack, clientPackage] = await Promise.all([
    getCenter(db, payload.centerId),
    getClient(db, payment.clientId),
    getPackage(db, payment.packageId),
    payload.clientPackageId ? getClientPackage(db, payload.clientPackageId) : Promise.resolve(null),
  ]);
  if (!client) return { sent: false, skipped: 'client_not_found' };

  const hasActivation = Boolean(clientPackage);
  const template = emailLayout({
    eyebrow: hasActivation ? 'Paiement reçu et forfait activé' : 'Paiement reçu',
    title: hasActivation ? 'Votre paiement est enregistré et votre forfait est actif.' : 'Votre paiement est bien enregistré.',
    intro: 'Voici le récapitulatif de votre règlement AQ8.',
    rows: [
      ['Centre', center?.name || payload.centerId],
      ['Client', clientName(client)],
      ['Forfait', pack?.name || payment.packageId],
      ['Montant', formatDzd(payment.amount)],
      ['Mode', payment.method],
      ['Référence reçu', payment.receiptNumber || payment.id],
      ['Date', formatDate(payment.date)],
      ['Sessions activées', clientPackage ? `${clientPackage.sessionsRemaining} / ${clientPackage.totalSessions}` : undefined],
    ],
  });

  return sendEmail({
    to: uniqueEmails([client.email]),
    replyTo: center?.email || getEmailConfig().replyTo,
    subject: hasActivation ? 'Paiement reçu et forfait AQ8 activé' : 'Paiement AQ8 reçu',
    ...template,
  });
}

export async function sendCrmEmailNotification(db: Firestore, payload: CrmEmailNotificationPayload): Promise<EmailResult> {
  switch (payload.type) {
    case 'booking_request_accepted':
    case 'booking_request_rejected':
      return sendBookingRequestDecisionEmail(db, payload);
    case 'appointment_booked':
    case 'appointment_updated':
    case 'appointment_cancelled':
    case 'appointment_completed':
      return sendAppointmentEmail(db, payload);
    case 'package_assigned':
      return sendPackageAssignedEmail(db, payload);
    case 'payment_recorded':
      return sendPaymentRecordedEmail(db, payload);
    default:
      return { sent: false, skipped: 'unknown_notification_type' };
  }
}
