/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Center,
  CenterManager,
  Service,
  Client,
  Appointment,
  Package,
  ClientPackage,
  Payment,
  Measurement,
  GeneralSettings
} from './types';

// Initial Seed Data
export const INITIAL_CENTERS: Center[] = [
  {
    id: 'center-1',
    name: 'BirKhadem - Gym',
    city: 'Alger',
    address: 'Lotissement Les Vergers, Bir Khadem, Alger',
    phone: '+213 (0) 23 55 10 20',
    email: 'birkhadem@aq8algerie.com',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop',
    services: ['aq8', 'wonder'],
    schedule: 'Temporairement ouvert : 09:00 - 14:00 (Mar, Jeu, Sam, Dim) | Fermé : Lundi, Mercredi, Vendredi',
    description: 'Réservez votre séance AQ8 ou Wonder dans votre centre de Bir Khadem.',
    slug: 'birkhadem-gym',
    status: 'Horaires temporaires',
    importantNotes: [
      'Le centre est temporairement ouvert uniquement le matin de 9h à 14h, et fermé également le lundi et le mercredi.',
      'OUVERT le samedi matin uniquement pour les femmes, et fermé le vendredi.',
      'Vous devez prendre vos rendez-vous LA VEILLE avant 21h30 (pas le jour même).',
      'Les réservations se font par heure complète (Ex : de 10h à 11h, et non de 10h30 à 11h30).',
      'Il peut y avoir un décalage de votre rendez-vous dû au fuseau horaire, mais l’heure que vous avez sélectionnée est la bonne et reste confirmée.',
      '⚠️🚨 IMPORTANT : Vous devez absolument recevoir votre reçu de paiement directement à notre centre pour valider votre paiement.'
    ],
    menHours: ['13h => 16h', '19h => 21h'],
    womenHours: ['9h => 13h', '16h => 19h'],
    equipment: [
      'Un tee shirt manches longues et d’un bas fin en coton',
      'Une paire de baskets propres',
      'Un change pour repartir'
    ],
    cancellationRule: 'Veuillez noter que si vous ne pouvez pas assister à votre séance, il est important d’annuler au moins 1 heure à l’avance pour éviter que le système ne déduise le crédit de votre forfait en cours. Merci'
  },
  {
    id: 'center-2',
    name: 'AQ8 Ouled Fayet',
    city: 'Alger',
    address: 'Route d\'Ouled Fayet, Alger',
    phone: '0554162226',
    email: 'ouledfayet@aq8algerie.com',
    imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=600&auto=format&fit=crop',
    services: ['aq8', 'wonder'],
    schedule: 'Samedi : 10:00 - 16:00 | Dimanche - Jeudi : 10:00 - 19:00 | Vendredi : Fermé (Femmes uniquement)',
    description: 'Espace de remise en forme d\'élite à Ouled Fayet, réservé exclusivement aux femmes pour sculpter votre corps grâce aux technologies AQ8 EMS et Wonder.',
    slug: 'ouled-fayet',
    status: 'Femmes uniquement',
    importantNotes: [
      'Nouveaux horaires : 10h à 19h - Centre pour les Femmes uniquement.',
      'Fermé le vendredi toute la journée / Ouvert le samedi jusqu’à 16h.',
      'Vous devez prendre vos rendez-vous LA VEILLE avant 21h30 (pas le jour même).',
      'Les réservations se font par heure complète (Ex : de 10h à 11h, et non de 10h30 à 11h30).',
      'Il peut y avoir un décalage de votre rendez-vous dû au fuseau horaire, mais l’heure que vous avez sélectionnée est la bonne et reste confirmée.',
      '⚠️🚨 IMPORTANT : Vous devez absolument recevoir votre reçu de paiement pour valider votre paiement directement à notre centre.'
    ],
    menHours: ['Indisponible - Centre réservé aux Femmes'],
    womenHours: ['10h => 19h (Dimanche - Jeudi)', '10h => 16h (Samedi)'],
    equipment: [
      'Un tee shirt manches longues et d’un bas fin en coton',
      'Une paire de baskets propres',
      'Un change pour repartir'
    ],
    cancellationRule: 'Veuillez noter que si vous ne pouvez pas assister à votre séance, il est important d’annuler au moins 1 heure à l’avance pour éviter que le système ne déduise le crédit de votre forfait en cours. Merci'
  },
  {
    id: 'center-3',
    name: 'AQ8 Blida',
    city: 'Blida',
    address: 'Boulevard Larbi Tebessi, Blida',
    phone: '+213 (0) 25 30 40 50',
    email: 'blida@aq8algerie.com',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop',
    services: ['aq8', 'wonder'],
    schedule: 'Sam, Dim: 09:00 - 17:00 | Mar: 13:00 - 19:00 | Lun, Mer: 16:00 - 19:00 | Jeu, Ven: Fermé',
    description: 'Retrouvez notre équipe d\'experts à Blida pour un coaching de précision combinant électrostimulation haut de gamme et Wonder Sculpting.',
    slug: 'blida',
    status: 'Femmes uniquement',
    importantNotes: [
      'Horaires d’ouverture adaptés aux créneaux réservés aux femmes.',
      'Vous devez prendre vos rdv LA VEILLE avant 21h30, pas le jour même.',
      'Les réservations se font par heure complète (Ex : 10h à 11h et non 10h30 à 11h30).',
      'Il peut y avoir un décalage de votre rdv dû au fuseau horaire, mais l’heure que vous avez sélectionnée est la bonne donc c’est confirmé.',
      '⚠️🚨 IMPORTANT : Vous devez absolument recevoir votre reçu de paiement pour valider votre paiement directement à notre centre.'
    ],
    menHours: ['Fermé / Indisponible'],
    womenHours: [
      'Dimanche : 9h00 à 17h00',
      'Lundi : 16h00 à 19h00',
      'Mardi : 13h00 à 19h00',
      'Mercredi : 16h00 à 19h00',
      'Samedi : 9h00 à 17h00',
      'Jeudi et Vendredi : Fermé'
    ],
    equipment: [
      'Un tee shirt manches longues et d’un bas fin en coton',
      'Une paire de basket propre',
      'Un change pour repartir'
    ],
    cancellationRule: 'Veuillez noter que si vous ne pouvez pas assister à votre séance, il est important d’annuler au moins 1 heure à l’avance pour éviter que le système ne déduise le crédit de votre forfait en cours. Merci'
  },
  {
    id: 'center-4',
    name: 'AQ8 Tlemcen',
    city: 'Tlemcen',
    address: 'Boulevard Mohamed V, Tlemcen',
    phone: '+213 555 856 097',
    email: 'tlemcen@aq8algerie.com',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop',
    services: ['aq8', 'wonder'],
    schedule: 'Samedi - Jeudi : 09:00 - 23:00 | Vendredi : Fermé',
    description: 'La technologie d\'électrostimulation sans fil AQ8 débarque à Tlemcen. Gagnez du temps et sublimez votre silhouette de manière efficace.',
    slug: 'tlemcen',
    status: 'Ouvert',
    importantNotes: [
      'Vous devez prendre vos rdv LA VEILLE avant 21h30, pas le jour même.',
      'Les réservations se font par heure complète (Ex : 10h à 11h et non 10h30 à 11h30).',
      'Il peut y avoir un décalage de votre rdv dû au fuseau horaire, mais l’heure que vous avez sélectionnée est la bonne donc c’est confirmé.',
      '⚠️🚨 IMPORTANT : Vous devez absolument recevoir votre reçu de paiement pour valider votre paiement directement à notre centre.'
    ],
    menHours: ['de 17h30 à 23h00'],
    womenHours: ['de 9h00 à 17h00'],
    equipment: [
      'Un tee shirt manches longues et d’un bas fin en coton',
      'Une paire de basket propre',
      'Un change pour repartir'
    ],
    cancellationRule: 'Veuillez noter que si vous ne pouvez pas assister à votre séance, il est important d’annuler au moins 1 heure à l’avance pour éviter que le système ne déduise le crédit de votre forfait en cours. Merci'
  },
  {
    id: 'center-5',
    name: 'AQ8 Sidi Yahia',
    city: 'Alger',
    address: 'Avenue Sidi Yahia, Hydra, Alger',
    phone: '+213 5 53021714',
    email: 'sidiyahia@aq8algerie.com',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
    services: ['aq8', 'wonder'],
    schedule: 'Samedi : 10:00 - 21:00 | Dimanche - Jeudi : 09:00 - 21:00 | Vendredi : Fermé',
    description: 'Un espace premium et épuré sur l\'avenue emblématique de Sidi Yahia, parfait pour un coaching de haut niveau sur mesure.',
    slug: 'sidi-yahia',
    status: 'Ouvert',
    importantNotes: [
      'Vous devez prendre vos rdv LA VEILLE avant 21h30, pas le jour même.',
      'Les réservations se font par heure complète (Ex : 10h à 11h et non 10h30 à 11h30).',
      'Il peut y avoir un décalage de votre rdv dû au fuseau horaire, mais l’heure que vous avez sélectionnée est la bonne donc c’est confirmé.',
      '⚠️🚨 IMPORTANT : Vous devez absolument recevoir votre reçu de paiement pour valider votre paiement directement à notre centre.'
    ],
    menHours: [
      'de 14h00 à 17h00 (Dimanche - Jeudi)',
      'de 19h00 à 21h00 (Dimanche - Jeudi)',
      'de 16h00 à 21h00 (Samedi)'
    ],
    womenHours: [
      'de 9h00 à 14h00 (Dimanche - Jeudi)',
      'de 17h00 à 19h00 (Dimanche - Jeudi)',
      'de 10h00 à 16h00 (Samedi)'
    ],
    equipment: [
      'Un tee shirt manches longues et d’un bas fin en coton',
      'Une paire de basket propre',
      'Un change pour repartir'
    ],
    cancellationRule: 'Veuillez noter que si vous ne pouvez pas assister à votre séance, il est important d’annuler au moins 1 heure à l’avance pour éviter que le système ne déduise le crédit de votre forfait en cours. Merci'
  }
];

