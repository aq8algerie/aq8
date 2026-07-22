/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FaqItem {
  id: string;
  category: 'tech' | 'prep' | 'schedule' | 'health' | 'payment';
  question: string;
  answer: string;
  tags: string[];
  popular?: boolean;
}

export const FAQ_CATEGORIES = [
  { id: 'all', label: 'Toutes les questions', icon: 'Sparkles' },
  { id: 'tech', label: 'Technologies AQ8 & Wonder', icon: 'Zap' },
  { id: 'prep', label: 'Équipement & 1ère Séance', icon: 'Shirt' },
  { id: 'schedule', label: 'Horaires & Réservations', icon: 'Calendar' },
  { id: 'health', label: 'Santé & Contre-indications', icon: 'HeartPulse' },
  { id: 'payment', label: 'Tarifs & Paiements', icon: 'CreditCard' },
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  // --- TECHNOLOGIES ---
  {
    id: 'faq-1',
    category: 'tech',
    question: "Qu'est-ce que la technologie AQ8 EMS ?",
    answer: "L'AQ8 EMS est une technologie espagnole d'électromyostimulation musculaire sans fil (Wireless). Équipé(e) d'une combinaison légère reliée à un boîtier de contrôle d'une portée de 100 mètres, vous effectuez des exercices guidés sollicitant simultanément 350 muscles profonds. Une séance de 20 minutes équivaut en intensité à 4 heures de musculation conventionnelle.",
    tags: ['aq8', 'ems', 'électrostimulation', 'durée', 'efficacité'],
    popular: true
  },
  {
    id: 'faq-2',
    category: 'tech',
    question: "Comment fonctionne la technologie Wonder Sculpting ?",
    answer: "Wonder est un système de sculpting corporel de haute intensité combinant les ondes électromagnétiques ciblées (HIEMT) et l'électrostimulation de forte puissance. Réalisé en position allongée ou semi-assise, il provoque 52 000 contractions musculaires profondes en 25 minutes pour galber simultanément les fessiers, raffermir les abdominaux et tonifier les cuisses.",
    tags: ['wonder', 'sculpting', 'ventre', 'fessiers', 'musculation passive'],
    popular: true
  },
  {
    id: 'faq-3',
    category: 'tech',
    question: "Quelle est la différence entre AQ8 EMS et Wonder Sculpt ?",
    answer: "AQ8 EMS accompagne votre effort dynamique actif (squats, fentes, gainage guidés par le coach), idéal pour la perte de masse graisseuse globale, le renforcement du dos et le métabolisme. Wonder Sculpt s'effectue en posture passive ciblée pour sculpter les zones rebelles (ventre, fessiers, cuisses) avec une puissance de contraction extrême.",
    tags: ['différence', 'comparaison', 'aq8 vs wonder', 'choix'],
    popular: true
  },
  {
    id: 'faq-4',
    category: 'tech',
    question: "Combien de séances par semaine sont nécessaires pour voir des résultats ?",
    answer: "Pour l'EMS AQ8, 1 à 2 séances de 20 minutes par semaine suffisent amplement, en respectant un temps de repos de 48h à 72h pour permettre aux fibres musculaires de se reconstruire. Pour Wonder, une cure de 2 séances par semaine sur 4 à 6 semaines offre des résultats spectaculaires dès la 3ème séance.",
    tags: ['fréquence', 'résultats', 'séances', 'rythme'],
    popular: true
  },

  // --- ÉQUIPEMENT & DÉROULEMENT ---
  {
    id: 'faq-5',
    category: 'prep',
    question: "Que faut-il apporter pour sa première séance ?",
    answer: "Vous devez apporter : 1) Un t-shirt à manches longues et un bas/legging fin en coton propre, 2) Une paire de baskets propres réservées exclusivement à l'usage en salle, 3) Un change complet pour repartir confortablement après la séance.",
    tags: ['équipement', 'tenue', 'baskets', 'coton', 'première séance'],
    popular: true
  },
  {
    id: 'faq-6',
    category: 'prep',
    question: "Comment se déroule le premier rendez-vous en centre ?",
    answer: "Votre arrivée comprend un bilan corporel personnalisé (prise de poids, mensurations et objectifs sportifs/minceur) suivi d'une explication des sensations d'impulsion. Le coach ajuste ensuite l'intensité canal par canal (bras, pectoraux, abdominaux, dos, fessiers, cuisses) selon votre tolérance et votre niveau.",
    tags: ['déroulement', 'bilan', 'mensurations', 'coaching'],
    popular: false
  },

  // --- HORAIRES & DÉROULEMENT ---
  {
    id: 'faq-7',
    category: 'schedule',
    question: "Doit-on réserver la veille ou le jour même ?",
    answer: "Afin de garantir un coaching individuel de qualité et la disponibilité du matériel, vous devez obligatoirement réserver votre rendez-vous LA VEILLE avant 21h30. Les réservations le jour même ne sont pas acceptées.",
    tags: ['réservation', 'délai', 'veille', 'planning'],
    popular: true
  },
  {
    id: 'faq-8',
    category: 'schedule',
    question: "Quels sont les créneaux dédiés aux Femmes et aux Hommes ?",
    answer: "Chaque centre AQ8 applique une répartition stricte des horaires : certains centres comme Ouled Fayet ou Blida sont réservés exclusivement aux femmes, tandis que les centres mixtes comme Sidi Yahia, Birkhadem ou Tlemcen disposent de plages horaires séparées le matin et l'après-midi. Retrouvez les horaires exacts sur la page de chaque centre.",
    tags: ['créneaux', 'femmes', 'hommes', 'mixte', 'horaires'],
    popular: true
  },
  {
    id: 'faq-9',
    category: 'schedule',
    question: "Quelle est la politique d'annulation d'une séance ?",
    answer: "Si vous ne pouvez pas assister à votre séance planifiée, vous devez impérativement l'annuler au moins 1 heure à l'avance depuis votre compte ou auprès du centre. En cas d'absence non signalée, le système déduit automatiquement le crédit de séance de votre forfait.",
    tags: ['annulation', 'délai', 'règle', 'pénalité'],
    popular: false
  },
  {
    id: 'faq-10',
    category: 'schedule',
    question: "Quelle est la durée de validité des forfaits d'abonnement ?",
    answer: "Chaque forfait d'abonnement dispose d'une durée de validité de 1 mois et demi (45 jours maximum à compter du paiement). Passé ce délai, le compte est réinitialisé afin d'assurer la régularité du programme d'entraînement et d'optimiser vos résultats.",
    tags: ['forfait', 'validité', '45 jours', 'expiration'],
    popular: true
  },

  // --- SANTÉ & SÉCURITÉ ---
  {
    id: 'faq-11',
    category: 'health',
    question: "Quelles sont les contre-indications absolues à l'EMS ?",
    answer: "La pratique de l'EMS et de Wonder est strictly contre-indiquée aux personnes portant un pacemaker/stimulateur cardiaque, aux femmes enceintes, aux personnes épileptiques, ou souffrant de troubles circulatoires graves (thrombo-embolies) ou de hernies abdominales non traitées. Un questionnaire de santé est rempli lors de votre inscription.",
    tags: ['contre-indications', 'santé', 'enceinte', 'pacemaker', 'sécurité'],
    popular: true
  },
  {
    id: 'faq-12',
    category: 'health',
    question: "L'électrostimulation est-elle douloureuse ?",
    answer: "Absolument pas. L'impulsion électrique reproduit le signal naturel envoyé par votre cerveau au muscle. Vous ressentez un picotement et une contraction musculaire intense mais indolore, dont l'amplitude est totalement contrôlée par votre coach.",
    tags: ['douleur', 'sensation', 'sécurité', 'confort'],
    popular: false
  },
  {
    id: 'faq-13',
    category: 'health',
    question: "Est-ce adapté après un accouchement ou pour le mal de dos ?",
    answer: "Oui, après validation médicale (post-rééducation du périnée), l'EMS est particulièrement recommandé pour renforcer la sangle abdominale sans impacter les articulations. Il est également réputé pour soulager les lombalgies grâce au renforcement des muscles érecteurs du rachis.",
    tags: ['accouchement', 'mal de dos', 'post-partum', 'rééducation'],
    popular: false
  },

  // --- TARIFS & PAIEMENTS ---
  {
    id: 'faq-14',
    category: 'payment',
    question: "Quels sont les modes de paiement acceptés ?",
    answer: "Le règlement s'effectue directement au centre en espèces. Nous proposons également des facilités de paiement d'abonnement échelonnés en 2 ou 3 fois selon les modalités définies avec la direction de votre centre.",
    tags: ['paiement', 'espèces', 'échelonnement', '2x 3x'],
    popular: true
  },
  {
    id: 'faq-15',
    category: 'payment',
    question: "Pourquoi est-il obligatoire de recevoir son reçu de paiement au centre ?",
    answer: "Pour des raisons de traçabilité comptable et de validation de vos crédits de séances sur le système CRM centralisé, un reçu officiel imprimé ou signé vous est obligatoirement remis au centre lors de votre encaissement.",
    tags: ['reçu', 'encaissement', 'reçu officiel', 'caisse'],
    popular: false
  }
];
