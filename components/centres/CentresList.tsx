"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import type { Center } from "../../src/types";

type CentresListProps = {
  centers: Center[];
};

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder Sculpt";
  return service;
}

function getServiceClass(service: string) {
  if (service.toLowerCase() === "aq8") {
    return "bg-[#ff5757]/10 text-[#ff5757]";
  }

  if (service.toLowerCase() === "wonder") {
    return "bg-amber-500/10 text-amber-600";
  }

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
    if (c === "bir khadem" || c === "alger" || c === "hydra" || c.includes("alger")) {
      return "Alger";
    }
    return city.charAt(0).toUpperCase() + city.slice(1);
  };

  const [selectedWilaya, setSelectedWilaya] = useState("all");

  const wilayas = useMemo(() => {
    const uniqueWilayas = Array.from(
      new Set(centers.map((center) => getWilaya(center.city)).filter(Boolean))
    );

    return ["all", ...uniqueWilayas];
  }, [centers]);

  const filteredCenters = useMemo(() => {
    if (selectedWilaya === "all") return centers;

    return centers.filter(
      (center) => getWilaya(center.city).toLowerCase() === selectedWilaya.toLowerCase()
    );
  }, [centers, selectedWilaya]);

  if (!centers.length) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-slate-50 px-6 py-12 text-center">
        <div className="mx-auto max-w-xl space-y-3">
          <h2 className="font-display text-2xl font-bold text-[#353535]">
            Aucun centre disponible pour le moment
          </h2>

          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Les centres AQ8 seront bientôt affichés ici avec leurs prestations,
            horaires, consignes et moyens de contact.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      {/* Filters */}
      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
              <Search className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-[#353535]">
                Filtrer par wilaya
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {filteredCenters.length} centre
                {filteredCenters.length > 1 ? "s" : ""} affiché
                {filteredCenters.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {wilayas.map((wilaya) => (
              <button
                key={wilaya}
                type="button"
                onClick={() => setSelectedWilaya(wilaya)}
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  selectedWilaya === wilaya
                    ? "border-[#353535] bg-[#353535] text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {wilaya === "all" ? "Toutes les wilayas" : wilaya}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Centers grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredCenters.map((center) => (
          <article
            key={center.id}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {/* Image */}
            <div className="relative h-56 overflow-hidden bg-slate-100">
              <Image
                src={center.imageUrl || "/images/aq8algerie.webp"}
                alt={`Centre AQ8 ${center.name} à ${center.city}`}
                width={700}
                height={450}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#353535]/60 via-transparent to-transparent" />

              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#ff5757] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                <MapPin className="h-3.5 w-3.5" />
                {center.city}
              </span>

              <span className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-[#353535]/85 px-4 py-3 text-xs font-semibold text-white backdrop-blur">
                {getAudienceLabel(center)}
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-between gap-6 p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold leading-snug text-[#353535] transition-colors group-hover:text-[#ff5757]">
                    {center.name}
                  </h3>

                  <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{center.address}</span>
                  </p>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Prestations proposées
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {center.services.map((service) => (
                      <span
                        key={service}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getServiceClass(
                          service
                        )}`}
                      >
                        {getServiceLabel(service)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Practical info */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  {center.schedule && (
                    <div className="flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                      <span>{center.schedule}</span>
                    </div>
                  )}

                  {center.phone && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-[#ff5757]" />
                      <span>{center.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Users className="h-4 w-4 shrink-0 text-[#ff5757]" />
                    <span>{getAudienceLabel(center)}</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/centres/${center.slug}`}
                aria-label={`Découvrir et réserver au centre AQ8 ${center.name}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#353535] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff5757]"
              >
                Découvrir ce centre
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
