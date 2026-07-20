/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Schema mapping for sitemap dynamically (for Next.js App Router migration)
import { getCenters } from '../lib/centers';

export default async function sitemap() {
  const baseUrl = 'https://www.aq8algerie-dz.com';

  // Static routes
  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/a-propos`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/aq8`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/wonder`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/centres`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
  ];

  // Dynamic Center routes based on our data
  const centers = getCenters();
  const dynamicCenterRoutes = centers.map((center) => ({
    url: `${baseUrl}/centres/${center.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...dynamicCenterRoutes];
}
