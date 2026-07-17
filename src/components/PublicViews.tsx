/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, CheckCircle, HelpCircle, MapPin, ShieldAlert, Sparkles } from 'lucide-react';
import { Center, Service } from '../types';
import { useSeo } from '../lib/seo';
import { SeoJsonLd } from './SeoJsonLd';

import { HomeHero } from '@/components/home/HomeHero';
import { HomeTechnologies } from '@/components/home/HomeTechnologies';
import { HomeCentersPreview } from '@/components/home/HomeCentersPreview';
import { HomeWhyChoose } from '@/components/home/HomeWhyChoose';
import { HomeHowItWorks } from '@/components/home/HomeHowItWorks';
import { HomeShortFAQ } from '@/components/home/HomeShortFAQ';
import { HomeFinalCTA } from '@/components/home/HomeFinalCTA';

import { PublicAQ8 } from './public/PublicAQ8';
import { PublicWonder } from './public/PublicWonder';
import { PublicCenters } from './public/PublicCenters';
import { PublicCenterDetail } from './public/PublicCenterDetail';
import { PublicContact } from './public/PublicContact';

export { PublicAQ8, PublicWonder, PublicCenters, PublicCenterDetail, PublicContact };

export function PublicAbout() {
  useSeo('about');

  const pillars = [
    { title: 'Encadrement', desc: 'Chaque centre accompagne ses clients avec des consignes claires, un suivi humain et une progression adaptee.', icon: ShieldAlert },
    { title: 'Technologies', desc: 'AQ8 EMS et Wonder reunissent deux approches complementaires : active, ciblee et encadree.', icon: Sparkles },
    { title: 'Reseau local', desc: 'Les centres gardent leurs horaires, capacites et informations publiques a jour depuis le CRM.', icon: MapPin },
  ];

  const faqItems = [
    { question: "Qu'est-ce que AQ8 EMS ?", answer: "AQ8 EMS est une approche d'electrostimulation musculaire active. Le client realise des mouvements encadres pendant que la stimulation accompagne l'effort, avec une intensite adaptee selon son profil et ses objectifs." },
    { question: 'Quelle est la difference entre AQ8 et Wonder ?', answer: "AQ8 est une seance active basee sur l'electrostimulation pendant le mouvement. Wonder est une approche de sculpting corporel cible pour accompagner la tonification et le suivi de certaines zones." },
    { question: 'Comment reserver une seance AQ8 ou Wonder ?', answer: "Il suffit de choisir un centre AQ8, de consulter ses horaires et consignes, puis d'envoyer une demande de reservation. L'equipe du centre recontacte ensuite le client pour confirmer le creneau selon les disponibilites." },
    { question: 'Combien de seances sont conseillees ?', answer: "La frequence depend du profil, des objectifs, de la prestation choisie et des recommandations de l'equipe du centre. Un premier echange permet d'orienter le client vers un rythme adapte." },
    { question: 'Faut-il apporter une tenue specifique ?', answer: 'Oui, certains centres peuvent demander une tenue ou des equipements precis. Les consignes exactes sont indiquees sur la page de chaque centre.' },
    { question: 'La seance est-elle douloureuse ?', answer: "La sensation varie selon les personnes et l'intensite choisie. L'equipe du centre adapte progressivement les reglages selon le profil, les sensations et le niveau de confort." },
    { question: 'Y a-t-il des contre-indications ?', answer: 'En cas de grossesse, pacemaker, dispositif medical implante, epilepsie, probleme cardiaque, trouble circulatoire ou doute medical, il est recommande de demander un avis medical avant toute seance.' },
    { question: 'Les resultats sont-ils garantis ?', answer: "Non. Les resultats peuvent varier selon le profil, la regularite des seances, l'hygiene de vie, les objectifs et l'accompagnement suivi." },
  ];

  return (
    <div className="space-y-16 py-0 sm:space-y-20">
      <SeoJsonLd type="faq" />
      <section className="grid gap-10 border-b border-slate-200 pb-12 lg:grid-cols-12 lg:items-end">
        <div className="space-y-5 lg:col-span-8">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]"><CheckCircle className="h-4 w-4" />A propos</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-[#242424] sm:text-5xl">AQ8 Algerie, une experience technologique claire et encadree.</h1>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">AQ8 Algerie accompagne ses clients avec des technologies EMS et Wonder, des centres de proximite et une reservation pensee pour etre simple, fiable et rassurante.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 lg:col-span-4">
          <p className="text-sm font-bold text-[#242424]">Positionnement</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">Une marque premium, mais accessible : des informations precises, des centres actifs et un parcours public sans friction.</p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[#ff5757]"><Icon className="h-5 w-5" /></div>
              <h2 className="font-display text-lg font-bold text-[#242424]">{pillar.title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{pillar.desc}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-8 rounded-lg border border-slate-200 bg-[#242424] p-6 text-white sm:p-8 lg:grid-cols-12 lg:items-center">
        <div className="space-y-4 lg:col-span-8">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]"><CheckCircle className="h-4 w-4" />Notre promesse</p>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Rendre la reservation et le suivi plus simples pour chaque client.</h2>
          <p className="text-sm font-medium leading-relaxed text-white/70 sm:text-base">Le site public permet de decouvrir les technologies, comparer les centres, consulter les informations pratiques et envoyer une demande de reservation au centre choisi.</p>
        </div>
        <div className="lg:col-span-4 lg:text-right">
          <a href="/centres" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-premium hover:bg-[#e94949]">Voir nos centres<ArrowRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3 text-center">
          <p className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[#ff5757]"><HelpCircle className="h-4 w-4" />Questions frequentes</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424]">Les reponses essentielles avant votre premiere seance.</h2>
          <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">Horaires, reservation, equipements et precautions peuvent varier selon le centre choisi. Cette section rassemble les informations generales les plus utiles.</p>
        </div>
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {faqItems.map((item, index) => (
            <details key={item.question} className="group p-5 sm:p-6" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <h3 className="font-display text-base font-bold text-[#242424] group-open:text-[#ff5757] sm:text-lg">{item.question}</h3>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#ff5757] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PublicHome({ onNavigate, onSelectCenter, centers }: { onNavigate: (route: any) => void; onSelectCenter: (id: string) => void; centers: Center[]; }) {
  useSeo('home');
  return (
    <div className="space-y-20 py-0 sm:space-y-24">
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
