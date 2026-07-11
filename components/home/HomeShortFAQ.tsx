import Link from "next/link";
import { ArrowRight, HelpCircle, MessageCircle, Sparkles } from "lucide-react";

const faqs = [
  {
    q: "Qu’est-ce que la technologie AQ8 EMS ?",
    a: "AQ8 EMS est une approche d’électrostimulation musculaire active. Le client réalise des mouvements encadrés pendant que la stimulation accompagne l’effort, avec une intensité adaptée selon son profil et ses objectifs.",
  },
  {
    q: "Quelle est la différence entre AQ8 et Wonder ?",
    a: "AQ8 est une séance active basée sur l’électrostimulation pendant le mouvement. Wonder est une approche plus ciblée de sculpting corporel, utilisée pour accompagner la tonification et le suivi de certaines zones comme les abdominaux, les cuisses ou les fessiers.",
  },
  {
    q: "Comment réserver une séance AQ8 ou Wonder ?",
    a: "Il suffit de choisir un centre AQ8, de consulter ses horaires et consignes, puis d’envoyer une demande de réservation. L’équipe du centre vous recontacte ensuite pour confirmer le créneau selon les disponibilités.",
  },
];

export function HomeShortFAQ() {
  return (
    <section className="space-y-10">
      {/* Header */}
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
          <HelpCircle className="h-3.5 w-3.5" />
          Questions fréquentes
        </span>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
            Des réponses simples avant votre première séance
          </h2>

          <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Retrouvez les réponses essentielles sur AQ8, Wonder et la demande de
            réservation dans nos centres en Algérie.
          </p>
        </div>
      </div>

      {/* FAQ cards */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5">
        {faqs.map((faq, index) => (
          <article
            key={faq.q}
            className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757] transition-all group-hover:bg-[#ff5757] group-hover:text-white">
                {index === 0 ? (
                  <Sparkles className="h-5 w-5" />
                ) : index === 1 ? (
                  <HelpCircle className="h-5 w-5" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-base font-bold leading-snug text-[#353535]">
                  {faq.q}
                </h3>

                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  {faq.a}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/faq"
          aria-label="Consulter toute la foire aux questions AQ8 Algérie"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ff5757]/15 bg-[#ff5757]/5 px-5 py-3 text-sm font-bold text-[#ff5757] transition-all hover:border-[#ff5757]/30 hover:bg-[#ff5757]/10"
        >
          Consulter toute la foire aux questions
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}