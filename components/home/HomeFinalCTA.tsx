import Link from "next/link";
import { ArrowRight, Calendar, MessageCircle, Sparkles } from "lucide-react";

export function HomeFinalCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1e293b] to-[#0f172a] px-6 py-14 text-white shadow-2xl sm:px-12 sm:py-16 lg:px-16">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[#0284c7]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-[#0284c7]/15 blur-3xl" />
      <img
        src="/images/prestations/wonder-ems.webp"
        alt="Centre AQ8 Algérie"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-overlay"
        referrerPolicy="no-referrer"
      />

      <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column Text */}
        <div className="max-w-2xl space-y-4 lg:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>Prêt à vivre l'expérience AQ8 ?</span>
          </div>

          <h2 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
            Trouvez votre centre et réservez votre séance dès aujourd'hui.
          </h2>

          <p className="text-sm font-normal leading-relaxed text-slate-300 sm:text-base">
            Découvrez l'efficacité de 20 minutes d'électrostimulation ou la précision de Wonder Axion avec l'un de nos coachs certifiés en Algérie.
          </p>
        </div>

        {/* Right Column Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:col-span-4 lg:items-end">
          <Link
            href="/reservation"
            aria-label="Réserver une séance AQ8"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#06b6d4] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#0284c7]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#0284c7]/35 sm:w-auto"
          >
            <Calendar className="h-4 w-4" />
            <span>Réserver ma séance</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/contact"
            aria-label="Contacter AQ8 Algérie"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 text-[#38bdf8]" />
            <span>Nous contacter</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
