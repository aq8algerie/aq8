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
