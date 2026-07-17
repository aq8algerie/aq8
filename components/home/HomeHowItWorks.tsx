import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardList, MapPin, MessageCircle } from "lucide-react";

const steps = [
  { step: "01", title: "Choisir", desc: "Selectionnez le centre le plus adapte selon la ville, les prestations et les horaires disponibles.", icon: MapPin },
  { step: "02", title: "Demander", desc: "Envoyez une demande de reservation depuis la page publique du centre choisi.", icon: ClipboardList },
  { step: "03", title: "Confirmer", desc: "L'equipe du centre valide le creneau selon les disponibilites et les consignes internes.", icon: MessageCircle },
  { step: "04", title: "Preparer", desc: "Arrivez avec les equipements demandes et laissez l'equipe vous accompagner pendant la seance.", icon: CalendarCheck },
];

export function HomeHowItWorks() {
  return (
    <section className="space-y-8">
      <div className="grid gap-5 border-b border-slate-200 pb-8 lg:grid-cols-12 lg:items-end">
        <div className="space-y-3 lg:col-span-7">
          <p className="text-sm font-bold text-[#ff5757]">Parcours de reservation</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">Reserver sans friction, avec validation du centre.</h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-600 lg:col-span-5">Le client envoie une demande claire. Le centre garde la main sur la confirmation, les capacites et les informations pratiques.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.step} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-6 flex items-center justify-between"><span className="font-mono text-xs font-bold text-slate-400">{item.step}</span><Icon className="h-5 w-5 text-[#ff5757]" /></div>
              <h3 className="font-display text-lg font-bold text-[#242424]">{item.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{item.desc}</p>
            </article>
          );
        })}
      </div>
      <div className="flex flex-col gap-5 rounded-lg bg-[#242424] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-2xl space-y-2">
          <h3 className="font-display text-xl font-bold">Vous ne savez pas quel centre choisir ?</h3>
          <p className="text-sm font-medium leading-relaxed text-white/70">Comparez les prestations, horaires et consignes sur la page centres.</p>
        </div>
        <Link href="/centres" aria-label="Voir les centres AQ8 en Algerie" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#242424] transition-premium hover:bg-[#ff5757] hover:text-white">
          Voir les centres
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
