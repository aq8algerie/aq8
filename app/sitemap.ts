import { getServerPublicCenters } from '../src/lib/serverPublicData';
import { getServerPublishedBlogPosts } from '../src/lib/serverBlogData';

type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

const BASE_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.aq8algerie-dz.com')
  .replace(/\/+$/, '');

export const revalidate = 3600;

export default async function sitemap(): Promise<SitemapEntry[]> {
  const now = new Date();
  const staticRoutes: SitemapEntry[] = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/centres`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/reservation`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/aq8`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/wonder`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/a-propos`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/conseils`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/politique-de-confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/conditions-generales-de-vente`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
  const centers = await getServerPublicCenters();
  const posts = await getServerPublishedBlogPosts();
  const centerRoutes: SitemapEntry[] = centers
    .filter(center => Boolean(center.slug))
    .map(center => ({
      url: `${BASE_URL}/centres/${center.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

  const blogRoutes: SitemapEntry[] = posts.map(post => ({
    url: `${BASE_URL}/conseils/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || now,
    changeFrequency: 'monthly',
    priority: post.featured ? 0.8 : 0.7,
  }));

  return [...staticRoutes, ...centerRoutes, ...blogRoutes];
}
