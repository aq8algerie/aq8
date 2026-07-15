# Backfill des verrous de creneaux Firestore

Ce projet utilise la collection `appointment_slots/{centerId}/slots/{slotId}` pour empecher deux reservations non annulees de prendre le meme creneau dans un centre.

Les nouveaux flux CRM creent, deplacent ou liberent ces verrous automatiquement. Les rendez-vous deja presents avant cette securisation doivent etre audites puis backfilles.

## Pre-requis

Le script utilise Firebase Admin. La session Firebase CLI peut confirmer l'acces au projet, mais elle ne suffit pas pour `firebase-admin`.

Configurer une des deux options suivantes dans PowerShell :

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\chemin\vers\service-account.json"
```

ou :

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON=(Get-Content "C:\chemin\vers\service-account.json" -Raw)
```

Le projet est detecte dans cet ordre : `--project`, `FIREBASE_PROJECT_ID`, `GCLOUD_PROJECT`, puis `.firebaserc`.

## Audit sans ecriture

Toujours commencer par :

```powershell
npm run backfill:appointment-slots
```

Le rapport principal est ecrit ici :

```
db-audit/out/firestore-import/appointment-slots-backfill-report.json
```

La liste complete des conflits de creneaux est aussi exportee ici :

```
db-audit/out/firestore-import/appointment-slots-conflicts.csv
```

Verifier notamment :

- `invalidCandidates` : rendez-vous non annules incomplets ;
- `duplicateSlotConflicts` : plusieurs rendez-vous pour le meme `centerId + dateTime` ;
- `existingSlotConflicts` : verrou existant pointe vers un autre rendez-vous ;
- `slotsToCreate` : verrous qui seront crees en execution.

## Analyse detaillee des conflits

Pour enrichir les conflits avec les noms clients, telephones, services et centres :

```powershell
npm run analyze:appointment-slot-conflicts
```

Le script genere :

- `db-audit/out/firestore-import/appointment-slots-conflicts-analysis.json` : compteurs globaux ;
- `db-audit/out/firestore-import/appointment-slots-conflicts-summary.csv` : une ligne par creneau en conflit ;
- `db-audit/out/firestore-import/appointment-slots-conflicts-detailed.csv` : une ligne par rendez-vous implique.

Les CSV sont ecrits en UTF-8 avec BOM pour une ouverture plus fiable dans Excel.

## Execution

Si le rapport est propre :

```powershell
npm run backfill:appointment-slots:execute
```

Si des conflits existent mais que vous voulez backfiller uniquement les creneaux sans conflit :

```powershell
npm run backfill:appointment-slots:execute -- --skip-conflicts
```

Conserver le rapport apres execution pour tracer les conflits restants.

## Verification rapide

La CLI Firebase peut confirmer le projet et la base sans utiliser Firebase Admin :

```powershell
npx -y firebase-tools@latest firestore:databases:get --project aq8algerie-4f675 --json
```
