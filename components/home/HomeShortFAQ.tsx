import Link from "next/link";
import { ArrowRight, HelpCircle, Sparkles } from "lucide-react";

const faqs = [
  {
    q: "Qu'est-ce que l'électrostimulation AQ8 EMS ?",
    a: "L'AQ8 EMS est une technologie sans fil d'origine espagnole sollicitant simultanément 350 muscles grâce à des impulsions contrôlées. En 20 minutes d'entraînement encadré, vous obtenez l'équivalent de 4 heures de musculation traditionnelle.",
  },
  {
    q: "Quelle est la différence avec la technologie Wonder Sculpt ?",
    a: "AQ8 EMS est une séance active où vous effectuez des mouvements guidés par un coach. Wonder Sculpt combine des impulsions électromagnétiques supramaximales en position allongée pour 52 000 contractions ciblées sur l'abdomen et les fessiers.",
  },
  {
    q: "Combien de séances par semaine sont conseillées ?",
    a: "Pour l'EMS AQ8, 1 à 2 séances de 20 minutes par semaine sont idéales pour laisser les muscles se régénérer. Pour Wonder, 2 séances par semaine sur une cure de 4 semaines offrent d'excellents résultats de galbe.",
  },
  {
    q: "Comment se déroule la réservation dans vos centres en Algérie ?",
    a: "Vous choisissez le centre AQ8 le plus proche (Alger, Blida, Tlemcen, Sidi Yahia...), vous sélectionnez la prestation souhaitée et envoyez votre demande. L'équipe du centre vous recontacte pour confirmer le créneau.",
  },
];

export function HomeShortFAQ() {
  return (
    <section className="space-y-10 sm:space-y-12">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#fff0f0] px-3 py-1 text-xs font-extrabold uppercase text-[#ff5757]">
            <HelpCircle className="h-3.5 w-3.5" />
            Vos Questions Fréquentes
          </div>
          <h2 className="font-display text-3xl font-black tracking-tight text-[#242424] sm:text-4xl lg:text-5xl">
            Tout ce qu'il faut savoir avant votre séance.
          </h2>
        </div>

        <Link
          href="/faq"
          aria-label="Consulter toutes les questions fréquentes FAQ"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#242424] transition-all duration-300 hover:border-[#ff5757] hover:text-[#ff5757]"
        >
          <span>Voir toute la FAQ</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* FAQ Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {faqs.map((faq, index) => (
          <article
            key={faq.q}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#ff5757]/40 hover:shadow-xl sm:p-7"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-[#fff0f0] px-2.5 py-1 text-[11px] font-extrabold uppercase text-[#ff5757]">
                  Question 0{index + 1}
                </span>
                <Sparkles className="h-4 w-4 text-slate-300 transition-colors group-hover:text-[#ff7777]" />
              </div>

              <h3 className="font-display text-base font-bold tracking-tight text-[#242424] sm:text-lg">
                {faq.q}
              </h3>

              <p className="text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                {faq.a}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
