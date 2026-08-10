import Link from "next/link";
import { ArrowRight, Activity, Dumbbell, ShieldCheck, Target, Zap, Sparkles, Flame } from "lucide-react";

const technologies = [
  {
    title: "AQ8 EMS",
    subtitle: "Électrostimulation Musculaire Intégrale",
    tagline: "Séance active guidée",
    href: "/aq8",
    image: "/images/prestations/aq8.webp",
    alt: "Séance AQ8 EMS active en centre en Algérie",
    icon: Zap,
    badge: "Brûle-graisses & Renforcement",
    badgeColor: "bg-[#0284c7] text-white",
    description: "Une technologie d'électrostimulation globale sollicitant simultanément 350 muscles. En seulement 20 minutes, combinez travail cardiovasculaire et contraction musculaire profonde.",
    points: [
      { icon: Flame, text: "Consommation calorique élevée" },
      { icon: Activity, text: "350+ muscles activés en 20 min" },
      { icon: ShieldCheck, text: "Coach individuel dédié" },
      { icon: Dumbbell, text: "Sans contrainte articulaire" },
    ],
  },
  {
    title: "Wonder Axion",
    subtitle: "Technologie Électromagnétique Supramaximale",
    tagline: "Sculpting ciblé haute intensité",
    href: "/wonder",
    image: "/images/prestations/wonder-ems.webp",
    alt: "Séance Wonder Axion ciblé chez AQ8 Algérie",
    icon: Target,
    badge: "Définition & Tonification",
    badgeColor: "bg-[#242424] text-white",
    description: "Combinaison d'émissions électromagnétiques induisant jusqu'à 52 000 contractions en 25 minutes. Idéal pour cibler l'abdomen, les fessiers, les cuisses et raffermir la silhouette.",
    points: [
      { icon: Target, text: "52 000 contractions par séance" },
      { icon: Sparkles, text: "Ciblage zones rebelles" },
      { icon: Activity, text: "Effet push-up & régalbage" },
      { icon: ShieldCheck, text: "Résultats mesurables" },
    ],
  },
];

export function HomeTechnologies() {
  return (
    <section className="space-y-10 sm:space-y-12">
      {/* Section Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#f0f9ff] px-3 py-1 text-xs font-extrabold uppercase text-[#0284c7]">
            <Sparkles className="h-3.5 w-3.5" />
            Technologies Exclusives AQ8
          </div>
          <h2 className="font-display text-3xl font-black tracking-tight text-[#242424] sm:text-4xl lg:text-5xl">
            Deux technologies novatrices pour vos objectifs.
          </h2>
        </div>
        <p className="max-w-md text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          Découvrez la puissance de l'électrostimulation AQ8 EMS et du body shaping Wonder Axion dans vos centres certifiés en Algérie.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {technologies.map((technology) => {
          const Icon = technology.icon;
          return (
            <article
              key={technology.title}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0284c7]/40 hover:shadow-2xl"
            >
              {/* Card Image Cover Header */}
              <div className="relative h-72 w-full overflow-hidden bg-slate-900">
                <img
                  src={technology.image}
                  alt={technology.alt}
                  className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent" />

                {/* Badge Top Left */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-md ${technology.badgeColor}`}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {technology.badge}
                  </span>
                </div>

                {/* Bottom Overlay Title & Icon */}
                <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                      {technology.tagline}
                    </span>
                    <h3 className="mt-1 font-display text-3xl font-black text-white">
                      {technology.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-300">
                      {technology.subtitle}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/90 text-[#242424] shadow-md backdrop-blur transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#0284c7] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Card Content & Features */}
              <div className="flex flex-1 flex-col justify-between p-6 sm:p-8 space-y-6">
                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {technology.description}
                </p>

                {/* Bullet Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {technology.points.map((point) => {
                    const PointIcon = point.icon;
                    return (
                      <div key={point.text} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs font-bold text-slate-800">
                        <PointIcon className="h-4 w-4 shrink-0 text-[#0284c7]" />
                        <span>{point.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Card Action Link */}
                <div className="pt-2">
                  <Link
                    href={technology.href}
                    aria-label={`Découvrir la technologie ${technology.title}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-5 text-sm font-bold text-[#242424] transition-all duration-300 hover:border-[#0284c7] hover:bg-[#0284c7] hover:text-white hover:shadow-md"
                  >
                    <span>En savoir plus sur {technology.title}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Synergic Banner Footer */}
      <div className="rounded-2xl bg-gradient-to-r from-[#242424] to-[#343434] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div className="space-y-1">
            <h4 className="font-display text-lg font-bold">Vous hésitez entre AQ8 EMS et Wonder Axion ?</h4>
            <p className="text-xs font-medium text-slate-300">
              Nos coachs certifiés vous orientent vers la formule ou la combinaison parfaite lors de votre séance découverte.
            </p>
          </div>
          <Link
            href="/reservation"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0284c7] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#0369a1] hover:scale-105"
          >
            <span>Réserver un bilan gratuit</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
