import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import { Center } from "../../src/types";

interface HomeCentersPreviewProps {
  centers: Center[];
}

function getCenterAudienceLabel(center: Center) {
  const hasWomenHours = (center.womenHours?.length ?? 0) > 0;
  const hasMenHours = (center.menHours?.length ?? 0) > 0;
  if (hasWomenHours && hasMenHours) return "Creneaux hommes & femmes";
  if (hasWomenHours) return "Creneaux femmes";
  if (hasMenHours) return "Creneaux hommes";
  return "Horaires a confirmer";
}

export function HomeCentersPreview({ centers }: HomeCentersPreviewProps) {
  const previewCenters = centers.slice(0, 3);

  if (!centers.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center sm:px-10">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="text-sm font-bold text-[#ff5757]">Centres AQ8</p>
          <h2 className="font-display text-2xl font-bold text-[#242424] sm:text-3xl">Nos centres seront bientot disponibles</h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600">Les centres AQ8 seront affiches ici avec leurs horaires, prestations, consignes et moyens de contact.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-bold text-[#ff5757]">Reseau AQ8 Algerie</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#242424] sm:text-4xl">Choisir un centre devient plus simple.</h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">Chaque centre affiche ses prestations, ses horaires, ses consignes et son acces reservation avec une information maintenue a jour.</p>
        </div>
        <Link href="/centres" aria-label="Voir tous les centres AQ8 en Algerie" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#242424] px-5 py-3 text-sm font-bold text-white transition-premium hover:bg-[#ff5757]">
          Voir les centres
          <span className="rounded bg-white/12 px-2 py-0.5 text-xs">{centers.length}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {previewCenters.map((center) => (
          <article key={center.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="relative h-48 overflow-hidden bg-slate-100">
              <img src={center.imageUrl || "/images/aq8algerie.webp"} alt={"Centre AQ8 " + center.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
              <div className="absolute left-4 top-4 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#242424]">{center.city}</div>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-[#242424]">{center.name}</h3>
                <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">{center.address}</p>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#ff5757]" />{getCenterAudienceLabel(center)}</div>
                {center.schedule && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-[#ff5757]" /><span>{center.schedule}</span></div>}
              </div>
              <Link href={"/centres/" + center.slug} aria-label={"Decouvrir le centre AQ8 " + center.name} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#242424] transition-premium hover:border-[#ff5757] hover:text-[#ff5757]">
                Voir le centre
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
