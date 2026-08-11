import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";

type HomeHeroProps = {
  centerCount: number;
};

export function HomeHero({ centerCount }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#1e293b] to-[#0f172a] text-white shadow-2xl lg:min-h-[580px]">
      {/* Background Decorative Ambient Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#0284c7]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#0284c7]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(2,132,199,0.15),transparent_60%)]" />

      <div className="relative z-10 grid items-center lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Headline & Action */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-12 lg:col-span-7 lg:px-14 lg:py-16">
          <div className="space-y-5 sm:space-y-6">
            {/* Top Pill Tag */}
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-white/90 backdrop-blur-md shadow-inner">
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#0284c7] animate-pulse" />
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
              <span className="truncate">N°1 Électrostimulation EMS & Wonder Axion en Algérie</span>
            </div>

            {/* SEO-Optimized Heading & Subtitle */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="font-display text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] sm:leading-[1.08]">
                Transformez votre corps en <span className="bg-gradient-to-r from-[#38bdf8] via-[#7dd3fc] to-white bg-clip-text text-transparent">20 minutes</span> par séance
              </h1>
              <p className="max-w-xl text-xs sm:text-base lg:text-lg font-normal leading-relaxed text-slate-300">
                La référence de l’entraînement révolutionnaire AQ8 EMS et de la technologie électromagnétique Wonder Axion dans vos centres certifiés en Algérie.
              </p>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row max-w-md gap-3 pt-1 sm:pt-2">
              <Link
                href="/reservation"
                aria-label="Réserver une séance AQ8"
                className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#0369a1] to-[#075985] px-7 py-4 font-display text-sm sm:text-base font-extrabold text-white shadow-[0_12px_32px_rgba(2,132,199,0.35)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_20px_45px_rgba(2,132,199,0.5)] active:scale-[0.98] border border-white/20"
              >
                <Calendar className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                <span>Réserver une séance</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/client"
                aria-label="Accéder directement à l'espace adhérente"
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-[#0284c7]/40 bg-[#0284c7]/15 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white backdrop-blur-md transition-all duration-300 hover:bg-[#0284c7]/30 hover:border-[#0284c7] active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4 text-[#38bdf8]" />
                <span>📱 Mon Espace Cliente</span>
              </Link>
            </div>

            {/* Quick Stats Grid */}
            <dl className="grid max-w-lg grid-cols-3 gap-2 sm:gap-4 border-t border-white/10 pt-5 sm:pt-6">
              {[
                [centerCount > 0 ? `${centerCount} Centres` : "6 Centres", "en Algérie"],
                ["20 Min", "par séance"],
                ["100%", "Accompagné"],
              ].map(([value, label]) => (
                <div key={label} className="space-y-0.5">
                  <dt className="font-display text-base sm:text-xl font-black text-white">{value}</dt>
                  <dd className="text-[10px] sm:text-xs font-medium text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right Column: Hero Visual Image + Floating Glassmorphism Badges */}
        <div className="relative flex items-end justify-center px-4 pb-6 pt-10 sm:px-8 sm:pt-14 lg:col-span-5 lg:h-full lg:px-8 lg:pb-0">
          <div className="relative h-[340px] xs:h-[410px] sm:h-[530px] lg:h-[600px] w-full max-w-[400px] xs:max-w-[460px] sm:max-w-[560px] lg:max-w-[600px]">
            <img
              src="/images/aq8algerie.webp"
              alt="Séance de coaching personnalisé AQ8 EMS en Algérie"
              width={773}
              height={919}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:scale-[1.02]"
            />

            {/* Floating Glassmorphism Badge Top Left (Positionné plus haut au-dessus de l'image) */}
            <div className="absolute -top-8 left-0 sm:-top-12 sm:-left-8 lg:-left-14 z-20 flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/20 bg-black/70 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-md">
              <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white shadow-md">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">AQ8 EMS Pro</span>
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]" />
                </div>
                <span className="block text-[10px] sm:text-xs font-medium text-slate-300 truncate">350 muscles stimulés</span>
              </div>
            </div>

            {/* Floating Glassmorphism Badge Bottom Right */}
            <div className="absolute bottom-4 right-1 sm:bottom-10 sm:-right-6 z-20 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-white/20 bg-black/60 px-3 py-2 sm:px-4 sm:py-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-0.5 sm:gap-1 text-amber-400">
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400" />
              </div>
              <div className="border-l border-white/15 pl-2 sm:pl-3 text-left">
                <span className="block text-xs sm:text-sm font-extrabold text-white">4.9 / 5</span>
                <span className="block text-[10px] sm:text-xs text-slate-300">Satisfaction clients</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
