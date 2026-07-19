/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";
import { Aq8Simulator } from "../../../components/aq8/Aq8Simulator";

export const metadata: Metadata = {
  title: getSeoForPage("aq8").title,
  description: getSeoForPage("aq8").description,
};

const benefits = [
  {
    title: "Séance active et encadrée",
    desc: "Le client réalise des mouvements guidés pendant que la stimulation accompagne l’effort, sous la supervision de l’équipe du centre.",
    icon: Activity,
  },
  {
    title: "Intensité personnalisée",
    desc: "L’intensité est ajustée progressivement selon le profil, les sensations et les objectifs de remise en forme.",
    icon: ShieldCheck,
  },
  {
    title: "Travail musculaire global",
    desc: "AQ8 accompagne un travail de tonification, de posture, de renforcement et de suivi corporel.",
    icon: Dumbbell,
  },
];

const objectives = [
  "Tonification musculaire",
  "Remise en forme progressive",
  "Accompagnement sportif encadré",
  "Suivi corporel personnalisé",
  "Travail postural",
  "Renforcement global",
];

const steps = [
  "Accueil et échange avec l’équipe du centre",
  "Préparation de l’équipement AQ8",
  "Réglage progressif de l’intensité",
  "Séance active avec mouvements encadrés",
  "Retour sur les sensations et conseils pratiques",
];

export default function Aq8Page() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-lg bg-[#353535] px-4 py-10 xs:px-6 xs:py-14 sm:px-10 lg:px-14 lg:py-20 text-white">
          <Image
            src="/images/prestations/aq8.webp"
            alt="Séance AQ8 EMS dans un centre AQ8 Algérie"
            width={1600}
            height={900}
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#202025]/65" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#353535]/90 via-[#353535]/55 to-[#ff5757]/25" />

          <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center justify-center space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
              <Zap className="h-3.5 w-3.5" />
              Technologie AQ8 EMS
            </span>

            <div className="space-y-5 max-w-3xl mx-auto">
              <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                AQ8 EMS — électrostimulation active et encadrée
              </h1>

              <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                Découvrez AQ8, une approche d’électrostimulation active pensée
                pour accompagner la remise en forme, la tonification musculaire
                et le suivi corporel dans les centres AQ8 Algérie.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center w-full sm:w-auto">
              <Link
                href="/centres"
                aria-label="Trouver un centre AQ8 en Algérie"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#e94949]"
              >
                Trouver un centre
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/wonder"
                aria-label="Découvrir Wonder Sculpt"
                className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
              >
                Découvrir Wonder
              </Link>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
              <Sparkles className="h-3.5 w-3.5" />
              Électrostimulation active
            </span>

            <h2 className="font-display text-2xl font-bold text-[#353535] sm:text-3xl lg:text-4xl">
              Qu’est-ce que AQ8 EMS ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              AQ8 EMS est une technologie d’électrostimulation utilisée pendant
              une séance active. Le client effectue des mouvements simples et
              guidés, tandis que la stimulation musculaire accompagne l’effort.
            </p>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              L’objectif est d’offrir un accompagnement structuré pour travailler
              la tonification, la remise en forme et le suivi corporel, avec une
              intensité adaptée progressivement.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 lg:col-span-7">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="rounded-lg border border-slate-100 bg-white p-6 transition-all"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#ff5757]/10 text-[#ff5757]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="font-display text-base font-bold text-[#353535]">
                    {benefit.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    {benefit.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Objectives */}
        <section className="rounded-lg border border-slate-100 bg-slate-50 px-6 py-12 sm:px-10 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="space-y-4 lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
                <Dumbbell className="h-3.5 w-3.5" />
                Objectifs possibles
              </span>

              <h2 className="font-display text-2xl font-bold text-[#353535] sm:text-3xl">
                Pour quels objectifs choisir AQ8 ?
              </h2>

              <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                AQ8 peut accompagner différents objectifs de remise en forme,
                selon le profil du client, sa régularité, ses habitudes de vie
                et les recommandations de l’équipe du centre.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              {objectives.map((objective) => (
                <div
                  key={objective}
                  className="flex items-center gap-3 rounded-md border border-slate-100 bg-white px-4 py-3"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#ff5757]" />
                  <span className="text-sm font-semibold text-slate-700">
                    {objective}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Simulator */}
        <Aq8Simulator />

        {/* Session process */}
        <section className="space-y-10">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
              <Clock className="h-3.5 w-3.5" />
              Déroulement
            </span>

            <h2 className="font-display text-2xl font-bold text-[#353535] sm:text-3xl lg:text-4xl">
              Comment se déroule une séance AQ8 ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Le déroulement peut varier selon le centre, mais l’expérience AQ8
              suit généralement une logique simple : accueil, préparation,
              séance encadrée et suivi.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, index) => (
              <article
                key={step}
                className="relative overflow-hidden rounded-lg border border-slate-100 bg-white p-6 transition-all"
              >
                <span className="absolute right-4 top-4 font-mono text-4xl font-black leading-none text-[#ff5757]/10">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#ff5757]/10 text-sm font-black text-[#ff5757]">
                    {index + 1}
                  </div>

                  <h3 className="text-sm font-bold leading-snug text-[#353535]">
                    {step}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Safety note */}
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#353535]">
                Bon à savoir avant une séance AQ8
              </h2>

              <p className="text-sm font-medium leading-relaxed text-slate-700">
                Les résultats peuvent varier selon le profil, la régularité des
                séances, l’hygiène de vie et l’accompagnement suivi. En cas de
                doute, de problème de santé, de grossesse, de dispositif médical
                implanté ou de contre-indication connue, il est recommandé de
                demander un avis médical avant toute séance d’électrostimulation.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-lg bg-[#353535] px-6 py-12 text-center text-white sm:px-10">

          <div className="relative z-10 mx-auto max-w-2xl space-y-5">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Envie d’essayer AQ8 EMS ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Consultez les centres AQ8 disponibles en Algérie, vérifiez les
              horaires, les prestations et envoyez votre demande de réservation.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/centres"
                aria-label="Trouver un centre AQ8"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#e94949]"
              >
                Trouver un centre
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/contact"
                aria-label="Contacter AQ8 Algérie"
                className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
