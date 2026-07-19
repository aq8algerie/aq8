import { Activity, ClipboardCheck, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { title: "Encadrement clair", desc: "Chaque séance est accompagnée par l'équipe du centre avec des consignes adaptées au profil du client.", icon: ShieldCheck },
  { title: "Suivi personnalisé", desc: "Le suivi corporel aide à garder une progression lisible selon les objectifs et la régularité des séances.", icon: Activity },
  { title: "Deux technologies", desc: "AQ8 EMS et Wonder offrent deux approches complémentaires : active, ciblée, encadrée.", icon: Sparkles },
  { title: "Informations fiables", desc: "Horaires, capacités, consignes et statuts des centres peuvent évoluer depuis l'interface CRM.", icon: ClipboardCheck },
];

export function HomeWhyChoose() {
  return (
    <section className="grid gap-10 rounded-lg bg-[linear-gradient(135deg,#fff8f7_0%,#ffffff_46%,#fff1ed_100%)] p-6 shadow-[0_24px_80px_rgba(255,87,87,0.10)] sm:p-8 lg:grid-cols-12 lg:p-10">
      <div className="space-y-4 lg:col-span-4">
        <p className="inline-flex items-center gap-2 rounded-md border border-white/80 bg-white/75 px-3 py-2 text-sm font-bold text-[#ff5757] shadow-sm backdrop-blur"><MapPinned className="h-4 w-4" />Expérience AQ8</p>
        <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">Une expérience plus lisible, du choix du centre à la séance.</h2>
        <p className="text-sm font-medium leading-relaxed text-slate-600">Le site public privilégie maintenant les informations utiles, les actions rapides et une présentation plus sobre de l'offre.</p>
      </div>
      <div className="grid gap-0 overflow-hidden rounded-lg border border-white/75 bg-white/45 shadow-sm backdrop-blur lg:col-span-8 lg:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="border-b border-white/80 p-5 lg:border-r last:border-b-0 lg:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(n+3)]:border-b-0">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#ff5757] shadow-sm"><Icon className="h-5 w-5" /></div>
              <h3 className="font-display text-base font-bold text-[#242424]">{feature.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{feature.desc}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
