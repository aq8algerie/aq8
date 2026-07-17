import { Activity, ClipboardCheck, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { title: "Encadrement clair", desc: "Chaque seance est accompagnee par l'equipe du centre avec des consignes adaptees au profil du client.", icon: ShieldCheck },
  { title: "Suivi personnalise", desc: "Le suivi corporel aide a garder une progression lisible selon les objectifs et la regularite des seances.", icon: Activity },
  { title: "Deux technologies", desc: "AQ8 EMS et Wonder offrent deux approches complementaires : active, ciblee, encadree.", icon: Sparkles },
  { title: "Informations fiables", desc: "Horaires, capacites, consignes et statuts des centres peuvent evoluer depuis l'interface CRM.", icon: ClipboardCheck },
];

export function HomeWhyChoose() {
  return (
    <section className="grid gap-10 rounded-lg border border-slate-200 bg-white p-6 sm:p-8 lg:grid-cols-12 lg:p-10">
      <div className="space-y-4 lg:col-span-4">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]"><MapPinned className="h-4 w-4" />Experience AQ8</p>
        <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">Une experience plus lisible, du choix du centre a la seance.</h2>
        <p className="text-sm font-medium leading-relaxed text-slate-600">Le site public privilegie maintenant les informations utiles, les actions rapides et une presentation plus sobre de l'offre.</p>
      </div>
      <div className="grid gap-0 border-t border-slate-200 lg:col-span-8 lg:grid-cols-2 lg:border-l lg:border-t-0">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="border-b border-slate-200 p-5 lg:border-b lg:border-r last:border-b-0 lg:[&:nth-child(2n)]:border-r-0">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[#ff5757]"><Icon className="h-5 w-5" /></div>
              <h3 className="font-display text-base font-bold text-[#242424]">{feature.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{feature.desc}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
