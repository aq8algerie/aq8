import { Activity, ClipboardCheck, MapPinned, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";

const features = [
  {
    title: "Coaching Individuel Certifié",
    desc: "Chaque séance d'électrostimulation ou de sculpt est strictement encadrée par un coach diplômé certifié AQ8.",
    icon: ShieldCheck,
    badge: "100% Accompagné",
  },
  {
    title: "Suivi Corporel & Mensurations",
    desc: "Des bilans réguliers et la possibilité de suivre l'évolution de votre silhouette séance après séance.",
    icon: Activity,
    badge: "Résultats Visibles",
  },
  {
    title: "Synergie Dual Technology",
    desc: "L'alliance unique de l'effort actif AQ8 EMS et du travail électromagnétique supramaximal Wonder Axion.",
    icon: Sparkles,
    badge: "Haute Performance",
  },
  {
    title: "Réservation Directe & Transparente",
    desc: "Consultez les créneaux, les horaires hommes/femmes et réservez instantanément dans le centre de votre choix.",
    icon: ClipboardCheck,
    badge: "Simple & Rapide",
  },
];

export function HomeWhyChoose() {
  return (
    <section className="space-y-10 sm:space-y-12">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
        {/* Left Bento Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#242424] via-[#1e293b] to-[#0f172a] p-8 text-white shadow-xl lg:col-span-4 flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#0284c7]/20 blur-3xl" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              <Trophy className="h-4 w-4 text-[#38bdf8]" />
              <span>L'Excellence AQ8</span>
            </div>

            <h2 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Pourquoi choisir l'expérience AQ8 en Algérie ?
            </h2>

            <p className="text-sm font-normal leading-relaxed text-slate-300">
              Du premier bilan à chaque séance, bénéficiez d'une prise en charge haut de gamme, sans compromis sur la sécurité et le confort.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 mt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0284c7] text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-white">Technologie N°1 mondiale</span>
                <span className="block text-[11px] text-slate-400">Adoptée par les centres experts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Bento Cards Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#0284c7]/40 hover:shadow-xl sm:p-7"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f9ff] text-[#0284c7] shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#0284c7] group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold tracking-tight text-[#242424]">
                    {feature.title}
                  </h3>

                  <p className="text-xs font-medium leading-relaxed text-slate-600">
                    {feature.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
