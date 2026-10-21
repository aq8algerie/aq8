# Historique de l'ancienne base AQ8

Les PDF de reprise sont la référence des archives. Les écritures anciennes ne
doivent pas être transformées en nouveaux encaissements ou en crédits actifs.

## Consultation

- Paiements → **Historique ancienne base** : journal signé, types d'origine,
  abonnements et forfaits passés, commentaires, référence, pages et SHA-256 du PDF.
- Réservations → **Consulter les réservations de l'ancienne base** : réservations
  d'origine, annulations, remboursements et références d'événement.
- Fiche client → **Historique ancienne base** : mêmes journaux filtrés sur le
  client et le centre consulté. Le journal financier respecte les droits du gérant.
- Les cinq adhésions inactives restent dans l'archive des forfaits de leurs clients.

Le centre d'une opération historique est celui renseigné dans sa source, même si
le client a changé de centre depuis. Les liens vers un client absent sont signalés
sans créer de fiche fictive. Plusieurs réservations peuvent référencer le même
événement : toutes leurs références sont conservées, sans doublon dans le planning
actuel. Une réservation passée n'est pas une preuve de présence.

## Comptabilité

`Paiement`, `Bonus`, `Remboursement`, `Versement` et les écritures d'abonnement
conservent leurs libellés et montants signés. Aucun mode de règlement n'est déduit
d'un ancien import ayant arbitrairement utilisé `cash`. Les totaux par type sont
des mouvements historiques, pas un chiffre d'affaires validé ou un solde de séances.

Le registre courant et ses indicateurs excluent les documents `historicalOnly`
ainsi que les anciens identifiants `legacy-payment-*`, `legacy-reservation-*` et
`legacy-event-*`. Cela évite de compter les bonus/remboursements comme des ventes
et les disponibilités BAT comme des réservations. Les archives financières restent
hors chiffre d'affaires tant que la logique comptable ancienne n'est pas validée.

## Stockage et protection

- `legacy_financial_operations` : une archive par opération du PDF 03 ayant un
  centre explicite. Le PDF 04 est un sous-ensemble, jamais un deuxième import.
- `legacy_reservations` : une archive par identifiant du PDF 02, reliée à
  l'événement du PDF 05 lorsque celui-ci existe.
- `legacyReconciliation` sur les documents déjà importés : provenance, ancien
  rattachement et lien d'archive. Les montants et états courants sont conservés.
- Aucun nouveau document n'est créé pour une opération sans centre. Les imports
  préexistants sans centre source restent visibles avec un avertissement, dans
  leur centre antérieur.

Ces deux nouvelles collections sont interdites aux SDK navigateur par les règles
Firestore par défaut. La lecture passe par `/api/crm-legacy-history`, avec session
révoquable, contrôle du centre et contrôle financier. Les écritures passent
uniquement par l'outil de reprise de l'administrateur. Le cache serveur est limité
à cinq minutes, par centre et catégorie ; les droits sont revérifiés à chaque appel.

## Reprise contrôlée

Les données nominatives et sauvegardes restent dans `db-audit/out/`, ignoré par Git.
Prérequis : extraits PDF et audit global validés, fichiers PDF inchangés, compte
Firebase propriétaire connecté. Cible fixée au projet `aq8algerie-4f675`, base
Standard `(default)`.

```powershell
python scripts/prepare-legacy-history.py
node scripts/reconcile-legacy-history.mjs
# Après examen du résultat à blanc :
node scripts/reconcile-legacy-history.mjs --execute
```

L'outil vérifie les empreintes PDF et refuse toute collision d'archive. Il crée les
archives avec `exists: false` et met à jour les anciens imports avec une précondition
`updateTime`. Chaque lot possède une sauvegarde avant écriture, puis un journal de
validation après commit. Une reprise après interruption ignore les données déjà
identiques. Il n'efface aucun document et ne modifie aucun compte Auth ni crédit.

Les centres historiques explicites sont rétablis sur les imports existants. Une
heure tronquée peut être complétée uniquement si elle correspond exactement au
préfixe de l'heure source. Les anciennes valeurs restent dans la provenance et
les sauvegardes. Les statuts ne sont pas écrasés : une évolution postérieure à
l'export peut être légitime.
