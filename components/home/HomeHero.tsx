import Link from "next/link";
import {
  ArrowRight,
  Activity,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-4 py-12 xs:px-6 xs:py-16 sm:px-12 md:px-16 lg:py-20 text-white shadow-xl">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,87,87,0.20),transparent_55%)]" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
      <div className="absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 grid items-center gap-8 lg:gap-12 lg:grid-cols-12">
        {/* Left content */}
        <div className="max-w-3xl space-y-7 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <Sparkles className="h-3.5 w-3.5" />
            Électrostimulation • Wonder • Remise en forme
          </div>

          <div className="space-y-5">
            <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              AQ8 Algérie — électrostimulation, Wonder et remise en forme
            </h1>

            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base lg:text-lg">
              Découvrez des séances encadrées AQ8 et Wonder dans nos centres,
              avec un accompagnement personnalisé selon vos objectifs :
              tonification, suivi corporel, remise en forme et bien-être.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/centres"
              aria-label="Trouver un centre AQ8 en Algérie"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
            >
              Trouver un centre
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/aq8"
              aria-label="Découvrir la technologie AQ8"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              Découvrir AQ8
            </Link>

            <Link
              href="/wonder"
              aria-label="Découvrir la technologie Wonder"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
            >
              Découvrir Wonder
            </Link>
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#ff5757]" />
              Séances encadrées
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-slate-300">
              <Activity className="h-4 w-4 shrink-0 text-[#ff5757]" />
              Suivi personnalisé
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs text-slate-300">
              <MapPin className="h-4 w-4 shrink-0 text-[#ff5757]" />
              Centres en Algérie
            </div>
          </div>
        </div>

        {/* Right visual */}
        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-lg lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl">
              <img
                src="/images/aq8algerie.webp"
                alt="Séance AQ8 électrostimulation en Algérie"
                className="h-[250px] xs:h-[320px] sm:h-[420px] md:h-[500px] lg:h-[580px] w-full rounded-3xl object-cover"
                referrerPolicy="no-referrer"
              />

              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 rounded-2xl border border-white/10 bg-[#353535]/85 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                  AQ8 Algérie
                </p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-white">
                  Des séances encadrées dans un cadre moderne, clair et organisé.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}