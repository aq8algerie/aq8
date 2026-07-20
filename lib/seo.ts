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
  logoImage: "/images/logo.png"
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
  about: {
    title: "À propos - AQ8 Algérie",
    description: "Découvrez AQ8 Algérie, son approche premium, ses centres, ses séances AQ8 EMS et Wonder, ainsi que les questions fréquentes avant réservation.",
    keywords: ["à propos AQ8 Algérie", "questions fréquentes AQ8", "AQ8 Algérie", "centres AQ8", "EMS Algérie", "Wonder Algérie"]
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
  },
  booking: {
    title: "Réservez votre séance - AQ8 Algérie",
    description: "Planifiez et pré-réservez votre séance d'électrostimulation AQ8 EMS ou Wonder dans le centre de votre choix en Algérie.",
    keywords: ["réservation AQ8", "réserver EMS Algérie", "réserver Wonder Sculpt", "séance d'électrostimulation"]
  }
};

export function getSeoForPage(route: string): PageSeo {
  const staticSeo = staticPageSeo[route] || staticPageSeo.home;
  return {
    ...staticSeo,
    canonicalUrl: `${siteConfig.url}${
      route === 'home' 
        ? '/' 
        : route === 'about' 
        ? '/a-propos' 
        : route === 'booking'
        ? '/reservation'
        : `/${route}`
    }`
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

export function generateJsonLd(route: string, center?: Center): string {
  let schema: any = null;

  if (route === 'center-detail' && center) {
    schema = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "@id": `${siteConfig.url}/centres/${center.slug}`,
      "name": center.name,
      "description": center.description || `Centre AQ8 de remise en forme et d'électrostimulation à ${center.city}.`,
      "url": `${siteConfig.url}/centres/${center.slug}`,
      "telephone": center.phone || "",
      "image": center.imageUrl || `${siteConfig.url}${siteConfig.defaultImage}`,
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": center.address,
        "addressLocality": center.city,
        "addressCountry": "DZ"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Saturday",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday"
          ],
          "opens": "08:00",
          "closes": "21:00"
        }
      ]
    };
  } else if (route === 'home') {
    schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      "name": siteConfig.name,
      "url": siteConfig.url,
      "logo": `${siteConfig.url}${siteConfig.logoImage}`,
      "image": `${siteConfig.url}${siteConfig.defaultImage}`,
      "description": siteConfig.description,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+213-23-48-50-60",
        "contactType": "customer service",
        "areaServed": "DZ",
        "availableLanguage": ["French", "Arabic"]
      }
    };
  } else if (route === 'about') {
    const questions = [
      {
        q: "Qu'est-ce que l'EMS AQ8 ?",
        a: "L'AQ8 est une technologie espagnole d'électromyostimulation (EMS) sans fil. Grâce à une combinaison d'entraînement légère et d'un boîtier de contrôle d'une portée de 100 mètres, vous sollicitez simultanément 350 muscles profonds. Une séance de 20 minutes équivaut en intensité à 4 heures de musculation traditionnelle."
      },
      {
        q: "La technologie Wonder est-elle différente de l'AQ8 ?",
        a: "Oui, la technologie Wonder se focalise sur l'hypertrophie passive et l'élimination des graisses localisées en position allongée ou semi-assise. Elle émet de puissantes ondes électromagnétiques combinées à l'EMS pour engendrer 52 000 contractions en 25 minutes, ciblant fessiers, abdominaux et cuisses."
      },
      {
        q: "Combien de séances par semaine sont conseillées ?",
        a: "Pour l'EMS AQ8, 1 à 2 séances de 20 minutes par semaine suffisent largement, espacées de 72 heures pour laisser les fibres musculaires se régénérer. Pour Wonder, une cure de 2 séances par semaine sur 4 à 6 semaines est préconisée pour obtenir un galbe parfait."
      }
    ];

    schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": questions.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.a
        }
      }))
    };
  }

  return schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : '';
}
