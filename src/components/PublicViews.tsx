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