export const INITIAL_MANAGERS: CenterManager[] = [
  {
    id: 'mgr-1',
    name: 'Karim Benchikh',
    email: 'karim@aq8algerie.com',
    centerId: 'center-1',
    active: true
  },
  {
    id: 'mgr-2',
    name: 'Amel Mansouri',
    email: 'amel@aq8algerie.com',
    centerId: 'center-2',
    active: true
  },
  {
    id: 'mgr-3',
    name: 'Yacine Belhadj',
    email: 'yacine@aq8algerie.com',
    centerId: 'center-3',
    active: true
  },
  {
    id: 'mgr-4',
    name: 'Sofiane Haddad',
    email: 'sofiane@aq8algerie.com',
    centerId: 'center-4',
    active: true
  },
  {
    id: 'mgr-5',
    name: 'Nassim Meziane',
    email: 'nassim@aq8algerie.com',
    centerId: 'center-5',
    active: true
  }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'AQ8 Électrostimulation (EMS)',
    type: 'aq8',
    duration: 20,
    price: 3500,
    description: 'Séance de 20 minutes équivalant à 4 heures de sport intensif. Stimule 350 muscles simultanément.'
  },
  {
    id: 'srv-2',
    name: 'AQ8 EMS - Coaching Privé Duo',
    type: 'aq8',
    duration: 30,
    price: 5500,
    description: 'Partagez votre séance avec un ami avec les conseils d\'un coach certifié.'
  },
  {
    id: 'srv-3',
    name: 'Wonder Body Sculpting',
    type: 'wonder',
    duration: 25,
    price: 4500,
    description: 'Technologie de musculation passive ciblée. Brûle les graisses et tonifie les muscles profonds.'
  },
  {
    id: 'srv-4',
    name: 'Cure Combinée AQ8 + Wonder',
    type: 'aq8',
    duration: 45,
    price: 7000,
    description: 'Le summum de l\'innovation : 20 minutes d\'EMS suivies de 25 minutes de modelage Wonder.'
  }
];

