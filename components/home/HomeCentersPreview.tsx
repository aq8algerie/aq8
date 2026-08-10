import Link from "next/link";
import { ArrowRight, Clock, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Center } from "../../src/types";

interface HomeCentersPreviewProps {
  centers: Center[];
}

function getCenterAudienceLabel(center: Center) {
  if (center.status?.toLowerCase().includes("femmes uniquement") || center.slug === "ouled-fayet") {
    return "Réservé Femmes";
  }
  const hasWomenHours = (center.womenHours?.length ?? 0) > 0 && center.womenHours?.some(h => !h.toLowerCase().includes("indisponible"));
  const hasMenHours = (center.menHours?.length ?? 0) > 0 && center.menHours?.some(h => !h.toLowerCase().includes("indisponible"));
  if (hasWomenHours && hasMenHours) return "Créneaux Hommes & Femmes";
  if (hasWomenHours) return "Réservé Femmes";
  if (hasMenHours) return "Réservé Hommes";
  return "Horaires Adaptés";
}

export function HomeCentersPreview({ centers }: HomeCentersPreviewProps) {
  const previewCenters = centers.slice(0, 3);

  if (!centers.length) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-lg sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f0f9ff] px-3 py-1 text-xs font-bold text-[#0284c7]">
            <MapPin className="h-3.5 w-3.5" />
            Réseau National AQ8
          </div>
          <h2 className="font-display text-2xl font-black text-[#242424] sm:text-3xl">Nos centres seront bientôt disponibles</h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Les centres de proximité AQ8 seront affichés ici avec leurs horaires, équipements, photos et accès de réservation directe.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10 sm:space-y-12">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#f0f9ff] px-3 py-1 text-xs font-extrabold uppercase text-[#0284c7]">
            <MapPin className="h-3.5 w-3.5" />
            Réseau Officiel Algérie
          </div>
          <h2 className="font-display text-3xl font-black tracking-tight text-[#242424] sm:text-4xl lg:text-5xl">
            Trouvez le centre AQ8 le plus proche.
          </h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Chaque centre partenaire propose des équipements haut de gamme, des coachs dédiés et un accès à la réservation instantanée.
          </p>
        </div>

        <Link
          href="/centres"
          aria-label="Voir la liste complète des centres AQ8 en Algérie"
          className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#242424] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#0284c7] hover:scale-[1.02]"
        >
          <span>Tous nos centres</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-extrabold">{centers.length}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Centers Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {previewCenters.map((center) => (
          <article
            key={center.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0284c7]/40 hover:shadow-xl"
          >
            <div>
              {/* Center Cover Image */}
              <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                <img
                  src={center.imageUrl || "/images/aq8algerie.webp"}
                  alt={`Centre AQ8 EMS & Wonder à ${center.name}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* City Tag Badge Top Left */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5 text-[#0284c7]" />
                  <span>{center.city}</span>
                </div>

                {/* Verified Badge Top Right */}
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-lg bg-emerald-500/90 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-sm backdrop-blur">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Certifié</span>
                </div>

                {/* Bottom Overlay Title */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-display text-xl font-black text-white">
                    {center.name}
                  </h3>
                </div>
              </div>

              {/* Center Info Body */}
              <div className="space-y-4 p-5 sm:p-6">
                <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">
                  {center.address}
                </p>

                <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Users className="h-4 w-4 shrink-0 text-[#0284c7]" />
                    <span>{getCenterAudienceLabel(center)}</span>
                  </div>
                  {center.schedule && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0284c7]" />
                      <span className="line-clamp-1">{center.schedule}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-5 pt-0 sm:p-6 sm:pt-0">
              <Link
                href={`/centres/${center.slug}`}
                aria-label={`Découvrir le centre AQ8 de ${center.name}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm font-bold text-[#242424] transition-all duration-300 hover:border-[#0284c7] hover:bg-[#0284c7] hover:text-white"
              >
                <span>Fiche du centre & Réservation</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
