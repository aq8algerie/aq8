/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
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
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-12 lg:items-end">
          <div className="space-y-4 lg:col-span-8">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]"><MapPin className="h-4 w-4" />Réseau AQ8 Algérie</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-[#242424] sm:text-5xl">Nos centres AQ8 en Algérie</h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">Consultez les centres actifs, leurs prestations, horaires, consignes pratiques et moyens de réservation. Les centres suspendus ou en maintenance sont automatiquement masqués du site public.</p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
            <Link href="/aq8" aria-label="Découvrir AQ8 EMS" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#242424] px-5 py-3 text-sm font-bold text-white transition-premium hover:bg-[#ff5757]">
              Découvrir AQ8 EMS
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/wonder" aria-label="Découvrir Wonder Sculpt" className="inline-flex items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-sm font-bold text-[#242424] transition-premium hover:border-[#ff5757] hover:text-[#ff5757]">
              Découvrir Wonder
            </Link>
          </div>
        </section>

        <section className="grid gap-5 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
          {[
            [String(centers.length), "Centres publics"],
            ["AQ8", "EMS actif"],
            ["Wonder", "Sculpting cible"],
          ].map(([value, label]) => (
            <div key={label} className="border-l-2 border-[#ff5757] bg-white p-4">
              <div className="font-display text-2xl font-bold text-[#242424]">{value}</div>
              <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
            </div>
          ))}
        </section>

        <CentresList centers={centers} />
      </div>
    </main>
  );
}