export const INITIAL_PACKAGES: Package[] = [
  {
    id: 'pkg-1',
    name: 'Forfait AQ8 Découverte (5 Séances)',
    type: 'aq8',
    sessionsCount: 5,
    price: 15000,
    description: 'Idéal pour s\'initier à l\'électrostimulation AQ8 et ressentir les premiers résultats.'
  },
  {
    id: 'pkg-2',
    name: 'Forfait AQ8 Vitalité (10 Séances)',
    type: 'aq8',
    sessionsCount: 10,
    price: 27000,
    description: 'Notre best-seller. Idéal pour une perte de poids et un renforcement musculaire visible.'
  },
  {
    id: 'pkg-3',
    name: 'Forfait Wonder Intensity (10 Séances)',
    type: 'wonder',
    sessionsCount: 10,
    price: 38000,
    description: '10 séances intensives Wonder pour remodeler fessiers, abdos et cuisses sans effort.'
  },
  {
    id: 'pkg-4',
    name: 'Cure Royal Slim & Sculpt (20 Séances Mixte)',
    type: 'mix',
    sessionsCount: 20,
    price: 65000,
    description: 'Cure de choc combinant 10 séances d\'EMS AQ8 et 10 séances Wonder.'
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    firstName: 'Yasmine',
    lastName: 'Merabet',
    email: 'yasmine.merabet@gmail.com',
    phone: '0550 12 34 56',
    centerId: 'center-1',
    createdAt: '2026-05-10',
    notes: 'Objectif : amincissement post-grossesse. Sensible au bas du dos.',
    gender: 'F'
  },
  {
    id: 'cli-2',
    firstName: 'Mohamed',
    lastName: 'Khaldi',
    email: 'mohamed.khaldi@outlook.com',
    phone: '0661 98 76 54',
    centerId: 'center-1',
    createdAt: '2026-05-15',
    notes: 'Objectif : renforcement musculaire et soulagement lombalgie.',
    gender: 'H'
  },
  {
    id: 'cli-3',
    firstName: 'Selma',
    lastName: 'Oussad',
    email: 'selma.o@gmail.com',
    phone: '0770 44 55 66',
    centerId: 'center-1',
    createdAt: '2026-06-01',
    notes: 'Adore le Wonder Sculpting pour les fessiers. Séance régulière.',
    gender: 'F'
  },
  {
    id: 'cli-4',
    firstName: 'Fares',
    lastName: 'Brahimi',
    email: 'f.brahimi@hotmail.com',
    phone: '0555 88 99 00',
    centerId: 'center-2',
    createdAt: '2026-06-12',
    notes: 'Cadre pressé, préfère les créneaux du soir (19h).',
    gender: 'H'
  },
  {
    id: 'cli-5',
    firstName: 'Amira',
    lastName: 'Zeghdoud',
    email: 'amira.z@gmail.com',
    phone: '0662 11 22 33',
    centerId: 'center-3',
    createdAt: '2026-06-20',
    notes: 'Objectif : raffermissement de la silhouette avant l\'été.',
    gender: 'F'
  }
];

