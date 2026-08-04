import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck } from "lucide-react";

type HomeHeroProps = {
  centerCount: number;
};

export function HomeHero({ centerCount }: HomeHeroProps) {
  return (
    <section className="relative grid overflow-hidden rounded-lg bg-[#fff6f4] lg:min-h-[500px] lg:grid-cols-12 lg:items-center">
      <div className="relative z-10 flex items-center px-6 pb-8 pt-10 sm:px-10 sm:py-12 lg:col-span-6 lg:px-14 lg:py-16">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex max-w-full items-center gap-2 text-[11px] font-extrabold uppercase text-[#d94444]">
            <ShieldCheck className="h-4 w-4 text-[#ff5757]" />
            EMS, Wonder et accompagnement centre par centre
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-[2.75rem] font-bold leading-[1.03] text-[#242424] sm:text-5xl lg:text-6xl">
              AQ8 Algérie
            </h1>
            <p className="max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              Découvrez AQ8 EMS et Wonder Sculpt dans des centres de proximité,
              avec des séances encadrées et une réservation en ligne.
            </p>
          </div>

          <div className="grid max-w-md grid-cols-2 gap-3">
            <Link href="/reservation" aria-label="Réserver une séance AQ8" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ff5757] px-4 py-3 text-sm font-bold text-white transition-premium hover:bg-[#e94949]">
              <Calendar className="h-4 w-4" />
              <span className="sm:hidden">Réserver</span>
              <span className="hidden sm:inline">Réserver une séance</span>
            </Link>
            <Link href="/centres" aria-label="Trouver un centre AQ8 en Algérie" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#242424]/20 bg-white/80 px-4 py-3 text-sm font-bold text-[#242424] transition-premium hover:border-[#242424]/50 hover:bg-white">
              Nos centres
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <dl className="hidden max-w-xl grid-cols-3 gap-3 border-t border-[#242424]/10 pt-5 sm:grid">
            {[
              [centerCount > 0 ? String(centerCount) : "AQ8", centerCount === 1 ? "centre actif" : "centres actifs"],
              ["2", "technologies"],
              ["En ligne", "réservation"],
            ].map(([value, label]) => (
              <div key={label} className="border-l border-[#242424]/10 pl-4 first:border-l-0 first:pl-0">
                <dt className="text-base font-extrabold text-[#242424]">{value}</dt>
                <dd className="mt-1 text-[11px] font-semibold text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="relative flex min-h-[220px] items-end justify-center px-4 sm:min-h-[360px] sm:px-8 lg:col-span-6 lg:min-h-[500px] lg:px-8">
        <div className="pointer-events-none relative h-[220px] w-full max-w-[330px] sm:h-[360px] sm:max-w-[440px] lg:h-[460px] lg:max-w-[500px]">
          <img
            src="/images/aq8algerie.webp"
            alt="Pratiquante équipée pour une séance AQ8 EMS"
            width={773}
            height={919}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-contain object-bottom drop-shadow-[0_24px_36px_rgba(36,36,36,0.16)]"
          />
        </div>
      </div>
    </section>
  );
}
