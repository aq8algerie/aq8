import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";

type HomeHeroProps = {
  centerCount: number;
};

export function HomeHero({ centerCount }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#222222] to-[#2a1717] text-white shadow-2xl lg:min-h-[580px]">
      {/* Background Decorative Ambient Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#ff5757]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#ff5757]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,87,87,0.12),transparent_60%)]" />

      <div className="relative z-10 grid items-center lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Headline & Action */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-10 sm:py-12 lg:col-span-7 lg:px-14 lg:py-16">
          <div className="space-y-5 sm:space-y-6">
            {/* Top Pill Tag */}
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-white/90 backdrop-blur-md shadow-inner">
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#ff5757] animate-pulse" />
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#ff7777]" />
              <span className="truncate">N°1 Électrostimulation EMS & Wonder Sculpt en Algérie</span>
            </div>

            {/* SEO-Optimized Heading & Subtitle */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="font-display text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] sm:leading-[1.08]">
                Transformez votre corps en <span className="bg-gradient-to-r from-[#ff6b6b] via-[#ff8f8f] to-white bg-clip-text text-transparent">20 minutes</span> par séance
              </h1>
              <p className="max-w-xl text-xs sm:text-base lg:text-lg font-normal leading-relaxed text-slate-300">
                La référence de l’entraînement révolutionnaire AQ8 EMS et du sculpt électromagnétique Wonder Sculpt dans vos centres certifiés en Algérie.
              </p>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row max-w-md gap-3 pt-1 sm:pt-2">
              <Link
                href="/reservation"
                aria-label="Réserver une séance d'essai AQ8"
                className="group relative inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#ff5757] to-[#e63e3e] px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#ff5757]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#ff5757]/35 active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Réserver une séance d'essai</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/centres"
                aria-label="Trouver un centre AQ8 près de chez vous"
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/12 active:scale-[0.98]"
              >
                <span>Trouver un centre</span>
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
        <div className="relative flex items-end justify-center px-4 pb-6 pt-6 sm:px-8 sm:pt-8 lg:col-span-5 lg:h-full lg:px-8 lg:pb-0">
          <div className="relative h-[260px] xs:h-[320px] sm:h-[420px] lg:h-[480px] w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[460px]">
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

            {/* Floating Glassmorphism Badge Top Left (Adaptif Mobile & Desktop) */}
            <div className="absolute top-1 left-1 sm:top-2 sm:-left-6 lg:-left-10 z-20 flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/20 bg-black/60 p-2 sm:p-3 shadow-xl backdrop-blur-md max-w-[85%] sm:max-w-none">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-[#ff5757] to-[#d93838] text-white shadow-md">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-white truncate">AQ8 EMS Pro</span>
                  <Sparkles className="h-3 w-3 shrink-0 text-[#ff7777]" />
                </div>
                <span className="block text-[9px] sm:text-[10px] font-medium text-slate-300 truncate">350 muscles stimulés</span>
              </div>
            </div>

            {/* Floating Glassmorphism Badge Bottom Right */}
            <div className="absolute bottom-4 right-1 sm:bottom-12 sm:-right-4 z-20 flex items-center gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-white/20 bg-black/50 px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-0.5 sm:gap-1 text-amber-400">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400" />
                <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-amber-400" />
              </div>
              <div className="border-l border-white/15 pl-2 sm:pl-2.5 text-left">
                <span className="block text-[11px] sm:text-xs font-extrabold text-white">4.9 / 5</span>
                <span className="block text-[9px] sm:text-[10px] text-slate-300">Satisfaction clients</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
