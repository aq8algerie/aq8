import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck } from "lucide-react";

export function HomeHero() {
  return (
    <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-12 lg:items-center">
      <div className="flex items-center bg-white px-5 py-9 sm:px-8 sm:py-10 lg:col-span-6 lg:px-12 lg:py-12">
        <div className="max-w-2xl space-y-7">
          <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#242424]">
            <ShieldCheck className="h-4 w-4 text-[#ff5757]" />
            EMS, Wonder et accompagnement centre par centre
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl font-bold leading-[1.03] text-[#242424] sm:text-5xl lg:text-6xl">
              AQ8 Algerie
            </h1>
            <p className="max-w-lg text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
              Une experience de remise en forme technologique plus claire, plus
              encadree et plus premium, avec des centres, horaires et demandes
              de reservation accessibles en quelques gestes.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/centres" aria-label="Trouver un centre AQ8 en Algerie" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-premium hover:bg-[#e94949]">
              Trouver un centre
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" aria-label="Demander une reservation AQ8" className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-[#242424] transition-premium hover:border-[#242424]">
              <Calendar className="h-4 w-4 text-[#ff5757]" />
              Reserver
            </Link>
          </div>

          <dl className="grid max-w-xl grid-cols-3 gap-3 pt-1">
            {[
              ["Centres", "Reseau AQ8 Algerie"],
              ["AQ8 + Wonder", "Deux technologies"],
              ["Suivi", "Seances encadrees"],
            ].map(([value, label]) => (
              <div key={value} className="border-l border-slate-200 pl-3 sm:pl-4">
                <dt className="text-sm font-bold text-[#242424]">{value}</dt>
                <dd className="mt-1 text-xs font-medium text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="flex items-end justify-center bg-white px-5 pb-8 sm:px-8 lg:col-span-6 lg:px-10 lg:py-10 lg:pl-0">
        <div className="relative h-[230px] w-full overflow-hidden bg-white sm:h-[285px] lg:h-[335px]">
          <img
            src="/images/aq8algerie.webp"
            alt="Seance AQ8 dans un centre premium en Algerie"
            className="h-full w-full object-contain object-bottom lg:object-right-bottom"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}
