# Runbook sécurité et mise en production CRM

## Invariants d'accès

- Un visiteur public ne lit jamais les collections CRM privées.
- Un manager actif ne lit et ne modifie que les données de son centre actif.
- La suspension d'un centre coupe immédiatement son accès côté API et Firestore.
- Le Super Admin conserve une vue réseau explicite.
- Les paiements, forfaits, crédits, validations de séance, clients, managers et paramètres de centre passent par des API authentifiées utilisant Firebase Admin.
- Les écritures navigateur vers `payments` et `client_packages` restent interdites.
- Les images publiques sont servies depuis les chemins autorisés ; les écritures Storage passent par les API authentifiées.

## Portes de qualité

Chaque lot sensible doit réussir, dans cet ordre :

```powershell
npm run lint
npm test
$env:JAVA_HOME="C:\chemin\vers\un-jre-21"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npm run audit:security
npm run build
git diff --check
```

`npm run audit:security` démarre les émulateurs Auth, Firestore et Storage sur le projet de démonstration `demo-aq8-security`. Aucun test automatisé ne doit utiliser le projet de production.

## Dépendances surveillées

- Next `15.5.22` contient les correctifs de sécurité de la branche 15.5 connus au moment de cette revue.
- Next dépend encore de Sharp `0.34.5`. Sharp antérieur à `0.35.0` est concerné par des vulnérabilités héritées de libvips lors du traitement d'entrées non fiables.
- `images.unoptimized: true` désactive donc volontairement l'optimiseur d'images Next. Ne pas retirer cette option avant qu'une version compatible de Next utilise Sharp `0.35.0` ou supérieur.
- Le résultat de `npm audit` doit être complété par la consultation des avis officiels Next et Sharp avant chaque release.
## Déploiement

1. Vérifier que le lot est committé et que les tests sont verts.
2. Pousser l'application afin de déclencher le déploiement App Hosting.
3. Vérifier que `/api/crm-center-settings` répond `401` sans jeton et que `/crm` contient les en-têtes de sécurité.
4. Vérifier le compte CLI avec `firebase login:list`. Le déploiement des règles doit être effectué avec le compte Super Admin autorisé.
5. Depuis la racine contenant `firebase.json`, déployer :

```powershell
firebase deploy --only firestore:rules,storage --project aq8algerie-4f675
```

6. Exécuter les smoke tests de production :
   - connexion Super Admin ;
   - connexion d'un manager actif ;
   - lecture et modification limitée à son centre ;
   - refus d'accès à un autre centre ;
   - refus complet pour un centre suspendu ;
   - création puis validation d'une réservation ;
   - contrôle du crédit, du paiement, de l'audit et des notifications.

## Secrets

- Ne jamais placer de clé Resend, de clé de compte de service ou de fichier JSON Firebase dans Git.
- Stocker les secrets de production dans Google Cloud Secret Manager via App Hosting.
- Faire tourner immédiatement toute clé publiée dans un chat, une capture, un journal ou un ticket.
- Limiter les comptes de service au principe du moindre privilège et revoir leurs accès régulièrement.

## Réponse aux incidents

1. Suspendre le compte ou le centre concerné.
2. Révoquer les sessions et faire tourner les secrets potentiellement exposés.
3. Préserver les journaux d'audit et les journaux Cloud avant toute correction de données.
4. Identifier le périmètre par `centerId`, utilisateur, période et type d'opération.
5. Corriger par une opération serveur idempotente, jamais par une écriture navigateur improvisée.
6. Ajouter un test de non-régression avant le redéploiement.
