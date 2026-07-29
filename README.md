# AQ8 Algérie - Site public et CRM

Application Next.js réunissant le site public, les réservations et le CRM multi-centres AQ8.

## Architecture

- Next.js App Router et React 19
- Firebase Authentication pour les accès CRM
- Firestore pour les centres, clients, réservations, forfaits, paiements et audits
- Firebase Storage pour les images publiques des centres
- Resend pour les notifications transactionnelles
- Serveur Express léger pour le rate limiting et l'expiration des pré-réservations

## Démarrage local

Prérequis : Node.js 20 et un projet Firebase autorisé.

1. Installer les dépendances avec `npm ci`.
2. Renseigner un fichier `.env.local` à partir de `.env.example`.
3. Lancer `npm run dev`.
4. Ouvrir `http://localhost:3000`.

Les identifiants Firebase Web sont publics par conception. Les clés privées, notamment `RESEND_API_KEY` et les identifiants Firebase Admin locaux, ne doivent jamais être versionnées.

## Contrôles qualité

- `npm run lint` : vérification TypeScript
- `npm test` : règles métier et scénarios transactionnels
- `npm run build` : build Next.js de production

La même séquence est exécutée par GitHub Actions sur chaque pull request et chaque push vers `main`.

## Sécurité CRM

- Les rôles et l'affectation des managers sont validés côté serveur.
- Un manager est limité à son centre, dans les API comme dans les règles Firestore.
- Validation de séance, déduction de crédit, activation de forfait et paiement sont atomiques.
- Un paiement n'est jamais supprimé : une annulation crée une écriture négative de contrepartie.
- Les suppressions de clients sont remplacées par un archivage contrôlé.
- Les images sont validées côté serveur puis écrites par Firebase Admin.
- Les actions sensibles créent une trace d'audit.

## Déploiement Firebase

Depuis la racine de ce dépôt, après authentification Firebase :

`firebase deploy --only firestore:rules,storage --project aq8algerie-4f675`

Le build applicatif est ensuite déployé par Firebase App Hosting depuis la branche configurée. Les secrets de production doivent être stockés dans Cloud Secret Manager, pas dans le dépôt.

## Documentation métier

- [Capacité et réservation](docs/reservation-capacity-system.md)
- [Backfill des créneaux](docs/backfill-appointment-slots.md)
