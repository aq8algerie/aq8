/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  HelpCircle,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";

export const metadata: Metadata = {
  title: getSeoForPage("faq").title,
  description: getSeoForPage("faq").description,
};

const faqItems = [
  {
    question: "Qu’est-ce que AQ8 EMS ?",
    answer:
      "AQ8 EMS est une approche d’électrostimulation musculaire active. Le client réalise des mouvements encadrés pendant que la stimulation accompagne l’effort, avec une intensité adaptée selon son profil et ses objectifs.",
  },
  {
    question: "Quelle est la différence entre AQ8 et Wonder ?",
    answer:
      "AQ8 est une séance active basée sur l’électrostimulation pendant le mouvement. Wonder est une approche de sculpting corporel ciblé, généralement pratiquée en position allongée ou semi-assise, pour accompagner la tonification et le suivi de certaines zones.",
  },
  {
    question: "Comment réserver une séance AQ8 ou Wonder ?",
    answer:
      "Il suffit de choisir un centre AQ8, de consulter ses horaires et consignes, puis d’envoyer une demande de réservation. L’équipe du centre vous recontacte ensuite pour confirmer le créneau selon les disponibilités.",
  },
  {
    question: "Combien de séances sont conseillées ?",
    answer:
      "La fréquence dépend du profil, des objectifs, de la prestation choisie et des recommandations de l’équipe du centre. Un premier échange permet d’orienter le client vers un rythme adapté.",
  },
  {
    question: "Faut-il apporter une tenue spécifique ?",
    answer:
      "Oui, certains centres peuvent demander une tenue ou des équipements précis : t-shirt manches longues, bas fin en coton, baskets propres ou tenue de rechange. Les consignes exactes sont indiquées sur la page de chaque centre.",
  },
  {
    question: "La séance est-elle douloureuse ?",
    answer:
      "La sensation varie selon les personnes et l’intensité choisie. L’équipe du centre adapte progressivement les réglages selon le profil, les sensations et le niveau de confort du client.",
  },
  {
    question: "Y a-t-il des contre-indications ?",
    answer:
      "En cas de grossesse, pacemaker, dispositif médical implanté, épilepsie, problème cardiaque, trouble circulatoire ou doute médical, il est recommandé de demander un avis médical avant toute séance d’électrostimulation ou de stimulation corporelle.",
  },
  {
    question: "Les résultats sont-ils garantis ?",
    answer:
      "Non. Les résultats peuvent varier selon le profil, la régularité des séances, l’hygiène de vie, les objectifs et l’accompagnement suivi. AQ8 Algérie privilégie une approche encadrée, progressive et réaliste.",
  },
  {
    question: "Puis-je choisir entre AQ8 et Wonder ?",
    answer:
      "Oui, selon les prestations disponibles dans le centre choisi. AQ8 est orienté vers une séance active encadrée, tandis que Wonder accompagne davantage un travail ciblé de tonification et de suivi corporel.",
  },
  {
    question: "Comment annuler ou modifier un rendez-vous ?",
    answer:
      "Les conditions peuvent varier selon les centres. En général, il est préférable de prévenir le centre le plus tôt possible. Certains centres peuvent appliquer une règle d’annulation avec déduction d’un crédit en cas d’absence non signalée dans les délais.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-[#353535] px-6 py-14 text-center text-white shadow-xl sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,87,87,0.20),transparent_55%)]" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
          <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <HelpCircle className="h-3.5 w-3.5" />
              Questions fréquentes
            </span>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Foire aux questions AQ8 Algérie
              </h1>

              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                Retrouvez les réponses essentielles sur AQ8 EMS, Wonder, les
                réservations, les centres, les équipements à prévoir et les
                précautions avant une séance.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/centres"
                aria-label="Voir les centres AQ8 en Algérie"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
              >
                Voir les centres
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/contact"
                aria-label="Contacter AQ8 Algérie"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                <MessageCircle className="h-4 w-4 text-[#ff5757]" />
                Nous contacter
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-4xl space-y-6">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Informations utiles
            </span>

            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
              Les réponses avant votre première séance
            </h2>

            <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Ces réponses donnent une vue générale. Les horaires, consignes et
              conditions peuvent varier selon le centre choisi.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
            {faqItems.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-slate-100 py-5 last:border-b-0"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                  <h3 className="font-display text-base font-bold text-[#353535] transition-colors group-open:text-[#ff5757] sm:text-lg">
                    {item.question}
                  </h3>

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-100 bg-slate-50 px-6 py-8 text-center sm:px-10">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#353535]">
              Une autre question ?
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600">
              L’équipe AQ8 Algérie peut vous orienter vers le centre adapté ou
              répondre à une demande spécifique.
            </p>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <a
                href="tel:+21323485060"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
              >
                <Phone className="h-4 w-4" />
                +213 (0) 23 48 50 60
              </a>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ff5757]/15 bg-[#ff5757]/5 px-5 py-3 text-sm font-bold text-[#ff5757] transition-all hover:border-[#ff5757]/30 hover:bg-[#ff5757]/10"
              >
                Envoyer un message
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
