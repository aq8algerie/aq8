"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, Search, Users, Filter, RotateCcw } from "lucide-react";
import type { Center } from "../../src/types";

type CentresListProps = { centers: Center[] };

function getServiceLabel(service: string) {
  if (service.toLowerCase() === "aq8") return "AQ8 EMS";
  if (service.toLowerCase() === "wonder") return "Wonder Sculpt";
  return service;
}

function getServiceClass(service: string) {
  if (service.toLowerCase() === "aq8") return "bg-[#ff5757]/10 text-[#ff5757] border border-[#ff5757]/20";
  if (service.toLowerCase() === "wonder") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-600";
}

function getAudienceLabel(center: Center) {
  if (center.status?.toLowerCase().includes("femmes uniquement")) {
    return "Femmes uniquement";
  }
  const hasWomenHours = (center.womenHours?.length ?? 0) > 0;
  const hasMenHours = (center.menHours?.length ?? 0) > 0;
  if (hasWomenHours && hasMenHours) return "Créneaux hommes & femmes";
  if (hasWomenHours) return "Créneaux femmes";
  if (hasMenHours) return "Créneaux hommes";
  return "Horaires adaptés";
}

function getStatusBadge(center: Center) {
  const status = (center.status || "").toLowerCase();
  if (status.includes("femmes uniquement")) {
    return { label: "Femmes uniquement", color: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (status.includes("temporaires")) {
    return { label: "Horaires temporaires", color: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { label: "Ouvert", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export function CentresList({ centers }: CentresListProps) {
  const [search, setSearch] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedAudience, setSelectedAudience] = useState("all");

  const getWilaya = (city: string) => {
    const c = city.toLowerCase().trim();
    if (c === "bir khadem" || c === "alger" || c === "hydra" || c.includes("alger")) return "Alger";
    return city.charAt(0).toUpperCase() + city.slice(1);
  };

  const wilayas = useMemo(() => ["all", ...Array.from(new Set(centers.map((c) => getWilaya(c.city)).filter(Boolean)))], [centers]);

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      // Wilaya filter
      const matchesWilaya = selectedWilaya === "all" || getWilaya(center.city).toLowerCase() === selectedWilaya.toLowerCase();

      // Service filter
      const matchesService = selectedService === "all" || center.services.some(s => s.toLowerCase() === selectedService.toLowerCase());

      // Audience filter
      const isWomenOnly = (center.status || "").toLowerCase().includes("femmes uniquement");
      const matchesAudience =
        selectedAudience === "all" ||
        (selectedAudience === "women" && (isWomenOnly || (center.womenHours?.length ?? 0) > 0)) ||
        (selectedAudience === "mix" && !isWomenOnly && (center.menHours?.length ?? 0) > 0);

      // Search query
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        center.name.toLowerCase().includes(query) ||
        center.city.toLowerCase().includes(query) ||
        center.address.toLowerCase().includes(query) ||
        center.description.toLowerCase().includes(query);

      return matchesWilaya && matchesService && matchesAudience && matchesSearch;
    });
  }, [centers, selectedWilaya, selectedService, selectedAudience, search]);

  const hasActiveFilters = Boolean(search || selectedWilaya !== "all" || selectedService !== "all" || selectedAudience !== "all");

  const resetFilters = () => {
    setSearch("");
    setSelectedWilaya("all");
    setSelectedService("all");
    setSelectedAudience("all");
  };

  if (!centers.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <div className="mx-auto max-w-xl space-y-3">
          <h2 className="font-display text-2xl font-bold text-[#242424]">Aucun centre public pour le moment</h2>
          <p className="text-sm font-medium leading-relaxed text-slate-600">Les centres AQ8 actifs seront affichés ici avec leurs prestations, horaires et coordonnées.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* FILTER PANEL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5757]/10 text-[#ff5757]">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#242424]">Rechercher et filtrer nos centres</h2>
              <p className="text-xs font-medium text-slate-500">
                <span className="font-bold text-slate-800">{filteredCenters.length}</span> centre{filteredCenters.length > 1 ? "s" : ""} disponible{filteredCenters.length > 1 ? "s" : ""} sur le réseau
              </p>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* INPUTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom du centre, ville, adresse..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff5757]/20 focus:border-[#ff5757] text-slate-800 bg-slate-50/50"
            />
          </div>

          {/* WILAYA SELECTOR */}
          <div className="space-y-1">
            <select
              value={selectedWilaya}
              onChange={(e) => setSelectedWilaya(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff5757]/20 focus:border-[#ff5757] text-slate-800 bg-slate-50/50 cursor-pointer font-bold"
            >
              <option value="all">Toutes les wilayas</option>
              {wilayas.filter(w => w !== "all").map(w => (
                <option key={w} value={w}>Wilaya de {w}</option>
              ))}
            </select>
          </div>

          {/* SERVICE SELECTOR */}
          <div className="space-y-1">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff5757]/20 focus:border-[#ff5757] text-slate-800 bg-slate-50/50 cursor-pointer font-bold"
            >
              <option value="all">Toutes les technologies</option>
              <option value="aq8">AQ8 EMS (Électrostimulation)</option>
              <option value="wonder">Wonder Sculpt</option>
            </select>
          </div>

          {/* AUDIENCE SELECTOR */}
          <div className="space-y-1">
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff5757]/20 focus:border-[#ff5757] text-slate-800 bg-slate-50/50 cursor-pointer font-bold"
            >
              <option value="all">Tous les créneaux & accès</option>
              <option value="women">Centres & Créneaux Femmes</option>
              <option value="mix">Centres Mixtes (Hommes & Femmes)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CENTRES GRID */}
      {filteredCenters.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
          <MapPin className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">Aucun centre trouvé pour vos critères</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Modifiez votre recherche ou réinitialisez les filtres pour afficher l'ensemble des centres du réseau AQ8 Algérie.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCenters.map((center) => {
            const statusBadge = getStatusBadge(center);

            return (
              <article key={center.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-lg transition-all duration-300">
                <div className="relative h-56 overflow-hidden bg-slate-100">
                  <Image
                    src={center.imageUrl || "/images/aq8algerie.webp"}
                    alt={"Centre AQ8 " + center.name + " à " + center.city}
                    width={700}
                    height={450}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-[#242424] shadow-xs">
                      {center.city}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-5 p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-display text-xl font-bold leading-snug text-[#242424]">{center.name}</h3>
                      <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-600">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                        <span>{center.address}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {center.services.map((service) => (
                        <span key={service} className={"rounded-lg px-2.5 py-1 text-xs font-bold " + getServiceClass(service)}>
                          {getServiceLabel(service)}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium leading-relaxed text-slate-600">
                      {center.schedule && (
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5757]" />
                          <span>{center.schedule}</span>
                        </div>
                      )}
                      {center.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-[#ff5757]" />
                          <span className="font-bold text-slate-700">{center.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-[#ff5757]" />
                        <span className="font-bold text-slate-700">{getAudienceLabel(center)}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={"/centres/" + center.slug}
                    aria-label={"Découvrir et réserver au centre AQ8 " + center.name}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#242424] px-5 py-3.5 text-xs font-bold text-white transition-premium hover:bg-[#ff5757] shadow-sm cursor-pointer mt-2"
                  >
                    Détails et réservation
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