export const INITIAL_CLIENT_PACKAGES: ClientPackage[] = [
  {
    id: 'clipkg-1',
    clientId: 'cli-1',
    packageId: 'pkg-2', // AQ8 Vitalité (10 Séances)
    centerId: 'center-1',
    sessionsRemaining: 6,
    totalSessions: 10,
    purchaseDate: '2026-05-10',
    status: 'active'
  },
  {
    id: 'clipkg-2',
    clientId: 'cli-2',
    packageId: 'pkg-1', // AQ8 Découverte (5 Séances)
    centerId: 'center-1',
    sessionsRemaining: 0,
    totalSessions: 5,
    purchaseDate: '2026-05-15',
    status: 'completed'
  },
  {
    id: 'clipkg-3',
    clientId: 'cli-3',
    packageId: 'pkg-3', // Wonder Intensity (10 Séances)
    centerId: 'center-1',
    sessionsRemaining: 8,
    totalSessions: 10,
    purchaseDate: '2026-06-01',
    status: 'active'
  },
  {
    id: 'clipkg-4',
    clientId: 'cli-4',
    packageId: 'pkg-2', // AQ8 Vitalité (10)
    centerId: 'center-2',
    sessionsRemaining: 9,
    totalSessions: 10,
    purchaseDate: '2026-06-12',
    status: 'active'
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    clientId: 'cli-1',
    packageId: 'pkg-2',
    centerId: 'center-1',
    amount: 27000,
    date: '2026-05-10',
    method: 'cash',
    receiptNumber: 'REC-2026-001'
  },
  {
    id: 'pay-2',
    clientId: 'cli-2',
    packageId: 'pkg-1',
    centerId: 'center-1',
    amount: 15000,
    date: '2026-05-15',
    method: 'ccp',
    receiptNumber: 'REC-2026-002'
  },
  {
    id: 'pay-3',
    clientId: 'cli-3',
    packageId: 'pkg-3',
    centerId: 'center-1',
    amount: 38000,
    date: '2026-06-01',
    method: 'cheque',
    receiptNumber: 'CHQ-77890'
  },
  {
    id: 'pay-4',
    clientId: 'cli-4',
    packageId: 'pkg-2',
    centerId: 'center-2',
    amount: 27000,
    date: '2026-06-12',
    method: 'cash',
    receiptNumber: 'REC-2026-003'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    clientId: 'cli-1',
    serviceId: 'srv-1',
    centerId: 'center-1',
    dateTime: '2026-07-08T09:00',
    duration: 20,
    status: 'completed',
    notes: 'Excellente forme, augmentation de l\'intensité des cuisses.'
  },
  {
    id: 'apt-2',
    clientId: 'cli-2',
    serviceId: 'srv-1',
    centerId: 'center-1',
    dateTime: '2026-07-08T10:30',
    duration: 20,
    status: 'booked',
    notes: 'Vient pour sa 4ème séance.'
  },
  {
    id: 'apt-3',
    clientId: 'cli-3',
    serviceId: 'srv-3',
    centerId: 'center-1',
    dateTime: '2026-07-08T14:00',
    duration: 25,
    status: 'booked',
    notes: 'Focus abdos.'
  },
  {
    id: 'apt-4',
    clientId: 'cli-1',
    serviceId: 'srv-1',
    centerId: 'center-1',
    dateTime: '2026-07-09T09:00',
    duration: 20,
    status: 'booked',
    notes: 'Séance matinale.'
  },
  {
    id: 'apt-5',
    clientId: 'cli-4',
    serviceId: 'srv-1',
    centerId: 'center-2',
    dateTime: '2026-07-08T18:30',
    duration: 20,
    status: 'booked'
  }
];

