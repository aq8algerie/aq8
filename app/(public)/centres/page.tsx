/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";
import { getCenters } from "../../../lib/centers";
import { Center } from "../../../src/types";
import { getPublicCenters } from "../../../src/lib/centerVisibility";
import { CentresList } from "../../../components/centres/CentresList";

export const metadata: Metadata = {
  title: getSeoForPage("centers").title,
  description: getSeoForPage("centers").description,
};

export default function CentresPage({ centers: providedCenters }: { centers?: Center[] } = {}) {
  const centers = getPublicCenters(providedCenters || getCenters());

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-6 py-14 text-center text-white shadow-xl sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,87,87,0.20),transparent_55%)]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
          <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <MapPin className="h-3.5 w-3.5" />
              Réseau AQ8 Algérie
            </span>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Nos centres AQ8 en Algérie
              </h1>

              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                Trouvez un centre AQ8 près de chez vous, consultez les
                prestations disponibles, les horaires, les consignes pratiques
                et envoyez votre demande de réservation.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/aq8"
                aria-label="Découvrir AQ8 EMS"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
              >
                Découvrir AQ8 EMS
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/wonder"
                aria-label="Découvrir Wonder Sculpt"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                Découvrir Wonder
              </Link>
            </div>
          </div>
        </section>

        {/* Intro SEO */}
        <section className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <Sparkles className="h-3.5 w-3.5" />
            Centres, horaires et prestations
          </span>

          <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
            Choisissez votre centre AQ8
          </h2>

          <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Chaque centre dispose de sa propre page avec ses services, son
            adresse, ses horaires, ses consignes d’accès et ses moyens de
            contact. Cette organisation facilite la réservation et améliore la
            visibilité locale de chaque établissement.
          </p>
        </section>

        {/* Client list with filters */}
        <CentresList centers={centers} />
      </div>
    </main>
  );
}
