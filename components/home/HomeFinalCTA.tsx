import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

export function HomeFinalCTA() {
  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-[#242424] px-6 py-14 text-white sm:px-10 lg:px-12">
      <img src="/images/prestations/wonder-ems.webp" alt="Centre AQ8 Algérie" className="absolute inset-0 h-full w-full object-cover opacity-28" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-[#242424]/78" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
        <div className="max-w-2xl space-y-4 lg:col-span-8">
          <p className="text-sm font-bold text-[#ff5757]">Prêt à commencer ?</p>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Trouvez votre centre AQ8 et envoyez une demande de réservation.</h2>
          <p className="text-sm font-medium leading-relaxed text-white/72 sm:text-base">Les horaires, prestations et disponibilités peuvent varier selon les centres. L'équipe du centre vous confirme le créneau adapté.</p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
          <Link href="/centres" aria-label="Découvrir les centres AQ8 en Algérie" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-premium hover:bg-[#e94949] sm:w-auto">
            Découvrir nos centres
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" aria-label="Contacter AQ8 Algérie" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/18 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-premium hover:bg-white/16 sm:w-auto">
            <MessageCircle className="h-4 w-4 text-[#ff5757]" />
            Nous contacter
          </Link>
        </div>
      </div>
    </section>
  );
}
