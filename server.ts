import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';

// Import SEO helpers and mock database
import { getSeoForPage, generateCenterSeo, PageSeo } from './lib/seo';
import { AQ8Database } from './src/mockData';

const PORT = Number(process.env.PORT || 3000);

function injectSeo(html: string, seo: PageSeo): string {
  let modifiedHtml = html;
  
  // Clean up any existing titles or meta tags
  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<meta\s+name="keywords"\s+content=".*?"\s*\/?>/gi, '');
  modifiedHtml = modifiedHtml.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/gi, '');

  // Generate complete set of optimized SEO tags
  const metaTags = `
    <title>${seo.title}</title>
    <meta name="description" content="${seo.description}" />
    <meta name="keywords" content="${seo.keywords.join(', ')}" />
    <link rel="canonical" href="${seo.canonicalUrl}" />
    <meta property="og:title" content="${seo.title}" />
    <meta property="og:description" content="${seo.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seo.title}" />
    <meta name="twitter:description" content="${seo.description}" />
  `;

  // Inject right after <head> or before </head>
  if (modifiedHtml.includes('<head>')) {
    return modifiedHtml.replace('<head>', `<head>\n    ${metaTags}`);
  } else {
    return modifiedHtml.replace('</head>', `${metaTags}\n</head>`);
  }
}

function getSeoForUrl(urlPath: string): PageSeo {
  // Match a dynamic center slug URL
  const centerMatch = urlPath.match(/^\/centres\/([a-zA-Z0-9_-]+)/);
  if (centerMatch) {
    const slug = centerMatch[1];
    const centers = AQ8Database.getCenters();
    const center = centers.find(c => c.slug === slug);
    if (center) {
      return generateCenterSeo(center);
    }
  }

  // Match static pages
  const cleanPath = urlPath === '/' ? 'home' : urlPath.replace(/^\//, '');
  const validRoutes: Record<string, string> = {
    'home': 'home',
    'aq8': 'aq8',
    'wonder': 'wonder',
    'centres': 'centers',
    'centers': 'centers',
    'faq': 'faq',
    'contact': 'contact'
  };

  const routeKey = validRoutes[cleanPath] || 'home';
  return getSeoForPage(routeKey);
}

async function startServer() {
  const app = express();

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Serve the public directory assets
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite's Dev Middleware
    console.log('Starting server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        // Dynamic SEO injection
        const seo = getSeoForUrl(req.path);
        const html = injectSeo(template, seo);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production mode serving built assets from dist/
    console.log('Starting server in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve client-side static assets
    app.use(express.static(distPath, { index: false }));

    app.use('*', async (req, res, next) => {
      try {
        const templatePath = path.join(distPath, 'index.html');
        const template = await fs.readFile(templatePath, 'utf-8');
        
        // Dynamic SEO injection
        const seo = getSeoForUrl(req.path);
        const html = injectSeo(template, seo);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
