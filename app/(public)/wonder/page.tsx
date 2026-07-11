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
  Flame,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";
import { WonderCycle } from "../../../components/wonder/WonderCycle";

export const metadata: Metadata = {
  title: getSeoForPage("wonder").title,
  description: getSeoForPage("wonder").description,
};

const benefits = [
  {
    title: "Sculpting corporel ciblé",
    desc: "Wonder accompagne le travail de certaines zones comme les abdominaux, les cuisses ou les fessiers selon les objectifs du client.",
    icon: Target,
  },
  {
    title: "Séance guidée et encadrée",
    desc: "Le déroulement de la séance est adapté par l’équipe du centre selon le profil, les sensations et les consignes prévues.",
    icon: ShieldCheck,
  },
  {
    title: "Tonification et suivi corporel",
    desc: "Wonder s’intègre dans une démarche de tonification, de raffermissement et de suivi corporel personnalisé.",
    icon: Activity,
  },
];

const objectives = [
  "Tonification ciblée",
  "Suivi de la silhouette",
  "Accompagnement esthétique",
  "Raffermissement progressif",
  "Travail des abdominaux",
  "Travail des cuisses et fessiers",
];

const zones = [
  {
    title: "Abdominaux",
    desc: "Accompagnement ciblé de la zone abdominale dans une démarche de tonification et de suivi corporel.",
  },
  {
    title: "Fessiers",
    desc: "Travail orienté sur la tonicité et le galbe, selon le profil et les objectifs définis avec le centre.",
  },
  {
    title: "Cuisses",
    desc: "Approche ciblée pour accompagner le raffermissement et le suivi de la zone des cuisses.",
  },
];

export default function WonderPage() {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-4 py-10 xs:px-6 xs:py-14 sm:px-10 lg:px-14 lg:py-20 text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,87,87,0.20),transparent_55%)]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
          <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center justify-center space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <Flame className="h-3.5 w-3.5" />
              Wonder Sculpt
            </span>

            <div className="space-y-5 max-w-3xl mx-auto">
              <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Wonder — sculpting corporel ciblé et tonification
              </h1>

              <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                Découvrez Wonder, une approche de sculpting corporel pensée
                pour accompagner la tonification, le raffermissement et le
                suivi de zones ciblées dans les centres AQ8 Algérie.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center w-full sm:w-auto">
              <Link
                href="/centres"
                aria-label="Trouver un centre Wonder AQ8 en Algérie"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
              >
                Trouver un centre
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/aq8"
                aria-label="Découvrir AQ8 EMS"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                Découvrir AQ8 EMS
              </Link>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <Sparkles className="h-3.5 w-3.5" />
              Sculpting ciblé
            </span>

            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
              Qu’est-ce que Wonder ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Wonder est une technologie utilisée dans une démarche de sculpting
              corporel ciblé. Elle accompagne le travail de certaines zones du
              corps selon les objectifs définis avec l’équipe du centre.
            </p>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Contrairement à une séance AQ8 EMS active, Wonder se pratique
              généralement en position allongée ou semi-assise, avec un
              accompagnement adapté au profil du client.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 lg:col-span-7">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
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
        <section className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-12 sm:px-10 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="space-y-4 lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                <Target className="h-3.5 w-3.5" />
                Objectifs possibles
              </span>

              <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
                Pour quels objectifs choisir Wonder ?
              </h2>

              <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                Wonder peut accompagner différents objectifs de tonification et
                de suivi corporel, selon le profil, la régularité des séances et
                les conseils de l’équipe du centre.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              {objectives.map((objective) => (
                <div
                  key={objective}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
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

        {/* Zones */}
        <section className="space-y-10">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <Activity className="h-3.5 w-3.5" />
              Zones ciblées
            </span>

            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
              Des zones travaillées selon vos objectifs
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Le centre vous oriente vers la zone et la prestation adaptées
              selon vos besoins, vos disponibilités et votre profil.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {zones.map((zone) => (
              <article
                key={zone.title}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                  <Target className="h-5 w-5" />
                </div>

                <h3 className="font-display text-lg font-bold text-[#353535]">
                  {zone.title}
                </h3>

                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  {zone.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Interactive client component */}
        <WonderCycle />

        {/* Safety note */}
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-lg font-bold text-[#353535]">
                Bon à savoir avant une séance Wonder
              </h2>

              <p className="text-sm font-medium leading-relaxed text-slate-700">
                Les résultats peuvent varier selon le profil, la régularité des
                séances, l’hygiène de vie et l’accompagnement suivi. En cas de
                doute, de problème de santé, de grossesse, de dispositif médical
                implanté ou de contre-indication connue, il est recommandé de
                demander un avis médical avant toute séance.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-6 py-12 text-center text-white shadow-xl sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,87,87,0.16),transparent_55%)]" />

          <div className="relative z-10 mx-auto max-w-2xl space-y-5">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Envie de découvrir Wonder ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Consultez les centres AQ8 disponibles en Algérie, vérifiez les
              prestations proposées et envoyez votre demande de réservation.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/centres"
                aria-label="Trouver un centre Wonder"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
              >
                Trouver un centre
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/contact"
                aria-label="Contacter AQ8 Algérie"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
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
