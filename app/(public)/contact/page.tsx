/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { getSeoForPage } from "../../../lib/seo";
import { getCenters } from "../../../lib/centers";
import { ContactForm } from "../../../components/contact/ContactForm";

export const metadata: Metadata = {
  title: getSeoForPage("contact").title,
  description: getSeoForPage("contact").description,
};

const contactInfo = {
  address: "12 Rue des Glycines, Hydra, Alger",
  phone: "+213 (0) 23 48 50 60",
  email: "contact@aq8algerie.com",
};

function getWhatsAppUrl(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}`;
}

export default function ContactPage() {
  const centers = getCenters();

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-lg bg-[#353535] px-6 py-14 text-center text-white sm:px-10 lg:px-14">

          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
              <MessageCircle className="h-3.5 w-3.5" />
              Contact AQ8 Algérie
            </span>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                Contactez AQ8 Algérie
              </h1>

              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
                Une question sur AQ8, Wonder, les centres, les réservations, les
                horaires ou les prestations ? Envoyez-nous votre demande, notre
                équipe vous orientera vers la réponse adaptée.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              <Link
                href="/centres"
                aria-label="Voir les centres AQ8 en Algérie"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5757] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#e94949]"
              >
                Voir les centres
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href={getWhatsAppUrl(contactInfo.phone)}
                target="_blank"
                rel="noreferrer"
                aria-label="Contacter AQ8 Algérie sur WhatsApp"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
              >
                <MessageCircle className="h-4 w-4 text-[#ff5757]" />
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Contact grid */}
        <section className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-4">
            <div className="relative overflow-hidden rounded-lg bg-[#353535] p-6 text-white sm:p-8">

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-[#ff5757]">
                    Coordonnées générales
                  </span>

                  <h2 className="font-display text-2xl font-bold text-white">
                    AQ8 Algérie
                  </h2>

                  <p className="text-sm font-medium leading-relaxed text-slate-300">
                    Contactez l’équipe AQ8 Algérie pour une question générale,
                    une demande de réservation, de partenariat ou d’information.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-slate-200">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5757]" />
                    <div>
                      <span className="block text-xs font-bold uppercase text-slate-400">
                        Adresse
                      </span>
                      <p className="font-medium text-slate-200">
                        {contactInfo.address}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5757]" />
                    <div>
                      <span className="block text-xs font-bold uppercase text-slate-400">
                        Téléphone
                      </span>
                      <a
                        href={`tel:${contactInfo.phone}`}
                        className="font-semibold text-slate-200 transition-colors hover:text-[#ff5757]"
                      >
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#ff5757]" />
                    <div>
                      <span className="block text-xs font-bold uppercase text-slate-400">
                        E-mail
                      </span>
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className="font-medium text-slate-200 transition-colors hover:text-[#ff5757]"
                      >
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <a
                    href={getWhatsAppUrl(contactInfo.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Écrire sur WhatsApp
                  </a>

                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
                  >
                    <Phone className="h-4 w-4" />
                    Appeler
                  </a>
                </div>
              </div>
            </div>

            {/* Centers shortcut */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Centres AQ8
                </span>

                <h2 className="font-display text-xl font-bold text-[#353535]">
                  Vous cherchez un centre précis ?
                </h2>

                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Consultez la liste des centres AQ8 pour accéder aux horaires,
                  prestations, consignes et moyens de contact de chaque
                  établissement.
                </p>

                <Link
                  href="/centres"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
                >
                  Voir les centres
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right column form */}
          <div className="lg:col-span-8">
            <ContactForm centers={centers} />
          </div>
        </section>
      </div>
    </main>
  );
}
