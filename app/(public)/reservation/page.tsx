/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";
import { getCenters } from "../../../lib/centers";
import { CenterBookingForm } from "../../../components/centres/CenterBookingForm";

export const metadata: Metadata = {
  title: "Réservez votre séance - AQ8 Algérie",
  description: "Planifiez et pré-réservez votre séance d'électrostimulation AQ8 EMS ou Wonder dans le centre de votre choix en Algérie.",
};

export default function ReservationPage() {
  const centers = getCenters();

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-lg bg-[#353535] px-6 py-14 text-center text-white sm:px-10 lg:px-14">
          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
              <Calendar className="h-3.5 w-3.5 animate-pulse" />
              Réservation globale
            </span>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                Réservez votre séance AQ8
              </h1>

              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                Sélectionnez le centre le plus proche, choisissez votre prestation
                (AQ8 EMS ou Wonder) et planifiez votre créneau d'entraînement.
              </p>
            </div>
          </div>
        </section>

        {/* Reservation Grid */}
        <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column (Info / Value props) */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-6 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1 text-xs font-bold uppercase text-[#ff5757]">
                <Sparkles className="h-3.5 w-3.5" />
                Comment ça marche ?
              </span>

              <div className="space-y-4">
                {[
                  {
                    title: "1. Choisissez le centre",
                    desc: "Sélectionnez l'établissement le plus proche de chez vous dans la liste déroulante.",
                  },
                  {
                    title: "2. Choisissez la date & l'heure",
                    desc: "Les disponibilités affichées sont synchronisées en direct avec l'agenda du centre.",
                  },
                  {
                    title: "3. Validation par l'équipe",
                    desc: "Dès réception, le centre bloque votre place et valide votre rendez-vous.",
                  },
                ].map((step, index) => (
                  <div key={index} className="space-y-1">
                    <h3 className="font-display text-sm font-bold text-[#353535]">
                      {step.title}
                    </h3>
                    <p className="text-xs font-medium leading-relaxed text-slate-600">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick reminder card */}
            <div className="rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#fcfcfd_0%,#ffffff_100%)] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-[4px] bg-[#ff5757]" />
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-xs font-bold uppercase text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  Durée de séance
                </span>

                <h3 className="font-display text-lg font-bold text-[#353535]">
                  20 à 25 minutes actives
                </h3>

                <p className="text-xs font-medium leading-relaxed text-slate-600">
                  Chaque séance d'électrostimulation AQ8 EMS dure 20 minutes (équivalant à 4h d'effort traditionnel) et chaque séance Wonder dure 25 minutes. Un coach certifié vous accompagne tout au long du parcours.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Global Form) */}
          <div className="lg:col-span-8">
            <CenterBookingForm allCenters={centers} />
          </div>
        </section>
      </div>
    </main>
  );
}
