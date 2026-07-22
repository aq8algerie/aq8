/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dynamic sitemap for AQ8 Algérie.
 *
 * Strategy:
 * 1. Try to fetch live center data from Firestore (Firebase Admin SDK — server-side only)
 * 2. Fall back to static seed data from mockData.ts if Firestore is unavailable
 * 3. Filter hidden centers using shared centerVisibility rules
 */

import { INITIAL_CENTERS } from "../src/mockData";
import { getPublicCenters } from "../src/lib/centerVisibility";
import type { Center } from "../src/types";

/** Sitemap entry shape (mirrors Next.js SitemapEntry[] item) */
type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

const BASE_URL = "https://www.aq8algerie-dz.com";

/** Attempt to load live centers from Firestore using the Admin SDK */
async function fetchCentersFromFirestore(): Promise<Center[]> {
  try {
    const { getApps, initializeApp, cert, getApp } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    // Initialize admin app only once (singleton pattern)
    const adminApp =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({
              projectId:
                process.env.FIREBASE_ADMIN_PROJECT_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
                "aq8algerie-4f675",
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              // Replace literal \n (common in CI/hosting env vars)
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
          });

    const adminDb = getFirestore(adminApp);
    const snapshot = await adminDb.collection("centers").get();

    if (snapshot.empty) {
      console.warn("[sitemap] Firestore centers collection is empty — using fallback.");
      return [];
    }

    const centers: Center[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Center, "id">),
    }));

    console.info(`[sitemap] Fetched ${centers.length} centers from Firestore.`);
    return centers;
  } catch (error) {
    console.warn(
      "[sitemap] Firebase Admin SDK unavailable — using static fallback.",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

export default async function sitemap(): Promise<SitemapEntry[]> {
  // ─── 1. Static routes ──────────────────────────────────────────────────────
  const staticRoutes: SitemapEntry[] = [
    { url: `${BASE_URL}/`,            lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/centres`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/reservation`, lastModified: new Date(), changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE_URL}/aq8`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/wonder`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/a-propos`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/faq`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // ─── 2. Live Firestore data with static fallback ───────────────────────────
  let allCenters: Center[] = await fetchCentersFromFirestore();

  if (allCenters.length === 0) {
    console.info("[sitemap] Using INITIAL_CENTERS (static seed) as fallback.");
    allCenters = INITIAL_CENTERS;
  }

  // ─── 3. Filter to publicly visible centers with a valid slug ───────────────
  const publicCenters = getPublicCenters(allCenters).filter((c) => Boolean(c.slug));

  // ─── 4. One URL per public center detail page ──────────────────────────────
  const centerRoutes: SitemapEntry[] = publicCenters.map((center) => ({
    url: `${BASE_URL}/centres/${center.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const total = staticRoutes.length + centerRoutes.length;
  console.info(`[sitemap] ${staticRoutes.length} static + ${centerRoutes.length} centers = ${total} URLs total.`);

  return [...staticRoutes, ...centerRoutes];
}
