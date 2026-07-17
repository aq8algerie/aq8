"use client";

import { useMemo, useState } from "react";
import { Activity, Sliders, Zap } from "lucide-react";

const zones = [
  { id: "full-body", label: "Tout le corps" },
  { id: "abs", label: "Sangle abdominale" },
  { id: "glute", label: "Zone fessière" },
  { id: "back", label: "Dos / posture" },
];

function getFrequencyLabel(frequency: number) {
  if (frequency < 35) return "Activation douce";
  if (frequency < 75) return "Tonification";
  return "Intensité soutenue";
}

function getIntensityLabel(intensity: number) {
  if (intensity < 30) return "Débutant";
  if (intensity < 70) return "Intermédiaire";
  return "Avancé";
}

export function Aq8Simulator() {
  const [intensity, setIntensity] = useState(45);
  const [frequency, setFrequency] = useState(65);
  const [pulseWidth, setPulseWidth] = useState(280);
  const [muscleZone, setMuscleZone] = useState("full-body");

  const bars = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const wave = Math.sin((index + 1) * (frequency / 18));
      const height = Math.max(18, Math.abs(wave) * intensity + 18);

      return Math.min(height, 100);
    });
  }, [frequency, intensity]);

  return (
    <section className="relative overflow-hidden rounded-lg bg-[#353535] px-4 py-10 xs:px-6 xs:py-12 sm:px-10 lg:px-12 text-white">

      <div className="relative z-10 space-y-8 sm:space-y-10">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ff5757]/30 bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase text-[#ff5757]">
            <Sliders className="h-3.5 w-3.5" />
            Simulation visuelle
          </span>

          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Simulateur d’impulsion AQ8 EMS
          </h2>

          <p className="text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            Ajustez les paramètres pour comprendre visuellement comment une
            séance AQ8 peut être personnalisée selon la zone, l’intensité et le
            niveau d’accompagnement.
          </p>
        </div>

        <div className="grid gap-6 xs:gap-8 lg:grid-cols-12 lg:items-center">
          {/* Controls */}
          <div className="space-y-5 xs:space-y-6 lg:col-span-5">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase text-slate-400">
                Zone musculaire
              </label>

              <div className="grid grid-cols-2 gap-2">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setMuscleZone(zone.id)}
                    className={`rounded-md px-2.5 py-2.5 text-[11px] xs:text-xs font-bold transition-all ${
                      muscleZone === zone.id
                        ? "bg-[#ff5757] text-white"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-xs font-bold text-slate-300">
                <span>Fréquence</span>
                <span className="text-[#ff5757]">
                  {frequency} Hz · {getFrequencyLabel(frequency)}
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                value={frequency}
                onChange={(event) => setFrequency(Number(event.target.value))}
                className="w-full accent-[#ff5757]"
                aria-label="Fréquence d’impulsion"
              />

              <p className="text-xs font-medium leading-relaxed text-slate-400">
                La fréquence est adaptée progressivement selon le type de séance,
                la zone travaillée et les sensations du client.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-xs font-bold text-slate-300">
                <span>Intensité</span>
                <span className="text-amber-400">
                  {intensity}% · {getIntensityLabel(intensity)}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                className="w-full accent-amber-400"
                aria-label="Intensité générale"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-xs font-bold text-slate-300">
                <span>Largeur d’impulsion</span>
                <span className="text-slate-200">{pulseWidth} µs</span>
              </div>

              <input
                type="range"
                min="180"
                max="400"
                value={pulseWidth}
                onChange={(event) => setPulseWidth(Number(event.target.value))}
                className="w-full accent-slate-300"
                aria-label="Largeur d’impulsion"
              />
            </div>
          </div>

          {/* Visual */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-950 p-4 xs:p-6">

              <div className="relative z-10 flex min-h-[280px] xs:min-h-[320px] flex-col items-center justify-center gap-6 xs:gap-8">
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase text-emerald-300">
                    <Zap className="h-3 w-3" />
                    {intensity > 0 ? "AQ8 actif" : "En attente"}
                  </span>

                  <h3 className="mt-3 xs:mt-4 font-display text-lg xs:text-xl font-bold text-white">
                    Visualisation de l’impulsion
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-[11px] xs:text-xs font-medium leading-relaxed text-slate-400">
                    Cette animation est une représentation pédagogique. Les
                    réglages réels sont effectués par l’équipe du centre.
                  </p>
                </div>

                <div className="flex h-24 xs:h-28 w-full max-w-md items-end justify-center gap-1 xs:gap-1.5 sm:gap-2">
                  {bars.map((height, index) => (
                    <div
                      key={index}
                      style={{
                        height: intensity === 0 ? "12%" : `${height}%`,
                        animationDelay: `${index * 80}ms`,
                      }}
                      className="w-2 xs:w-2.5 sm:w-3 md:w-4 rounded-t bg-gradient-to-t from-[#ff5757] to-amber-300 transition-all duration-300 motion-safe:animate-pulse"
                    />
                  ))}
                </div>

                <div className="grid w-full max-w-lg grid-cols-3 gap-1.5 xs:gap-2 sm:gap-3 text-center">
                  <div className="rounded-md border border-white/10 bg-white/5 p-2 xs:p-3 text-slate-400">
                    <p className="font-bold text-white text-xs xs:text-sm">{frequency} Hz</p>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs mt-0.5">Fréquence</p>
                  </div>

                  <div className="rounded-md border border-white/10 bg-white/5 p-2 xs:p-3 text-slate-400">
                    <p className="font-bold text-white text-xs xs:text-sm">{intensity}%</p>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs mt-0.5">Intensité</p>
                  </div>

                  <div className="rounded-md border border-white/10 bg-white/5 p-2 xs:p-3 text-slate-400">
                    <p className="font-bold text-white text-xs xs:text-sm">{pulseWidth} µs</p>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs mt-0.5">Impulsion</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] xs:text-xs font-medium leading-relaxed text-slate-400">
              Ce simulateur est purement informatif. Il ne remplace pas les
              réglages réels réalisés par le centre pendant une séance AQ8.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
