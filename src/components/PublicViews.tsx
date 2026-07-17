/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flame,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  Clock,
  Sparkles,
  Zap,
  Mail,
  Send,
  Sliders,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Center, Service } from '../types';
import { AQ8Database } from '../mockData';
import { useSeo } from '../lib/seo';
import { SeoJsonLd } from './SeoJsonLd';

// Import our modular homepage sections
import { HomeHero } from '@/components/home/HomeHero';
import { HomeTechnologies } from '@/components/home/HomeTechnologies';
import { HomeCentersPreview } from '@/components/home/HomeCentersPreview';
import { HomeWhyChoose } from '@/components/home/HomeWhyChoose';
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks';
import { HomeShortFAQ } from '@/components/home/HomeShortFAQ';
import { HomeFinalCTA } from '@/components/home/HomeFinalCTA';

// Reusable public page components imported from modular files
import { PublicAQ8 } from './public/PublicAQ8';
import { PublicWonder } from './public/PublicWonder';
import { PublicCenters } from './public/PublicCenters';
import { PublicCenterDetail } from './public/PublicCenterDetail';
import { PublicContact } from './public/PublicContact';

export {
  PublicAQ8,
  PublicWonder,
  PublicCenters,
  PublicCenterDetail,
  PublicContact
};


export function PublicAbout() {
  useSeo('about');

  const pillars = [
    {
      title: 'Une experience encadree',
      desc: 'Chaque centre accompagne ses clients avec des consignes claires, un suivi humain et une progression adaptee au profil.',
      icon: ShieldAlert,
    },
    {
      title: 'Deux technologies complementaires',
      desc: 'AQ8 EMS pour les seances actives, Wonder pour le sculpting cible : deux approches reunies dans une logique de remise en forme premium.',
      icon: Sparkles,
    },
    {
      title: 'Un reseau local organise',
      desc: 'Les centres AQ8 Algerie gardent leurs horaires, capacites et informations publiques a jour pour simplifier la reservation.',
      icon: MapPin,
    },
  ];

  const faqItems = [
    {
      question: 'Qu\u2019est-ce que AQ8 EMS ?',
      answer: 'AQ8 EMS est une approche d\u2019electrostimulation musculaire active. Le client realise des mouvements encadres pendant que la stimulation accompagne l\u2019effort, avec une intensite adaptee selon son profil et ses objectifs.',
    },
    {
      question: 'Quelle est la difference entre AQ8 et Wonder ?',
      answer: 'AQ8 est une seance active basee sur l\u2019electrostimulation pendant le mouvement. Wonder est une approche de sculpting corporel cible, generalement pratiquee en position allongee ou semi-assise, pour accompagner la tonification et le suivi de certaines zones.',
    },
    {
      question: 'Comment reserver une seance AQ8 ou Wonder ?',
      answer: 'Il suffit de choisir un centre AQ8, de consulter ses horaires et consignes, puis d\u2019envoyer une demande de reservation. L\u2019equipe du centre vous recontacte ensuite pour confirmer le creneau selon les disponibilites.',
    },
    {
      question: 'Combien de seances sont conseillees ?',
      answer: 'La frequence depend du profil, des objectifs, de la prestation choisie et des recommandations de l\u2019equipe du centre. Un premier echange permet d\u2019orienter le client vers un rythme adapte.',
    },
    {
      question: 'Faut-il apporter une tenue specifique ?',
      answer: 'Oui, certains centres peuvent demander une tenue ou des equipements precis : t-shirt manches longues, bas fin en coton, baskets propres ou tenue de rechange. Les consignes exactes sont indiquees sur la page de chaque centre.',
    },
    {
      question: 'La seance est-elle douloureuse ?',
      answer: 'La sensation varie selon les personnes et l\u2019intensite choisie. L\u2019equipe du centre adapte progressivement les reglages selon le profil, les sensations et le niveau de confort du client.',
    },
    {
      question: 'Y a-t-il des contre-indications ?',
      answer: 'En cas de grossesse, pacemaker, dispositif medical implante, epilepsie, probleme cardiaque, trouble circulatoire ou doute medical, il est recommande de demander un avis medical avant toute seance d\u2019electrostimulation ou de stimulation corporelle.',
    },
    {
      question: 'Les resultats sont-ils garantis ?',
      answer: 'Non. Les resultats peuvent varier selon le profil, la regularite des seances, l\u2019hygiene de vie, les objectifs et l\u2019accompagnement suivi. AQ8 Algerie privilegie une approche encadree, progressive et realiste.',
    },
    {
      question: 'Puis-je choisir entre AQ8 et Wonder ?',
      answer: 'Oui, selon les prestations disponibles dans le centre choisi. AQ8 est oriente vers une seance active encadree, tandis que Wonder accompagne davantage un travail cible de tonification et de suivi corporel.',
    },
    {
      question: 'Comment annuler ou modifier un rendez-vous ?',
      answer: 'Les conditions peuvent varier selon les centres. En general, il est preferable de prevenir le centre le plus tot possible. Certains centres peuvent appliquer une regle d\u2019annulation avec deduction d\u2019un credit en cas d\u2019absence non signalee dans les delais.',
    },
  ];

  return (
    <div className="space-y-14 py-4">
      <SeoJsonLd type="faq" />

      <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-6 py-14 text-white shadow-xl sm:px-10 lg:px-14">
        <div className="absolute inset-0 bg-gradient-to-br from-[#353535] via-[#353535]/95 to-[#ff5757]/30" />
        <div className="relative z-10 max-w-3xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <Info className="h-3.5 w-3.5" />
            {'\u00c0 propos'}
          </span>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            AQ8 Algerie, une approche premium de la remise en forme technologique
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            AQ8 Algerie accompagne ses clients avec des technologies EMS et Wonder, des centres de proximite et une experience pensee pour etre claire, encadree et rassurante.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#353535]">{pillar.title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{pillar.desc}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-10 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-4 lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <CheckCircle className="h-3.5 w-3.5" />
              Notre promesse
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
              Rendre la reservation et le suivi plus simples pour chaque client
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Le site public permet de decouvrir les technologies, comparer les centres, consulter les informations pratiques et envoyer une demande de reservation au centre choisi.
            </p>
          </div>
          <div className="lg:col-span-5">
            <a href="/centres" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-[#ff5757]/20 transition-premium hover:bg-[#e94949] sm:w-auto">
              Voir nos centres
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3 text-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <HelpCircle className="h-3.5 w-3.5" />
            Questions frequentes
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
            Les reponses essentielles avant votre premiere seance
          </h2>
          <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Horaires, reservation, equipements et precautions peuvent varier selon le centre choisi. Cette section rassemble les informations generales les plus utiles.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
          {faqItems.map((item, index) => (
            <details key={item.question} className="group border-b border-slate-100 py-5 last:border-b-0" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <h3 className="font-display text-base font-bold text-[#353535] transition-colors group-open:text-[#ff5757] sm:text-lg">
                  {item.question}
                </h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

// 1. Home / Accueil Component
export function PublicHome({
  onNavigate,
  onSelectCenter,
  centers
}: {
  onNavigate: (route: any) => void;
  onSelectCenter: (id: string) => void;
  centers: Center[];
}) {
  useSeo('home');

  return (
    <div className="space-y-16 py-4">
      <SeoJsonLd type="organization" />
      
      <HomeHero />
      <HomeTechnologies />
      <HomeCentersPreview centers={centers} />
      <HomeWhyChoose />
      <HomeHowItWorks />
      <HomeShortFAQ />
      <HomeFinalCTA />
    </div>
  );
}

