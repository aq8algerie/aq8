"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Flame,
  ShieldCheck,
  Award,
  ChevronRight,
  Clock,
} from "lucide-react";

type ObjectiveId = "sculpting" | "weightloss" | "back" | "express";
type FrequencyId = "1x" | "2x" | "3x";
type ZoneId = "full" | "abs" | "glutes" | "back_zone";

interface ObjectiveOption {
  id: ObjectiveId;
  title: string;
  subtitle: string;
  icon: typeof Target;
  badge: string;
}

const OBJECTIVES: ObjectiveOption[] = [
  {
    id: "sculpting",
    title: "Sculpting & Tonification Ciblée",
    subtitle: "Raffermir le ventre, sculpter et rehausser les fessiers",
    icon: Target,
    badge: "Haute Définition",
  },
  {
    id: "weightloss",
    title: "Perte de Poids & Brûle-Graisses",
    subtitle: "Activer le métabolisme et solliciter 350 muscles simultanément",
    icon: Flame,
    badge: "Calorie Burn",
  },
  {
    id: "back",
    title: "Soulagement du Dos & Posture",
    subtitle: "Renforcer les muscles profonds du dos sans solliciter les articulations",
    icon: ShieldCheck,
    badge: "Santé & Bien-être",
  },
  {
    id: "express",
    title: "Résultats Express & Galbe Maximal",
    subtitle: "Combinaison ultime des 2 technologies pour une transformation rapide",
    icon: Zap,
    badge: "Formule Synergie",
  },
];

const FREQUENCIES = [
  { id: "1x" as FrequencyId, label: "1 séance par semaine", sub: "Maintien & découverte" },
  { id: "2x" as FrequencyId, label: "2 séances par semaine", sub: "Recommandé pour résultats rapides", popular: true },
  { id: "3x" as FrequencyId, label: "3 séances par semaine", sub: "Programme intensif sur-mesure" },
];

const ZONES = [
  { id: "full" as ZoneId, label: "Corps Entier (350 muscles)", icon: Zap },
  { id: "abs" as ZoneId, label: "Abdominaux & Sangle abdominale", icon: Target },
  { id: "glutes" as ZoneId, label: "Fessiers & Cuisses", icon: Flame },
  { id: "back_zone" as ZoneId, label: "Lombaires & Colonne vertébrale", icon: ShieldCheck },
];

interface Recommendation {
  techTitle: string;
  badge: string;
  matchScore: number;
  serviceQuery: string;
  tagline: string;
  durationPerSession: string;
  weeklyFreq: string;
  description: string;
  highlights: string[];
  gradient: string;
  image: string;
}

