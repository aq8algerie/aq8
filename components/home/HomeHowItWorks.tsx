import Link from "next/link";
import { ArrowRight, CalendarCheck, CheckCircle2, ClipboardList, MapPin, MessageCircle } from "lucide-react";

const steps = [
  { step: "01", title: "Choisir", desc: "Sélectionnez le centre le plus adapté selon la ville, les prestations et les horaires disponibles.", icon: MapPin },
  { step: "02", title: "Demander", desc: "Envoyez une demande de réservation depuis la page publique du centre choisi.", icon: ClipboardList },
  { step: "03", title: "Confirmer", desc: "L'équipe du centre valide le créneau selon les disponibilités et les consignes internes.", icon: MessageCircle },
  { step: "04", title: "Préparer", desc: "Arrivez avec les équipements demandés et laissez l'équipe vous accompagner pendant la séance.", icon: CalendarCheck },
];

export function HomeHowItWorks() {
  return (
    <section className="overflow-hidden rounded-lg bg-[linear-gradient(135deg,#fff8f7_0%,#ffffff_46%,#fff1ed_100%)] p-6 shadow-[0_24px_80px_rgba(255,87,87,0.10)] sm:p-8 lg:p-10">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="space-y-3 lg:col-span-7">
          <p className="inline-flex items-center gap-2 rounded-md border border-white/80 bg-white/75 px-3 py-2 text-sm font-bold text-[#ff5757] shadow-sm backdrop-blur">
            <CheckCircle2 className="h-4 w-4" />
            Parcours de réservation
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">
            Réserver sans friction, avec validation du centre.
          </h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-600 lg:col-span-5">
          Le client envoie une demande claire. Le centre garde la main sur la confirmation, les capacités et les informations pratiques.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <article key={item.step} className="group relative min-h-[235px] rounded-lg bg-white/72 p-5 shadow-sm backdrop-blur transition-premium hover:-translate-y-1 hover:bg-white">
              {index < steps.length - 1 && (
                <div className="pointer-events-none absolute left-[calc(100%-10px)] top-12 hidden h-px w-8 bg-[#ff5757]/25 lg:block" />
              )}
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-md bg-[#242424] px-2.5 py-1 text-xs font-bold text-white">{item.step}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#ff5757]/10 text-[#ff5757] transition-premium group-hover:bg-[#ff5757] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-8 space-y-3">
                <h3 className="font-display text-xl font-bold text-[#242424]">{item.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-5 rounded-lg bg-[#242424] p-6 text-white shadow-[0_18px_50px_rgba(36,36,36,0.16)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="max-w-2xl space-y-2">
          <h3 className="font-display text-xl font-bold">Vous ne savez pas quel centre choisir ?</h3>
          <p className="text-sm font-medium leading-relaxed text-white/70">Comparez les prestations, horaires et consignes sur la page centres.</p>
        </div>
        <Link href="/centres" aria-label="Voir les centres AQ8 en Algérie" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#242424] transition-premium hover:bg-[#ff5757] hover:text-white">
          Voir les centres
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
