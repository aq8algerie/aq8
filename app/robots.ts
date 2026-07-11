/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Robots.ts file for Next.js App Router metadata compliance
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/aq8',
          '/wonder',
          '/centres',
          '/centres/*',
          '/faq',
          '/contact'
        ],
        disallow: [
          '/login',
          '/crm',
          '/crm',
          '/dashboard',
          '/admin',
          '/manager'
        ],
      },
    ],
    sitemap: 'https://www.aq8algerie-dz.com/sitemap.xml',
  };
}