function calculateRecommendation(
  objective: ObjectiveId,
  frequency: FrequencyId,
  zone: ZoneId
): Recommendation {
  if (objective === "sculpting" || zone === "abs" || zone === "glutes") {
    if (objective === "express") {
      return {
        techTitle: "Cure Dual Tech (AQ8 EMS + Wonder Axion)",
        badge: "Recommandation Ultime",
        matchScore: 99,
        serviceQuery: "all",
        tagline: "L'alliance parfaite de l'effort actif et du travail électromagnétique ciblé",
        durationPerSession: "20 min EMS + 25 min Wonder Axion",
        weeklyFreq: frequency === "3x" ? "3 séances / semaine" : "2 séances / semaine",
        description: "Bénéficiez du meilleur des deux mondes : l'AQ8 EMS pour la dépense calorique et le métabolisme global, associé à Wonder Axion pour galber intensément les zones rebelles.",
        highlights: [
          "Dépense calorique globale + 52 000 contractions ciblées",
          "Résultats mesurables dès les 4 premières semaines",
          "Accompagnement et bilan corporel personnalisé avec un coach certifié",
        ],
        gradient: "from-[#242424] via-[#2d2d2d] to-[#0284c7]/20",
        image: "/images/prestations/wonder-ems.webp",
      };
    }
    return {
      techTitle: "Wonder Axion",
      badge: "Recommandé à 98%",
      matchScore: 98,
      serviceQuery: "wonder",
      tagline: "Remodelage musculaire ciblé et tonification supramaximale",
      durationPerSession: "25 minutes par séance",
      weeklyFreq: frequency === "1x" ? "1 à 2 séances / semaine" : "2 séances / semaine",
      description: "Idéal pour cibler spécifiquement l'abdomen, les fessiers ou les cuisses. Les émissions électromagnétiques supramaximales déclenchent jusqu'à 52 000 contractions profondes par séance.",
      highlights: [
        "Hypertrophie ciblée et effet push-up sur les fessiers",
        "Raffermissement de la sangle abdominale sans effort articulaire",
        "Séance confortable en position allongée ou semi-assise",
      ],
      gradient: "from-[#1a1a1a] to-[#343434]",
      image: "/images/prestations/wonder-ems.webp",
    };
  }

  if (objective === "back") {
    return {
      techTitle: "AQ8 EMS Spécial Posture & Dos",
      badge: "Recommandé à 97%",
      matchScore: 97,
      serviceQuery: "aq8",
      tagline: "Renforcement profond du dos et correction de la posture sans charge",
      durationPerSession: "20 minutes par séance",
      weeklyFreq: "1 à 2 séances / semaine",
      description: "Une stimulation ciblée des muscles paravertébraux et de la sangle abdominale profonde pour soulager les tensions lombaires et fortifier le maintien dorsal.",
      highlights: [
        "Activation sans poids ni contrainte sur les vertèbres",
        "Réduction progressive des douleurs de posture",
        "Supervision individuelle par un coach formé au dos",
      ],
      gradient: "from-[#1a2332] to-[#243447]",
      image: "/images/prestations/aq8.webp",
    };
  }

  // Default: Weightloss or General
  if (objective === "express") {
    return {
      techTitle: "Cure Combinée Dual Tech AQ8",
      badge: "Super Match 99%",
      matchScore: 99,
      serviceQuery: "all",
      tagline: "Transformation corporelle rapide et synergie maximale",
      durationPerSession: "45 minutes combinées",
      weeklyFreq: "2 à 3 séances / semaine",
      description: "Combinez la puissance du coaching dynamique AQ8 EMS avec la définition musculaire profonde Wonder Axion pour un changement de silhouette visible et durable.",
      highlights: [
        "Dépense énergétique maximale & métabolisme stimulé",
        "Sculpting ciblé sur les zones réfractaires",
        "Suivi de mensurations hebdomadaire en centre",
      ],
      gradient: "from-[#242424] to-[#1e293b]",
      image: "/images/prestations/aq8.webp",
    };
  }

  return {
    techTitle: "AQ8 EMS Intégral",
    badge: "Recommandé à 96%",
    matchScore: 96,
    serviceQuery: "aq8",
    tagline: "Électrostimulation globale active — 350 muscles stimulés",
    durationPerSession: "20 minutes (équivalent 4h de sport)",
    weeklyFreq: frequency === "3x" ? "2 à 3 séances / semaine" : "2 séances / semaine",
    description: "Une méthode révolutionnaire d'entraînement où 350 muscles sont sollicités simultanément. Un travail cardio et musculaire complet guidé par votre coach privé.",
    highlights: [
      "Brûle-graisses intense et tonification corporelle complète",
      "Gain de temps imbattable : 20 minutes seulement",
      "Coach dédié qui adapte l'intensité à votre niveau",
    ],
    gradient: "from-[#242424] to-[#1f1f1f]",
    image: "/images/prestations/aq8.webp",
  };
}

