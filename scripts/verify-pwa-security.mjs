import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const [serviceWorker, registration] = await Promise.all([
  readFile(new URL('public/sw.js', projectRoot), 'utf8'),
  readFile(new URL('components/PwaRegister.tsx', projectRoot), 'utf8'),
]);

const requiredServiceWorkerGuards = [
  "event.request.mode === 'navigate'",
  "url.pathname.startsWith('/crm')",
  "url.pathname.startsWith('/login')",
  "url.pathname.startsWith('/api/')",
];

for (const guard of requiredServiceWorkerGuards) {
  if (!serviceWorker.includes(guard)) {
    throw new Error(`Missing service-worker cache guard: ${guard}`);
  }
}

if (!registration.includes('updateViaCache: "none"')) {
  throw new Error('The service-worker script must bypass its HTTP cache during updates.');
}

console.log('ok - authenticated routes and navigations are excluded from PWA caches');
