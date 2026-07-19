import { useEffect } from 'react';
import { Center } from '../types';

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
    canonicalUrl: `${siteConfig.url}${route === 'home' ? '/' : route === 'about' ? '/a-propos' : `/${route}`}`
  };
}

export function generateCenterSeo(center: Center): PageSeo {
  // Format city and name elegantly
  const centerName = center.name || "Centre AQ8";
  const cityName = center.city || "Algérie";
  
  // Custom, localized high-quality title and description
  const title = `AQ8 ${cityName} - ${centerName} | Électrostimulation, Wonder et remise en forme`;
  const description = `Réservez votre séance AQ8 ou Wonder au centre ${centerName} à ${cityName}. Électrostimulation, remise en forme, accompagnement minceur, horaires, consignes et contact.`;
  
  return {
    title,
    description,
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

export function useSeo(route: string, center?: Center) {
  useEffect(() => {
    let seo: PageSeo;
    if (route === 'center-detail' && center) {
      seo = generateCenterSeo(center);
    } else {
      seo = getSeoForPage(route);
    }

    // 1. Update Title
    document.title = seo.title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seo.description);

    // 3. Update Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords.join(', '));

    // 4. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', seo.canonicalUrl);
  }, [route, center]);
}

