import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { Center } from "../../src/types";

interface HomeCentersPreviewProps {
  centers: Center[];
}

function getCenterAudienceLabel(center: Center) {
  const hasWomenHours = (center.womenHours?.length ?? 0) > 0;
  const hasMenHours = (center.menHours?.length ?? 0) > 0;

  if (hasWomenHours && hasMenHours) return "Créneaux hommes & femmes";
  if (hasWomenHours) return "Créneaux femmes";
  if (hasMenHours) return "Créneaux hommes";

  return "Horaires à confirmer";
}

export function HomeCentersPreview({ centers }: HomeCentersPreviewProps) {
  const previewCenters = centers.slice(0, 3);

  if (!centers.length) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-12 text-center sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <MapPin className="h-3.5 w-3.5" />
            Centres AQ8
          </span>

          <h2 className="font-display text-2xl font-bold text-[#353535] sm:text-3xl">
            Nos centres AQ8 en Algérie
          </h2>

          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Les centres AQ8 seront bientôt disponibles sur cette page avec leurs
            horaires, prestations, consignes et informations de contact.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <MapPin className="h-3.5 w-3.5" />
            Réseau AQ8 Algérie
          </span>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
              Nos centres AQ8 en Algérie
            </h2>

            <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Trouvez le centre AQ8 le plus proche, consultez ses prestations,
              ses horaires, ses consignes pratiques et envoyez une demande de
              réservation.
            </p>
          </div>
        </div>

        <Link
          href="/centres"
          aria-label="Voir tous les centres AQ8 en Algérie"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ff5757]/15 bg-[#ff5757]/5 px-5 py-3 text-sm font-bold text-[#ff5757] transition-all hover:border-[#ff5757]/30 hover:bg-[#ff5757]/10"
        >
          Voir tous les centres
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#ff5757]">
            {centers.length}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Centers grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {previewCenters.map((center) => (
          <article
            key={center.id}
            className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {/* Top visual / identity */}
            <div className="relative space-y-5 p-6">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#ff5757]/10 blur-3xl transition-all group-hover:bg-[#ff5757]/15" />

              <div className="relative flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5757]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff5757]">
                  <MapPin className="h-3 w-3" />
                  {center.city}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500">
                  <Users className="h-3 w-3" />
                  {getCenterAudienceLabel(center)}
                </span>
              </div>

              <div className="relative space-y-3">
                <h3 className="font-display text-xl font-bold leading-snug text-[#353535] transition-colors group-hover:text-[#ff5757]">
                  {center.name}
                </h3>

                <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
                  {center.address}
                </p>
              </div>

              {/* Services */}
              <div className="relative flex flex-wrap gap-2 pt-1">
                {center.services.map((service) => (
                  <span
                    key={service}
                    className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    {service}
                  </span>
                ))}
              </div>

              {/* Schedule */}
              {center.schedule && (
                <div className="relative flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                  <p className="text-xs font-medium leading-relaxed text-slate-600">
                    {center.schedule}
                  </p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="border-t border-slate-100 p-6 pt-4">
              <Link
                href={`/centres/${center.slug}`}
                aria-label={`Découvrir le centre AQ8 ${center.name}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#353535] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
              >
                Découvrir ce centre
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* SEO / reassurance note */}
      <div className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-[#353535]">
              Une page dédiée pour chaque centre AQ8
            </h3>

            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Chaque centre dispose de sa propre page avec ses prestations, ses
              horaires, ses consignes d’accès, ses équipements à prévoir et ses
              informations de contact. Cette organisation facilite la réservation
              et améliore la visibilité locale de chaque établissement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}