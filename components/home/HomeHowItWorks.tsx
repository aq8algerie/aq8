import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  MapPin,
  MessageCircle,
} from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Choisir un centre",
    desc: "Consultez les centres AQ8 en Algérie et sélectionnez celui qui correspond le mieux à votre localisation, vos disponibilités et les prestations proposées.",
    icon: MapPin,
  },
  {
    step: "02",
    title: "Envoyer une demande",
    desc: "Remplissez le formulaire de demande de réservation ou contactez directement le centre par téléphone ou WhatsApp pour préciser votre besoin.",
    icon: ClipboardList,
  },
  {
    step: "03",
    title: "Recevoir la confirmation",
    desc: "L’équipe du centre vérifie les disponibilités, les horaires et les consignes spécifiques avant de confirmer votre créneau.",
    icon: MessageCircle,
  },
  {
    step: "04",
    title: "Préparer votre séance",
    desc: "Présentez-vous à l’heure confirmée avec les équipements demandés par le centre, puis laissez-vous accompagner par l’équipe AQ8.",
    icon: CalendarCheck,
  },
];

export function HomeHowItWorks() {
  return (
    <section className="space-y-10">
      {/* Header */}
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <span className="inline-flex items-center justify-center rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
          Parcours de réservation
        </span>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
            Comment réserver votre séance AQ8 ?
          </h2>

          <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Un parcours simple et organisé pour choisir votre centre, envoyer
            votre demande de réservation et préparer votre première séance AQ8
            ou Wonder dans les meilleures conditions.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.step}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="absolute right-4 top-4 font-mono text-4xl font-black leading-none text-[#ff5757]/10 transition-all group-hover:text-[#ff5757]/15">
                {item.step}
              </div>

              <div className="relative space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757] transition-all group-hover:bg-[#ff5757] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-base font-bold text-[#353535]">
                    {item.title}
                  </h3>

                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* CTA / reassurance */}
      <div className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <h3 className="font-display text-lg font-bold text-[#353535]">
              Vous ne savez pas quel centre choisir ?
            </h3>

            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Consultez la liste des centres AQ8 pour comparer les prestations,
              les horaires, les consignes pratiques et les moyens de contact.
            </p>
          </div>

          <Link
            href="/centres"
            aria-label="Voir les centres AQ8 en Algérie"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
          >
            Voir les centres
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}