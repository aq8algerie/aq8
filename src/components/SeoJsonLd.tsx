/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Center } from '../types';
import { siteConfig } from '../lib/seo';

interface SeoJsonLdProps {
  type: 'organization' | 'faq' | 'local_business';
  center?: Center;
}

export function SeoJsonLd({ type, center }: SeoJsonLdProps) {
  let schemaData: any = null;

  if (type === 'organization') {
    schemaData = {
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
  } else if (type === 'faq') {
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
      },
      {
        q: "Faut-il apporter une tenue spécifique ?",
        a: "Pour l'EMS AQ8, une sous-tenue spécifique en coton respirant est requise pour assurer la parfaite conduction des impulsions. Nous vous fournissons cette tenue lors de votre première séance d'essai."
      },
      {
        q: "Le traitement est-il douloureux ?",
        a: "Non. Vous ressentez des picotements musculaires profonds et une sensation d'effort intense, mais ce n'est pas douloureux. L'intensité est modulée individuellement par le coach sur chaque groupe musculaire selon votre tolérance."
      },
      {
        q: "Quelles sont les contre-indications médicales ?",
        a: "Les contre-indications absolues sont : pacemaker ou défibrillateur cardiaque implanté, grossesse, épilepsie non contrôlée, insuffisance rénale sévère ou thrombose active."
      }
    ];

    schemaData = {
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
  } else if (type === 'local_business' && center) {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "@id": `${siteConfig.url}/centres/${center.slug}`,
      "name": center.name,
      "description": center.description || `Centre AQ8 de remise en forme et d'électrostimulation à ${center.city}.`,
      "url": `${siteConfig.url}/centres/${center.slug}`,
      "telephone": center.phone,
      "image": center.imageUrl,
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
  }

  if (!schemaData) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