export const INITIAL_MEASUREMENTS: Measurement[] = [
  // Evolution of client 1 over 3 months
  {
    id: 'meas-1',
    clientId: 'cli-1',
    centerId: 'center-1',
    date: '2026-05-10',
    weight: 74.5,
    bodyFat: 32.4,
    muscleMass: 24.1,
    chest: 98,
    waist: 84,
    hips: 108,
    thighs: 62,
    loggedBy: 'Karim Benchikh'
  },
  {
    id: 'meas-2',
    clientId: 'cli-1',
    centerId: 'center-1',
    date: '2026-06-10',
    weight: 71.2,
    bodyFat: 30.1,
    muscleMass: 25.3,
    chest: 96,
    waist: 80,
    hips: 105,
    thighs: 59,
    loggedBy: 'Karim Benchikh'
  },
  {
    id: 'meas-3',
    clientId: 'cli-1',
    centerId: 'center-1',
    date: '2026-07-08',
    weight: 68.4,
    bodyFat: 27.8,
    muscleMass: 26.8,
    chest: 94,
    waist: 75,
    hips: 101,
    thighs: 56,
    loggedBy: 'Karim Benchikh'
  },
  // Evolution of client 2
  {
    id: 'meas-4',
    clientId: 'cli-2',
    centerId: 'center-1',
    date: '2026-05-15',
    weight: 88.0,
    bodyFat: 26.5,
    muscleMass: 31.0,
    chest: 104,
    waist: 96,
    hips: 106,
    thighs: 60,
    loggedBy: 'Karim Benchikh'
  },
  {
    id: 'meas-5',
    clientId: 'cli-2',
    centerId: 'center-1',
    date: '2026-06-15',
    weight: 85.5,
    bodyFat: 24.2,
    muscleMass: 32.5,
    chest: 103,
    waist: 92,
    hips: 104,
    thighs: 58,
    loggedBy: 'Karim Benchikh'
  }
];

