import {
  Activity,
  ClipboardCheck,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Séances encadrées",
    desc: "Chaque séance AQ8 ou Wonder est accompagnée par l’équipe du centre afin d’adapter l’intensité, les consignes et le déroulement selon le profil du client.",
    icon: ShieldCheck,
  },
  {
    title: "Suivi corporel personnalisé",
    desc: "Le suivi des mensurations et de l’évolution corporelle permet d’accompagner chaque client avec plus de précision, selon ses objectifs de remise en forme.",
    icon: Activity,
  },
  {
    title: "Technologies AQ8 et Wonder",
    desc: "AQ8 Algérie associe l’électrostimulation active et le sculpting ciblé Wonder pour proposer deux approches complémentaires de tonification et de suivi corporel.",
    icon: Sparkles,
  },
  {
    title: "Consignes claires par centre",
    desc: "Horaires, équipements, règles de réservation et conditions d’annulation sont présentés clairement pour offrir une expérience simple, organisée et rassurante.",
    icon: ClipboardCheck,
  },
];

export function HomeWhyChoose() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 px-6 py-14 sm:px-10 lg:px-12">
      {/* Background decoration */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
      <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-white blur-3xl" />

      <div className="relative z-10 space-y-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <MapPinned className="h-3.5 w-3.5" />
            Expérience AQ8 Algérie
          </span>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
              Pourquoi choisir AQ8 Algérie ?
            </h2>

            <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Une approche claire, encadrée et personnalisée pour accompagner
              vos objectifs de remise en forme, de tonification et de suivi
              corporel dans nos centres.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757] transition-all group-hover:bg-[#ff5757] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-base font-bold text-[#353535]">
                      {feature.title}
                    </h3>

                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Responsible note */}
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center">
          <p className="text-xs font-medium leading-relaxed text-slate-500">
            Les résultats peuvent varier selon le profil, la régularité des
            séances, l’hygiène de vie et l’accompagnement suivi. L’équipe du
            centre reste disponible pour orienter chaque client vers la
            prestation la plus adaptée.
          </p>
        </div>
      </div>
    </section>
  );
}