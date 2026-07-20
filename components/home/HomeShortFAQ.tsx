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
      <div className="grid gap-6 md:grid-cols-3">
        {faqs.map((faq, index) => (
          <article key={faq.q} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-premium hover:border-[#ff5757]/30 hover:shadow-md">
            <div className="absolute top-0 left-0 h-[3px] w-full bg-slate-100 transition-colors group-hover:bg-[#ff5757]" />
            <span className="font-mono text-xs font-bold text-[#ff5757] uppercase tracking-wider">Question 0{index + 1}</span>
            <h3 className="mt-2 font-display text-base font-bold text-[#242424]">{faq.q}</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{faq.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
