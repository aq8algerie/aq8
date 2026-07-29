import 'server-only';
import { getAdminDb } from './serverFirebaseAdmin';
import { getPublicCenters } from './centerVisibility';
import { INITIAL_CENTERS, INITIAL_SETTINGS } from '../mockData';
import type { Center, GeneralSettings } from '../types';

const PUBLIC_DATA_TIMEOUT_MS = 4_000;

async function withPublicDataTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} unavailable after ${PUBLIC_DATA_TIMEOUT_MS}ms`)),
          PUBLIC_DATA_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getServerPublicCenters(): Promise<Center[]> {
  try {
    const snapshot = await withPublicDataTimeout(
      getAdminDb().collection('centers').get(),
      'Firestore centers',
    );
    const centers = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as Center));
    return getPublicCenters(centers);
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[public-centers] Firestore unavailable, using the bundled fallback.',
        error instanceof Error ? error.message : String(error),
      );
    }
    return getPublicCenters(INITIAL_CENTERS);
  }
}

export async function getServerPublicCenterBySlug(
  slug: string,
): Promise<Center | undefined> {
  const centers = await getServerPublicCenters();
  return centers.find(center => center.slug === slug);
}


export async function getServerPublicSettings(): Promise<GeneralSettings> {
  try {
    const snapshot = await withPublicDataTimeout(
      getAdminDb().collection('settings').doc('general').get(),
      'Firestore settings',
    );
    return snapshot.exists
      ? snapshot.data() as GeneralSettings
      : INITIAL_SETTINGS;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[public-settings] Firestore unavailable, using the bundled fallback.',
        error instanceof Error ? error.message : String(error),
      );
    }
    return INITIAL_SETTINGS;
  }
}