export const INITIAL_SETTINGS: GeneralSettings = {
  appName: 'AQ8 Algérie',
  contactEmail: 'contact@aq8algerie.com',
  contactPhone: '+213 (0) 23 48 50 60',
  addressAlgérie: '12 Rue des Glycines, Hydra, Alger',
  currency: 'DZD',
  enableVoucherPromo: true
};

// LocalStorage Persistence Wrapper
export class AQ8Database {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`aq8_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  static save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`aq8_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save key ${key} to localStorage`, e);
    }
  }

  static getCenters(): Center[] {
    const saved = this.get('centers', INITIAL_CENTERS);
    const updated = saved.map(savedCenter => {
      const initial = INITIAL_CENTERS.find(c => c.id === savedCenter.id);
      if (initial) {
        return {
          ...savedCenter,
          name: initial.name,
          city: initial.city,
          address: initial.address,
          schedule: initial.schedule,
          importantNotes: initial.importantNotes,
          menHours: initial.menHours,
          womenHours: initial.womenHours,
          equipment: initial.equipment,
          cancellationRule: initial.cancellationRule,
          status: initial.status
        };
      }
      return savedCenter;
    });
    if (typeof localStorage !== 'undefined') {
      this.save('centers', updated);
    }
    return updated;
  }

  static saveCenters(data: Center[]): void {
    this.save('centers', data);
  }

  static getManagers(): CenterManager[] {
    return this.get('managers', INITIAL_MANAGERS);
  }

  static saveManagers(data: CenterManager[]): void {
    this.save('managers', data);
  }

  static getServices(): Service[] {
    return this.get('services', INITIAL_SERVICES);
  }

  static saveServices(data: Service[]): void {
    this.save('services', data);
  }

  static getPackages(): Package[] {
    return this.get('packages', INITIAL_PACKAGES);
  }

  static savePackages(data: Package[]): void {
    this.save('packages', data);
  }

  static getClients(): Client[] {
    return this.get('clients', INITIAL_CLIENTS);
  }

  static saveClients(data: Client[]): void {
    this.save('clients', data);
  }

  static getClientPackages(): ClientPackage[] {
    return this.get('client_packages', INITIAL_CLIENT_PACKAGES);
  }

  static saveClientPackages(data: ClientPackage[]): void {
    this.save('client_packages', data);
  }

  static getPayments(): Payment[] {
    return this.get('payments', INITIAL_PAYMENTS);
  }

  static savePayments(data: Payment[]): void {
    this.save('payments', data);
  }

  static getAppointments(): Appointment[] {
    return this.get('appointments', INITIAL_APPOINTMENTS);
  }

  static saveAppointments(data: Appointment[]): void {
    this.save('appointments', data);
  }

  static getMeasurements(): Measurement[] {
    return this.get('measurements', INITIAL_MEASUREMENTS);
  }

  static saveMeasurements(data: Measurement[]): void {
    this.save('measurements', data);
  }

  static getSettings(): GeneralSettings {
    return this.get('settings', INITIAL_SETTINGS);
  }

  static saveSettings(data: GeneralSettings): void {
    this.save('settings', data);
  }

  // Helper reset routine
  static clearAndReset(): void {
    localStorage.removeItem('aq8_centers');
    localStorage.removeItem('aq8_managers');
    localStorage.removeItem('aq8_services');
    localStorage.removeItem('aq8_packages');
    localStorage.removeItem('aq8_clients');
    localStorage.removeItem('aq8_client_packages');
    localStorage.removeItem('aq8_payments');
    localStorage.removeItem('aq8_appointments');
    localStorage.removeItem('aq8_measurements');
    localStorage.removeItem('aq8_settings');
  }
}
