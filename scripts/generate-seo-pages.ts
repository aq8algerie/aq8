import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AQ8Database} from '../src/mockData';
import {generateCenterSeo, getSeoForPage, siteConfig, type PageSeo} from '../lib/seo';

interface SeoRoute {
  path: string;
  seo: PageSeo;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '..');
const distDir = path.join(rootDir, 'dist');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function removeExistingSeo(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');
}

function getAbsoluteImageUrl(imageUrl?: string): string {
  if (imageUrl?.startsWith('http://') || imageUrl?.startsWith('https://')) {
    return imageUrl;
  }

  const relative = imageUrl || siteConfig.defaultImage;
  return `${siteConfig.url}${relative.startsWith('/') ? relative : `/${relative}`}`;
}

function injectSeo(template: string, seo: PageSeo, imageUrl?: string): string {
  const html = removeExistingSeo(template).replace(/<html\s+lang=["'][^"']*["']/i, '<html lang="fr-DZ"');
  const image = getAbsoluteImageUrl(imageUrl);
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(seo.keywords.join(', '))}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteConfig.name)}" />`,
    '<meta property="og:locale" content="fr_DZ" />',
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`
  ].join('\n    ');

  return html.replace('<head>', `<head>\n    ${tags}`);
}

function routeOutputDir(routePath: string): string {
  if (routePath === '/') {
    return distDir;
  }

  return path.join(distDir, routePath.replace(/^\//, ''));
}

function buildSitemap(routes: SeoRoute[]): string {
  const urls = routes.map((route) => `  <url>
    <loc>${route.seo.canonicalUrl}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots(): string {
  return `User-agent: *
Allow: /
Disallow: /login
Disallow: /crm
Disallow: /dashboard
Disallow: /admin
Disallow: /manager

Sitemap: ${siteConfig.url}/sitemap.xml
`;
}

async function main() {
  const templatePath = path.join(distDir, 'index.html');
  const template = await readFile(templatePath, 'utf8');
  const centers = AQ8Database.getCenters().filter((center) => Boolean(center.slug));

  const staticRoutes: SeoRoute[] = [
    {path: '/', seo: getSeoForPage('home'), changefreq: 'daily', priority: '1.0'},
    {path: '/aq8', seo: getSeoForPage('aq8'), changefreq: 'weekly', priority: '0.8'},
    {path: '/wonder', seo: getSeoForPage('wonder'), changefreq: 'weekly', priority: '0.8'},
    {path: '/centres', seo: getSeoForPage('centers'), changefreq: 'daily', priority: '0.9'},
    {path: '/faq', seo: getSeoForPage('faq'), changefreq: 'monthly', priority: '0.6'},
    {path: '/contact', seo: getSeoForPage('contact'), changefreq: 'monthly', priority: '0.7'}
  ];

  const centerRoutes: SeoRoute[] = centers.map((center) => ({
    path: `/centres/${center.slug}`,
    seo: generateCenterSeo(center),
    changefreq: 'weekly',
    priority: '0.8'
  }));

  const routes = [...staticRoutes, ...centerRoutes];

  for (const route of routes) {
    const center = centers.find((item) => route.path === `/centres/${item.slug}`);
    const outputDir = routeOutputDir(route.path);
    await mkdir(outputDir, {recursive: true});
    await writeFile(path.join(outputDir, 'index.html'), injectSeo(template, route.seo, center?.imageUrl), 'utf8');
  }

  await writeFile(path.join(distDir, 'sitemap.xml'), buildSitemap(routes), 'utf8');
  await writeFile(path.join(distDir, 'robots.txt'), buildRobots(), 'utf8');

  console.log(`Generated SEO HTML for ${routes.length} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});