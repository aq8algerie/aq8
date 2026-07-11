# AQ8 Algérie

Site public et CRM multi-centres pour AQ8 Algérie: centres, technologies AQ8 EMS et Wonder, demandes de réservation, contact, gestion clients, rendez-vous, forfaits, paiements et mensurations.

## Prérequis

- Node.js
- Un projet Firebase avec Auth Email/Password et Firestore
- Les variables `VITE_FIREBASE_*` renseignées dans `.env.local`

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Le build Vite génère ensuite des pages HTML SEO par route publique dans `dist/` (`/aq8`, `/wonder`, `/centres`, `/centres/[slug]`, `/faq`, `/contact`) afin que Firebase Hosting serve des balises meta correctes avant le chargement React.

## Déploiement Firebase Hosting

```bash
firebase deploy --only hosting
```

Avant production, gardez `VITE_ENABLE_DEMO_TOOLS=false` et `VITE_ENABLE_FIREBASE_SEED=false`.