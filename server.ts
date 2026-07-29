import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import next from 'next';
import { getAdminDb } from './src/lib/serverFirebaseAdmin';
import { expirePendingBookingRequests } from './src/lib/serverBookingExpiration';

const PORT = Number(process.env.PORT || 3000);
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

function createLimiter(max: number, error: string) {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max,
    message: { ok: false, error },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

async function runBookingExpiration() {
  try {
    const count = await expirePendingBookingRequests(getAdminDb());
    if (count > 0) {
      console.info(`[Booking expiration] ${count} demande(s) expiree(s).`);
    }
  } catch (error) {
    console.error('[Booking expiration] Execution impossible:', error);
  }
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const publicApiLimiter = createLimiter(
    5,
    'Trop de requetes soumises depuis cette adresse IP. Veuillez reessayer dans une heure.',
  );
  app.use('/api/public-reservations', publicApiLimiter);
  app.use('/api/contact-messages', publicApiLimiter);

  const protectedMutationLimiter = createLimiter(
    60,
    "Trop d'operations sensibles. Reessayez plus tard.",
  );
  app.use('/api/upload-center-image', protectedMutationLimiter);
  app.use('/api/upload-blog-image', protectedMutationLimiter);
  app.use('/api/blog-posts', protectedMutationLimiter);
  app.use('/api/crm-managers', protectedMutationLimiter);
  app.use('/api/crm-operations', protectedMutationLimiter);
  app.use('/api/crm-clients', protectedMutationLimiter);
  app.use('/api/email-notifications/retry', protectedMutationLimiter);

  const nextApp = (next as any)({ dev: process.env.NODE_ENV !== 'production' });
  const nextHandler = nextApp.getRequestHandler();
  await nextApp.prepare();

  app.all('*', (request, response) => nextHandler(request, response));

  void runBookingExpiration();
  const cleanupTimer = setInterval(() => void runBookingExpiration(), CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();

  app.listen(PORT, '0.0.0.0', () => {
    console.info(`Server running at http://0.0.0.0:${PORT}`);
  });
}

void startServer();
