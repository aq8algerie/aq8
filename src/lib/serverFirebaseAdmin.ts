/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Firebase Admin initialization helper for Next.js App Router API Routes
 * and standalone server environments.
 */

import { getApps, initializeApp, cert, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let cachedAdminApp: App | null = null;

export function getAdminApp(): App {
  if (cachedAdminApp) return cachedAdminApp;

  if (getApps().length > 0) {
    cachedAdminApp = getApp();
    return cachedAdminApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'aq8algerie-4f675';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    cachedAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Default application credentials / environment credentials fallback
    cachedAdminApp = initializeApp({
      projectId,
    });
  }

  return cachedAdminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuthInstance(): Auth {
  return getAuth(getAdminApp());
}
