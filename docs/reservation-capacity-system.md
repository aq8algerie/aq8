# Systeme de reservation capacitaire

Le moteur de reservation AQ8 ne bloque plus un centre entier pour une heure. Il applique une capacite par centre, par heure et par type de prestation.

## Capacites par heure

| Centre | AQ8 | Wonder |
| --- | ---: | ---: |
| BirKhadem - Gym | 3 | 1 |
| AQ8 Sidi Yahia | 3 | 1 |
| AQ8 Ouled Fayet | 2 | 1 |
| AQ8 Tlemcen | 2 | 1 |
| AQ8 Blida | 1 | 1 |

## Horaires reservables

Les heures ci-dessous sont les heures de depart reservables. Exemple : si un centre ferme a 14:00, le dernier depart reservable est 13:00.

| Centre | Jours | Heures de depart |
| --- | --- | --- |
| BirKhadem - Gym | Mardi, jeudi, samedi, dimanche | 09:00 a 13:00 |
| AQ8 Ouled Fayet | Dimanche a jeudi | 10:00 a 18:00 |
| AQ8 Ouled Fayet | Samedi | 10:00 a 15:00 |
| AQ8 Blida | Samedi, dimanche | 09:00 a 16:00 |
| AQ8 Blida | Mardi | 13:00 a 18:00 |
| AQ8 Blida | Lundi, mercredi | 16:00 a 18:00 |
| AQ8 Tlemcen | Samedi a jeudi | 09:00 a 22:00 |
| AQ8 Sidi Yahia | Dimanche a jeudi | 09:00 a 20:00 |
| AQ8 Sidi Yahia | Samedi | 10:00 a 20:00 |

Le vendredi est ferme pour tous les centres listes dans cette matrice.

## Securite transactionnelle

Les operations CRM creent, modifient ou liberent un document `appointment_slots/{centerId}/slots/{dateTime}` dans la meme transaction que le rendez-vous.

Ce document contient maintenant :

- `capacities`: capacite AQ8/Wonder applicable au centre ;
- `counts`: nombre de rendez-vous actifs par type ;
- `appointments`: reservations qui occupent le creneau.

Une reservation `cancelled` libere la capacite. Une reservation `completed` conserve la capacite, car la seance a bien occupe le creneau historique.

Les anciens verrous mono-reservation sont migres au fil de l'eau quand le creneau est relu par une transaction CRM.

## Reservation publique

Le site public lit uniquement la collection anonymisee `public_booking_slots/{centerId}/slots/{slotId}`. Ces documents exposent les champs utiles a l'interface client : `date`, `time`, `capacities`, `counts` et `remaining`. Ils ne contiennent pas les noms, telephones, e-mails ou identifiants clients.

Quand un client envoie le formulaire public, le navigateur n'ecrit plus directement dans `booking_requests`. Il appelle `POST /api/public-reservations`. Le serveur valide les donnees, relit les horaires et la capacite officielle, puis cree dans une transaction Firestore :

- la demande `booking_requests/{requestId}` au statut `pending` ;
- un hold `request-{requestId}` dans `appointment_slots` ;
- le miroir public `public_booking_slots` avec le nouveau nombre de places restantes.

Si deux clients demandent la derniere place au meme moment, une seule transaction peut reserver la capacite. L'autre recoit une erreur de creneau complet.

## Synchronisation des disponibilites publiques

Les rendez-vous futurs deja presents en base peuvent etre publies vers les slots publics avec :

`npm run sync:public-booking-slots` pour auditer sans ecrire.

`npm run sync:public-booking-slots:execute` pour ecrire `appointment_slots` et `public_booking_slots`.

Le script utilise Firebase Admin. En local, configurer `GOOGLE_APPLICATION_CREDENTIALS` vers le fichier service account avant execution.

