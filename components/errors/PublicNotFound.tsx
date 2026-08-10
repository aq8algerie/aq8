import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Home,
  MapPin,
} from "lucide-react";

export function PublicNotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="relative isolate overflow-hidden rounded-lg bg-[#fff6f4] px-6 py-10 sm:px-10 sm:py-14 lg:min-h-[620px] lg:px-14 lg:py-16"
    >
      <div className="grid min-h-full items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="relative z-10 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-[#242424] px-3 py-1.5 text-xs font-extrabold text-white">
              Erreur 404
            </span>
            <span className="text-sm font-bold text-[#0284c7]">
              Page introuvable
            </span>
          </div>

          <h1
            id="not-found-title"
            className="mt-6 max-w-3xl font-display text-3xl font-bold leading-tight text-[#242424] sm:text-5xl lg:text-6xl"
          >
            Cette page a pris un autre chemin.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
            Le contenu que vous recherchez a peut-être été déplacé, renommé ou
            retiré. Retrouvez facilement les informations essentielles du réseau
            AQ8 Algérie.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#0284c7] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0369a1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Retour à l'accueil
            </Link>
            <Link
              href="/centres"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#242424]/20 bg-white px-6 py-3 text-sm font-bold text-[#242424] transition hover:border-[#242424]/50"
            >
              <MapPin className="h-4 w-4 text-[#0284c7]" aria-hidden="true" />
              Trouver un centre
            </Link>
          </div>

          <nav
            aria-label="Suggestions de navigation"
            className="mt-9 border-t border-[#242424]/10 pt-6"
          >
            <p className="text-xs font-extrabold uppercase text-slate-400">
              Vous cherchiez peut-être
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <Link
                href="/reservation"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#242424] transition hover:text-[#0284c7]"
              >
                <CalendarDays className="h-4 w-4 text-[#0284c7]" aria-hidden="true" />
                Réserver une séance
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/conseils"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#242424] transition hover:text-[#0284c7]"
              >
                <BookOpen className="h-4 w-4 text-[#0284c7]" aria-hidden="true" />
                Conseils et actualités
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>

        <div className="relative flex min-h-[310px] items-end justify-center lg:col-span-5 lg:min-h-[500px]">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 text-center font-display text-[8rem] font-black leading-none text-[#0284c7]/10 sm:text-[11rem] lg:text-[13rem]"
          >
            404
          </span>
          <img
            src="/images/aq8algerie.webp"
            alt="Équipe AQ8 Algérie"
            width="773"
            height="919"
            className="relative z-10 h-auto max-h-[380px] w-auto max-w-full object-contain object-bottom lg:max-h-[500px]"
          />
        </div>
      </div>
    </section>
  );
}
