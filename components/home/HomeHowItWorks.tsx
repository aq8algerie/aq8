import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, MapPin, MessageCircle, Sparkles } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Trouver votre centre",
    desc: "Sélectionnez le centre de proximité le plus pratique selon votre ville (Alger, Blida, Tlemcen...) et vos horaires.",
    icon: MapPin,
  },
  {
    step: "02",
    title: "Demande en ligne",
    desc: "Renseignez vos coordonnées et votre créneau souhaité en quelques clics sur la fiche du centre.",
    icon: ClipboardList,
  },
  {
    step: "03",
    title: "Réservation instantanée",
    desc: "Votre créneau disponible est réservé et confirmé immédiatement en direct dans l'agenda du centre.",
    icon: CalendarCheck,
  },
  {
    step: "04",
    title: "Séance & Coaching",
    desc: "Profitez d'un accompagnement personnalisé avec votre coach certifié pour des résultats optimaux.",
    icon: CalendarCheck,
  },
];

export function HomeHowItWorks() {
  return (
    <section className="space-y-10 sm:space-y-12">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#f0f9ff] px-3 py-1 text-xs font-extrabold uppercase text-[#0284c7]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Parcours Simple & Rapide
          </div>
          <h2 className="font-display text-3xl font-black tracking-tight text-[#242424] sm:text-4xl lg:text-5xl">
            Réservez votre séance en 4 étapes simples.
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          Un parcours sans friction : envoyez votre demande et votre centre partenaire s'occupe de la réservation.
        </p>
      </div>

      {/* Steps Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.step}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-[#0284c7]/40 hover:shadow-xl sm:p-7"
            >
              {/* Top Step Pill & Icon */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-[#242424] font-display text-xs font-black text-white shadow-sm">
                    {item.step}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f9ff] text-[#0284c7] transition-all duration-300 group-hover:bg-[#0284c7] group-hover:text-white group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="font-display text-lg font-bold tracking-tight text-[#242424]">
                    {item.title}
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Progress Line Indicator */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0284c7] to-[#7dd3fc] transition-all duration-500 group-hover:w-full"
                    style={{ width: `${(index + 1) * 25}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">Étape {index + 1}/4</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Callout Banner Footer */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="space-y-1">
            <h4 className="font-display text-lg font-bold flex items-center gap-2 justify-center sm:justify-start">
              <Sparkles className="h-4 w-4 text-[#0284c7]" />
              Prêt à planifier votre séance découverte ?
            </h4>
            <p className="text-xs font-medium text-slate-300">
              Sélectionnez votre centre et réservez votre créneau en moins de 2 minutes.
            </p>
          </div>
          <Link
            href="/reservation"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#0369a1] hover:scale-105"
          >
            <span>Réverser maintenant</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
