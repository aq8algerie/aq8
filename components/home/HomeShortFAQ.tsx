import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

const faqs = [
  { q: "Qu'est-ce que AQ8 EMS ?", a: "Une séance active d'électrostimulation musculaire, guidée par l'équipe du centre avec une intensité progressive." },
  { q: "Quelle différence avec Wonder ?", a: "AQ8 accompagne l'effort actif. Wonder est davantage orienté vers un travail cible de tonification et de suivi corporel." },
  { q: "Comment réserver ?", a: "Choisissez un centre, envoyez une demande, puis l'équipe confirme le créneau selon les disponibilités." },
];

export function HomeShortFAQ() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[#ff5757]"><HelpCircle className="h-4 w-4" />Questions fréquentes</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">Les réponses essentielles, sans surcharge.</h2>
        </div>
        <Link href="/a-propos" aria-label="Voir les questions fréquentes AQ8 Algérie" className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#242424] transition-premium hover:border-[#ff5757] hover:text-[#ff5757]">
          Voir plus
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {faqs.map((faq) => (
          <article key={faq.q} className="grid gap-3 p-5 sm:grid-cols-12 sm:p-6">
            <h3 className="font-display text-base font-bold text-[#242424] sm:col-span-4">{faq.q}</h3>
            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:col-span-8">{faq.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
