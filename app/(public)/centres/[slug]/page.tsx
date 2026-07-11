/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getCenterBySlug, getCenters } from "../../../../lib/centers";
import { generateCenterSeo } from "../../../../lib/seo";
import { SeoJsonLd } from "../../../../components/seo/SeoJsonLd";
import { CenterBookingForm } from "../../../../components/centres/CenterBookingForm";

interface PageProps {
  params: {
    slug: string;
  };
}

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder Sculpt";
  return service;
}

function getServiceDescription(service: string) {
  if (service.toLowerCase() === "aq8") {
    return "Électrostimulation active encadrée pour accompagner la tonification, la remise en forme et le suivi corporel.";
  }

  if (service.toLowerCase() === "wonder") {
    return "Sculpting corporel ciblé pour accompagner la tonification, le raffermissement et le suivi de certaines zones.";
  }

  return "Prestation disponible selon les conditions et les disponibilités du centre.";
}

function getWhatsAppUrl(phone?: string) {
  if (!phone) return "#";

  const digits = phone.replace(/[^0-9]/g, "");

  return `https://wa.me/${digits}`;
}

export async function generateStaticParams() {
  const centers = getCenters();

  return centers.map((center) => ({
    slug: center.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const center = getCenterBySlug(params.slug);

  if (!center) {
    return {
      title: "Centre introuvable | AQ8 Algérie",
      description:
        "Le centre demandé n’existe pas ou n’est pas disponible actuellement.",
    };
  }

  const seo = generateCenterSeo(center);

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      images: center.imageUrl ? [{ url: center.imageUrl }] : [{ url: "/images/aq8algerie.webp" }],
    },
  };
}

export default function CenterDetailPage({ params }: PageProps) {
  const center = getCenterBySlug(params.slug);

  if (!center) {
    return (
      <main className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-8">
            <h1 className="font-display text-2xl font-bold text-[#353535]">
              Centre introuvable
            </h1>

            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Désolé, ce centre n’existe pas ou n’est pas disponible
              actuellement.
            </p>

            <Link
              href="/centres"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
            >
              Voir tous les centres
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${center.address} ${center.city}`
  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <main className="bg-white">
      <SeoJsonLd type="local_business" center={center} />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-[#353535] text-white shadow-xl">
          <div className="absolute inset-0">
            <Image
              src={center.imageUrl || "/images/aq8algerie.webp"}
              alt={`Centre AQ8 ${center.name} à ${center.city}`}
              width={1400}
              height={800}
              priority
              className="h-full w-full object-cover opacity-35 grayscale-[15%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#353535] via-[#353535]/90 to-[#353535]/40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,87,87,0.22),transparent_55%)]" />
          </div>

          <div className="relative z-10 grid gap-10 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:px-14 lg:py-20">
            <div className="space-y-7 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                  <MapPin className="h-3.5 w-3.5" />
                  AQ8 {center.city}
                </span>

                {center.status && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {center.status}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {center.name}
                </h1>

                <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                  {center.description ||
                    `Découvrez le centre AQ8 ${center.name} à ${center.city}, ses prestations, ses horaires, ses consignes pratiques et ses moyens de contact.`}
                </p>
              </div>

              <div className="grid gap-3 text-sm font-medium text-slate-300 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                  <span>{center.address}</span>
                </div>

                {center.phone && (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <Phone className="h-4 w-4 shrink-0 text-[#ff5757]" />
                    <span>{center.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <a
                  href="#booking-form-section"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#ff5757]/20 transition-all hover:-translate-y-0.5 hover:bg-[#e94949]"
                >
                  <Calendar className="h-4 w-4" />
                  Réserver une séance
                </a>

                <a
                  href="#contact-cta-section"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <MessageCircle className="h-4 w-4 text-[#ff5757]" />
                  Contacter le centre
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-3 text-slate-700">
            {/* Local SEO */}
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Centre AQ8 à {center.city}
                </span>

                <h2 className="font-display text-2xl font-bold text-[#353535]">
                  Votre centre AQ8 à {center.city}
                </h2>

                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Le centre AQ8{" "}
                  <span className="font-bold text-[#353535]">
                    {center.name}
                  </span>{" "}
                  accueille les clients souhaitant découvrir des séances
                  encadrées d’électrostimulation, de remise en forme et de suivi
                  corporel. Situé à{" "}
                  <span className="font-bold text-[#353535]">
                    {center.city}
                  </span>
                  , il propose les prestations{" "}
                  <span className="font-bold text-[#353535]">
                    {center.services.map(getServiceLabel).join(" et ")}
                  </span>{" "}
                  selon les horaires et disponibilités du centre.
                </p>
              </div>
            </section>

            {/* Important notes */}
            {center.importantNotes && center.importantNotes.length > 0 && (
              <section className="rounded-3xl border border-slate-100 border-l-4 border-l-[#ff5757] bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                    <Info className="h-5 w-5" />
                  </div>

                  <h2 className="font-display text-xl font-bold text-[#353535]">
                    Informations importantes
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {center.importantNotes.map((note, index) => (
                    <div
                      key={`${note}-${index}`}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5757]" />
                      <p className="text-sm font-medium leading-relaxed text-slate-600">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hours */}
            <section className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#353535]">
                  Horaires du centre
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Les horaires peuvent varier selon les périodes. Merci de
                  vérifier les disponibilités lors de la demande de réservation.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#353535]">
                      Horaires hommes
                    </h3>
                    <span className="rounded-full bg-[#ff5757]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#ff5757]">
                      Homme
                    </span>
                  </div>

                  {center.menHours && center.menHours.length > 0 ? (
                    <div className="space-y-2">
                      {center.menHours.map((time) => (
                        <div
                          key={time}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                        >
                          <Clock className="h-4 w-4 text-[#ff5757]" />
                          <span>{time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium italic text-slate-400">
                      Aucun créneau spécifique défini.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#353535]">
                      Horaires femmes
                    </h3>
                    <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-600">
                      Femme
                    </span>
                  </div>

                  {center.womenHours && center.womenHours.length > 0 ? (
                    <div className="space-y-2">
                      {center.womenHours.map((time) => (
                        <div
                          key={time}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                        >
                          <Clock className="h-4 w-4 text-[#ff5757]" />
                          <span>{time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium italic text-slate-400">
                      Aucun créneau spécifique défini.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#353535]">
                  Prestations disponibles
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Choisissez la prestation adaptée à vos objectifs.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {center.services.map((service) => (
                  <article
                    key={service}
                    className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <h3 className="font-display text-lg font-bold text-[#353535]">
                      {getServiceLabel(service)}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                      {getServiceDescription(service)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Equipment */}
            {center.equipment && center.equipment.length > 0 && (
              <section className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#353535]">
                    Équipements à prévoir
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Ces éléments permettent de respecter les consignes d’hygiène
                    et de confort du centre.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {center.equipment.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-sm"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-lg">
                        {index === 0
                          ? "👕"
                          : index === 1
                          ? "👖"
                          : index === 2
                          ? "👟"
                          : "🎒"}
                      </div>

                      <p className="text-xs font-bold leading-snug text-[#353535]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cancellation */}
            <section className="rounded-3xl border border-rose-100 bg-rose-50/60 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                  <ShieldAlert className="h-5 w-5" />
                </div>

                <h2 className="font-display text-xl font-bold text-[#353535]">
                  Annulation et crédit forfait
                </h2>
              </div>

              <div className="space-y-3 text-sm font-medium leading-relaxed text-slate-700">
                <p>
                  Si vous ne pouvez pas assister à votre séance, merci d’annuler
                  votre rendez-vous au moins 1 heure à l’avance.
                </p>

                <p className="rounded-2xl border border-[#ff5757]/10 bg-[#ff5757]/5 p-4 font-semibold text-[#ff5757]">
                  En cas d’absence non annulée dans les délais, un crédit peut
                  être déduit du forfait en cours.
                </p>
              </div>
            </section>
          </div>

          {/* Right booking form */}
          <aside
            id="booking-form-section"
            className="scroll-mt-24 lg:col-span-2"
          >
            <div className="sticky top-24">
              <CenterBookingForm
                centerId={center.id}
                centerName={center.name}
                centerCity={center.city}
                services={center.services}
              />
            </div>
          </aside>
        </div>

        {/* Contact CTA */}
        <section
          id="contact-cta-section"
          className="scroll-mt-24 rounded-3xl bg-[#353535] p-6 text-white shadow-xl sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                  Contact rapide
                </span>

                <h2 className="font-display text-2xl font-bold text-white">
                  Contacter le centre {center.name}
                </h2>

                <p className="text-sm font-medium leading-relaxed text-slate-300">
                  Pour toute question sur l’accès, les horaires, les prestations
                  ou les disponibilités, contactez directement le centre.
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                  <span>{center.address}</span>
                </div>

                {center.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-[#ff5757]" />
                    <span className="font-bold">{center.phone}</span>
                  </div>
                )}

                {center.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-[#ff5757]" />
                    <span>{center.email}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <a
                  href="#booking-form-section"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#e94949]"
                >
                  <Calendar className="h-4 w-4" />
                  Réserver ma séance
                </a>

                {center.phone && (
                  <>
                    <a
                      href={getWhatsAppUrl(center.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>

                    <a
                      href={`tel:${center.phone}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/15"
                    >
                      <Phone className="h-4 w-4" />
                      Appeler
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="h-64 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-inner">
              <iframe
                title={`Carte de ${center.name}`}
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="opacity-90 transition-opacity hover:opacity-100"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