export function HomeProgramSimulator() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveId>("sculpting");
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyId>("2x");
  const [selectedZone, setSelectedZone] = useState<ZoneId>("full");

  const recommendation = calculateRecommendation(selectedObjective, selectedFrequency, selectedZone);

  const resetSimulator = () => {
    setStep(1);
    setSelectedObjective("sculpting");
    setSelectedFrequency("2x");
    setSelectedZone("full");
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-10 lg:p-12">
      {/* Background Subtle Accent Gradients */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#0284c7]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-slate-900/5 blur-3xl" />

      {/* Header Info */}
      <div className="relative z-10 mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0284c7]/20 bg-[#f0f9ff] px-4 py-1.5 text-xs font-extrabold uppercase text-[#0284c7] shadow-sm">
          <Sparkles className="h-4 w-4" />
          Bilan Interactif Gratuit
        </div>
        <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-[#242424] tracking-tight">
          Trouvez votre programme idéal en 3 clics
        </h2>
        <p className="text-xs sm:text-base font-normal text-slate-600 leading-relaxed max-w-xl mx-auto">
          Répondez à 3 questions rapides pour découvrir quelle technologie (AQ8 EMS, Wonder Axion ou Cure Combinée) correspond parfaitement à vos objectifs.
        </p>

        {/* Stepper Progress Bar */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2 px-1">
            <span className={step >= 1 ? "text-[#0284c7]" : ""}>1. Objectif</span>
            <span className={step >= 2 ? "text-[#0284c7]" : ""}>2. Fréquence</span>
            <span className={step >= 3 ? "text-[#0284c7]" : ""}>3. Zone</span>
            <span className={step === 4 ? "text-[#0284c7]" : ""}>4. Résultat</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-[#0284c7] transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* STEP 1: OBJECTIVES */}
      {step === 1 && (
        <div className="relative z-10 mt-10 space-y-6 animate-fadeIn">
          <h3 className="text-center font-display text-lg font-bold text-[#242424]">
            Quel est votre objectif prioritaire ?
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              const isSelected = selectedObjective === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => setSelectedObjective(obj.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl p-5 text-left transition-all duration-300 border ${
                    isSelected
                      ? "border-[#0284c7] bg-[#f0f9ff] shadow-lg ring-2 ring-[#0284c7]/20 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                          isSelected ? "bg-[#0284c7] text-white" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 uppercase">
                        {obj.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display text-sm font-bold text-[#242424]">
                        {obj.title}
                      </h4>
                      <p className="mt-1 text-xs font-normal text-slate-500 leading-relaxed">
                        {obj.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#0284c7]">
                    <span>Sélectionner</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "translate-x-1" : ""}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0369a1] hover:scale-105"
            >
              <span>Étape suivante</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FREQUENCY */}
      {step === 2 && (
        <div className="relative z-10 mt-10 space-y-6 animate-fadeIn max-w-2xl mx-auto">
          <h3 className="text-center font-display text-lg font-bold text-[#242424]">
            Quelle est votre disponibilité par semaine ?
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FREQUENCIES.map((freq) => {
              const isSelected = selectedFrequency === freq.id;
              return (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => setSelectedFrequency(freq.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl p-5 text-center transition-all duration-300 border ${
                    isSelected
                      ? "border-[#0284c7] bg-[#f0f9ff] shadow-lg ring-2 ring-[#0284c7]/20 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {freq.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0284c7] px-3 py-0.5 text-[10px] font-extrabold text-white uppercase shadow-md">
                      Populaire
                    </span>
                  )}
                  <div className="space-y-2 pt-1">
                    <Clock className={`mx-auto h-7 w-7 ${isSelected ? "text-[#0284c7]" : "text-slate-400"}`} />
                    <h4 className="font-display text-sm font-bold text-[#242424]">
                      {freq.label}
                    </h4>
                    <p className="text-xs font-medium text-slate-500">
                      {freq.sub}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0369a1] hover:scale-105"
            >
              <span>Étape suivante</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ZONES */}
      {step === 3 && (
        <div className="relative z-10 mt-10 space-y-6 animate-fadeIn max-w-2xl mx-auto">
          <h3 className="text-center font-display text-lg font-bold text-[#242424]">
            Quelle est votre zone corporelle prioritaire ?
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ZONES.map((zone) => {
              const Icon = zone.icon;
              const isSelected = selectedZone === zone.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZone(zone.id)}
                  className={`group relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300 border ${
                    isSelected
                      ? "border-[#0284c7] bg-[#f0f9ff] shadow-lg ring-2 ring-[#0284c7]/20 scale-[1.02]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isSelected ? "bg-[#0284c7] text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-sm font-bold text-[#242424]">
                    {zone.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-7 py-3 text-sm font-bold text-white shadow-xl transition-all hover:bg-[#0369a1] hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
              <span>Voir mon bilan recommandé</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RECOMMENDATION RESULT */}
      {step === 4 && (
        <div className="relative z-10 mt-8 space-y-8 animate-fadeIn">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1e1e1e] text-white shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left Details */}
              <div className="p-6 sm:p-8 lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0284c7] px-3 py-1 text-xs font-black uppercase text-white shadow-md">
                    <Award className="h-3.5 w-3.5" />
                    {recommendation.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {recommendation.matchScore}% de compatibilité
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-2xl sm:text-3xl font-black text-white">
                    {recommendation.techTitle}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-300">
                    {recommendation.tagline}
                  </p>
                </div>

                <p className="text-xs sm:text-sm font-normal text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
                  {recommendation.description}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">Durée séance</span>
                    <span className="block text-xs font-bold text-white mt-0.5">{recommendation.durationPerSession}</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase">Fréquence conseillée</span>
                    <span className="block text-xs font-bold text-[#38bdf8] mt-0.5">{recommendation.weeklyFreq}</span>
                  </div>
                </div>

                {/* Bullet Highlights */}
                <div className="space-y-2.5 pt-2">
                  {recommendation.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs font-medium text-slate-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0284c7] mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
                  <Link
                    href={`/reservation?service=${recommendation.serviceQuery}&objective=${selectedObjective}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0369a1] hover:scale-105"
                  >
                    <span>Réserver mon bilan gratuit</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={resetSimulator}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Recommencer</span>
                  </button>
                </div>
              </div>

              {/* Right Image Cover */}
              <div className="relative min-h-[260px] lg:col-span-5 overflow-hidden bg-slate-900">
                <img
                  src={recommendation.image}
                  alt={recommendation.techTitle}
                  className="h-full w-full object-cover opacity-85 transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#1e1e1e] lg:via-transparent lg:to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/60 p-3.5 backdrop-blur-md border border-white/10 text-white text-xs space-y-1">
                  <span className="block font-bold text-white">Centre AQ8 le plus proche</span>
                  <span className="block text-[11px] text-slate-300">Birkhadem, Ouled Fayet, Blida, Tlemcen & partenaires</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
