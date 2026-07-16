/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Center } from '../src/types';

export const siteConfig = {
  name: "AQ8 Algérie",
  url: "https://www.aq8algerie-dz.com",
  description: "AQ8 Algérie propose des séances d’électrostimulation, Wonder, remise en forme et accompagnement minceur dans ses centres.",
  defaultImage: "/images/aq8-og-image.webp",
  logoImage: "/images/logo-symbol.png"
};

export interface PageSeo {
  title: string;
  description: string;
  canonicalUrl: string;
  keywords: string[];
}

export const staticPageSeo: Record<string, Omit<PageSeo, 'canonicalUrl'>> = {
  home: {
    title: "AQ8 Algérie - Électrostimulation, Wonder et remise en forme",
    description: "Découvrez AQ8 Algérie : électrostimulation, Wonder, remise en forme et accompagnement minceur dans nos centres. Trouvez le centre le plus proche.",
    keywords: ["AQ8 Algérie", "électrostimulation Algérie", "EMS Algérie", "Wonder Algérie", "remise en forme Alger", "fitness Alger", "minceur Algérie"]
  },
  aq8: {
    title: "AQ8 EMS - Électrostimulation sans fil en Algérie",
    description: "Découvrez AQ8 EMS, une technologie d’électrostimulation encadrée pour la tonification musculaire, la remise en forme et le suivi personnalisé.",
    keywords: ["AQ8 EMS", "électrostimulation sans fil", "EMS Algérie", "coaching privé Alger", "tonification musculaire", "perte de poids"]
  },
  wonder: {
    title: "Wonder AQ8 Algérie - Sculpting, tonification et accompagnement minceur",
    description: "Découvrez Wonder chez AQ8 Algérie : une solution de sculpting corporel et d’accompagnement minceur encadrée par nos équipes.",
    keywords: ["Wonder AQ8", "Wonder sculpting Algérie", "musculation passive Alger", "tonification fessiers", "minceur sans effort"]
  },
  centers: {
    title: "Centres AQ8 en Algérie - Trouver votre centre AQ8 ou Wonder",
    description: "Consultez la liste des centres AQ8 Algérie, leurs horaires, prestations, coordonnées et règles de réservation.",
    keywords: ["centres AQ8", "salles de sport AQ8", "Bir Khadem gym", "AQ8 Ouled Fayet", "AQ8 Blida", "AQ8 Tlemcen", "AQ8 Sidi Yahia"]
  },
  faq: {
    title: "FAQ - Questions Fréquentes AQ8 Algérie",
    description: "Tout savoir sur l'électrostimulation, les contre-indications, le déroulement des séances d'EMS et de Wonder chez AQ8 Algérie.",
    keywords: ["FAQ AQ8", "questions électrostimulation", "danger EMS", "wonder contre indications"]
  },
  contact: {
    title: "Contactez AQ8 Algérie - Réservations et Informations",
    description: "Contactez nos centres AQ8 Algérie ou notre direction pour obtenir des renseignements, réserver une séance d'EMS ou demander un accompagnement minceur.",
    keywords: ["contact AQ8 Algérie", "numéro téléphone AQ8", "réservation EMS Alger"]
  }
};

export function getSeoForPage(route: string): PageSeo {
  const staticSeo = staticPageSeo[route] || staticPageSeo.home;
  return {
    ...staticSeo,
    canonicalUrl: `${siteConfig.url}${route === 'home' ? '/' : `/${route}`}`
  };
}

export function generateCenterSeo(center: Center): PageSeo {
  const centerName = center.name || "Centre AQ8";
  const cityName = center.city || "Algérie";
  
  return {
    title: `AQ8 ${cityName} - ${centerName} | Électrostimulation, Wonder et remise en forme`,
    description: `Réservez votre séance AQ8 ou Wonder au centre ${centerName} à ${cityName}. Électrostimulation, remise en forme, accompagnement minceur, horaires, consignes et contact.`,
    canonicalUrl: `${siteConfig.url}/centres/${center.slug}`,
    keywords: [
      `AQ8 ${cityName}`,
      `AQ8 ${centerName}`,
      `électrostimulation ${cityName}`,
      `Wonder ${cityName}`,
      `coaching sportif ${cityName}`,
      `centre EMS ${cityName}`,
      `remise en forme ${cityName}`
    ]
  };
}
