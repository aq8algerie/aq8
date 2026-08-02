import { readFile } from 'node:fs/promises';

const manifestPath = new URL('../.next/prerender-manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const prerenderedRoutes = new Set(Object.keys(manifest.routes || {}));
const protectedRoutes = ['/crm', '/login'];
const cachedProtectedRoutes = protectedRoutes.filter(route => prerenderedRoutes.has(route));

if (cachedProtectedRoutes.length > 0) {
  throw new Error(
    `Protected routes must remain dynamic and non-cacheable: ${cachedProtectedRoutes.join(', ')}`,
  );
}

console.log('ok - protected CRM routes are absent from the prerender manifest');
