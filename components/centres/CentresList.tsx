"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, Search, Users } from "lucide-react";
import type { Center } from "../../src/types";

type CentresListProps = { centers: Center[] };

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder";
  return service;
}

function getServiceClass(service: string) {
  if (service.toLowerCase() === "aq8") return "bg-[#ff5757]/10 text-[#ff5757]";
  if (service.toLowerCase() === "wonder") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function getAudienceLabel(center: Center) {
  const hasWomenHours = (center.womenHours?.length ?? 0) > 0;
  const hasMenHours = (center.menHours?.length ?? 0) > 0;
  if (hasWomenHours && hasMenHours) return "Créneaux hommes & femmes";
  if (hasWomenHours) return "Créneaux femmes";
  if (hasMenHours) return "Créneaux hommes";
  return "Horaires à confirmer";
}

export function CentresList({ centers }: CentresListProps) {
  const getWilaya = (city: string) => {
    const c = city.toLowerCase().trim();
    if (c === "bir khadem" || c === "alger" || c === "hydra" || c.includes("alger")) return "Alger";
    return city.charAt(0).toUpperCase() + city.slice(1);
  };

  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const wilayas = useMemo(() => ["all", ...Array.from(new Set(centers.map((center) => getWilaya(center.city)).filter(Boolean)))], [centers]);
  const filteredCenters = useMemo(() => selectedWilaya === "all" ? centers : centers.filter((center) => getWilaya(center.city).toLowerCase() === selectedWilaya.toLowerCase()), [centers, selectedWilaya]);

  if (!centers.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <div className="mx-auto max-w-xl space-y-3">
          <h2 className="font-display text-2xl font-bold text-[#242424]">Aucun centre public pour le moment</h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600">Les centres AQ8 actifs seront affichés ici avec leurs prestations, horaires, consignes et moyens de contact.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[#ff5757]"><Search className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-base font-bold text-[#242424]">Filtrer par wilaya</h2>
            <p className="text-xs font-medium text-slate-500">{filteredCenters.length} centre{filteredCenters.length > 1 ? "s" : ""} affiché{filteredCenters.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {wilayas.map((wilaya) => (
            <button key={wilaya} type="button" onClick={() => setSelectedWilaya(wilaya)} className={"rounded-md border px-3.5 py-2 text-xs font-bold transition-premium cursor-pointer " + (selectedWilaya === wilaya ? "border-[#242424] bg-[#242424] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>{wilaya === "all" ? "Toutes" : wilaya}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCenters.map((center) => (
          <article key={center.id} className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="relative h-56 overflow-hidden bg-slate-100">
              <Image src={center.imageUrl || "/images/aq8algerie.webp"} alt={"Centre AQ8 " + center.name + " à " + center.city} width={700} height={450} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="absolute left-4 top-4 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#242424]">{center.city}</div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-6 p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold leading-snug text-[#242424]">{center.name}</h3>
                  <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" /><span>{center.address}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {center.services.map((service) => <span key={service} className={"rounded-md px-2.5 py-1 text-xs font-bold " + getServiceClass(service)}>{getServiceLabel(service)}</span>)}
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium leading-relaxed text-slate-600">
                  {center.schedule && <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" /><span>{center.schedule}</span></div>}
                  {center.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-[#ff5757]" /><span>{center.phone}</span></div>}
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0 text-[#ff5757]" /><span>{getAudienceLabel(center)}</span></div>
                </div>
              </div>
              <Link href={"/centres/" + center.slug} aria-label={"Découvrir et réserver au centre AQ8 " + center.name} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#242424] px-5 py-3 text-sm font-bold text-white transition-premium hover:bg-[#ff5757]">
                Détails et réservation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
