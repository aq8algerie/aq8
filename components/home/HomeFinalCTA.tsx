import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle } from "lucide-react";

export function HomeFinalCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-6 py-14 text-center text-white shadow-xl sm:px-12 lg:py-16">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,87,87,0.16),transparent_55%)]" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl space-y-7">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ff5757]/20 bg-[#ff5757]/10 text-[#ff5757]">
          <MapPin className="h-5 w-5" />
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            Trouvez le centre AQ8 le plus proche
          </h2>

          <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            Consultez les centres AQ8 Algérie, découvrez les prestations
            disponibles, les horaires, les consignes pratiques et envoyez votre
            demande de réservation en toute simplicité.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/centres"
            aria-label="Découvrir les centres AQ8 en Algérie"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
          >
            Découvrir nos centres
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/contact"
            aria-label="Contacter AQ8 Algérie"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
          >
            <MessageCircle className="h-4 w-4 text-[#ff5757]" />
            Nous contacter
          </Link>
        </div>

        <p className="mx-auto max-w-lg text-xs font-medium leading-relaxed text-slate-400">
          Les disponibilités, horaires et conditions peuvent varier selon les
          centres. L’équipe du centre vous confirmera le créneau adapté.
        </p>
      </div>
    </section>
  );
}