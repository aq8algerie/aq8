import Link from "next/link";
import { ArrowRight, Activity, Dumbbell, ShieldCheck, Target, Zap } from "lucide-react";

const technologies = [
  {
    title: "AQ8 EMS",
    label: "Séance active",
    href: "/aq8",
    image: "/images/prestations/aq8.webp",
    alt: "Séance AQ8 EMS en Algérie",
    icon: Zap,
    description: "Une séance d'électrostimulation active, guidée par l'équipe du centre, avec une intensité adaptée au profil et aux objectifs.",
    points: [
      { icon: Activity, text: "Travail musculaire global" },
      { icon: ShieldCheck, text: "Intensité personnalisée" },
      { icon: Dumbbell, text: "Mouvements encadrés" },
    ],
  },
  {
    title: "Wonder Sculpt",
    label: "Sculpting cible",
    href: "/wonder",
    image: "/images/prestations/wonder-ems.webp",
    alt: "Séance Wonder Sculpt AQ8 Algérie",
    icon: Target,
    description: "Une approche ciblée pour accompagner la tonification et le suivi de certaines zones, dans un cadre clair et rassurant.",
    points: [
      { icon: Target, text: "Zones ciblées" },
      { icon: Activity, text: "Suivi de silhouette" },
      { icon: ShieldCheck, text: "Consignes adaptées" },
    ],
  },
];

export function HomeTechnologies() {
  return (
    <section className="space-y-8">
      <div className="grid gap-6 border-b border-slate-200 pb-8 lg:grid-cols-12 lg:items-end">
        <div className="space-y-3 lg:col-span-7">
          <p className="text-sm font-bold text-[#ff5757]">AQ8 & Wonder</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">
            Deux technologies complémentaires, présentées simplement.
          </h2>
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-600 lg:col-span-5">
          L'expérience publique met l'essentiel devant le client : comprendre la
          technologie, choisir un centre, puis envoyer une demande de réservation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {technologies.map((technology) => {
          const Icon = technology.icon;
          return (
            <article key={technology.title} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative h-72 overflow-hidden bg-slate-100">
                <img src={technology.image} alt={technology.alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1f1f1f]/72 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white/72">{technology.label}</p>
                    <h3 className="mt-1 font-display text-3xl font-bold text-white">{technology.title}</h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-[#242424]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-7">
                <p className="text-sm font-medium leading-relaxed text-slate-600">{technology.description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {technology.points.map((point) => {
                    const PointIcon = point.icon;
                    return (
                      <div key={point.text} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <PointIcon className="h-4 w-4 text-[#ff5757]" />
                        {point.text}
                      </div>
                    );
                  })}
                </div>
                <Link href={technology.href} aria-label={"Découvrir " + technology.title} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#242424] transition-premium hover:border-[#ff5757] hover:text-[#ff5757]">
                  Découvrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
