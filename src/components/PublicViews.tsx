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

// Reusable FAQ components imported from modular files
import { PublicFAQ } from './public/PublicFAQ';
import { PublicAQ8 } from './public/PublicAQ8';
import { PublicWonder } from './public/PublicWonder';
import { PublicCenters } from './public/PublicCenters';
import { PublicCenterDetail } from './public/PublicCenterDetail';
import { PublicContact } from './public/PublicContact';

export {
  PublicFAQ,
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

  return (
    <div className="space-y-14 py-4">
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

