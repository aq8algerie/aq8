"use client";

import { useState } from "react";
import { Flame, Target, Timer, Waves } from "lucide-react";

const stages = {
  warmup: {
    name: "Préparation",
    label: "Phase 1",
    speed: "Activation douce",
    desc: "Cette phase permet de préparer progressivement la zone ciblée et de démarrer la séance avec une intensité adaptée.",
    icon: Timer,
  },
  sculpt: {
    name: "Tonification",
    label: "Phase 2",
    speed: "Travail ciblé",
    desc: "Cette phase accompagne le travail de tonification et de suivi corporel sur la zone sélectionnée.",
    icon: Waves,
  },
  recovery: {
    name: "Retour au calme",
    label: "Phase 3",
    speed: "Fin de séance",
    desc: "Cette phase permet de terminer la séance progressivement et de revenir sur les sensations avec l’équipe du centre.",
    icon: Flame,
  },
};

const muscleGroups = [
  { id: "glutes", label: "Fessiers" },
  { id: "abs", label: "Abdominaux" },
  { id: "thighs", label: "Cuisses" },
];

type StageKey = keyof typeof stages;

export function WonderCycle() {
  const [muscleGroup, setMuscleGroup] = useState("glutes");
  const [sessionStage, setSessionStage] = useState<StageKey>("warmup");

  const activeStage = stages[sessionStage];
  const ActiveIcon = activeStage.icon;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 xs:p-6 shadow-sm sm:p-8 lg:p-10">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff5757]/10 blur-3xl" />
      <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />

      <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="space-y-6 lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
            <Flame className="h-3.5 w-3.5" />
            Cycle Wonder
          </span>

          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl">
              Comprendre une séance Wonder
            </h2>

            <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Ce module présente de manière pédagogique les grandes étapes d’une
              séance Wonder. Le déroulement réel peut varier selon le centre, la
              zone ciblée et le profil du client.
            </p>
          </div>

          <div className="space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Choisissez une zone cible
            </span>

            <div className="grid grid-cols-3 gap-1.5 xs:gap-2">
              {muscleGroups.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setMuscleGroup(zone.id)}
                  className={`rounded-xl px-2 py-2 text-[11px] xs:text-xs font-bold transition-all ${
                    muscleGroup === zone.id
                      ? "bg-[#353535] text-white shadow-md"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3.5 xs:p-5 sm:p-6">
            <div className="mb-6 grid grid-cols-3 gap-1 xs:gap-2 border-b border-slate-200 pb-4">
              {(Object.keys(stages) as StageKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSessionStage(key)}
                  className={`rounded-xl px-1.5 py-2.5 xs:px-3 xs:py-3 text-[10px] xs:text-xs font-bold transition-all ${
                    sessionStage === key
                      ? "bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20"
                      : "bg-white text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {stages[key].name}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-4 xs:p-6 shadow-sm">
              <div className="flex flex-col gap-4 xs:gap-6 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 xs:h-14 xs:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757]">
                  <ActiveIcon className="h-6 w-6" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#ff5757]">
                        {activeStage.label}
                      </p>

                      <h3 className="font-display text-xl font-bold text-[#353535]">
                        {activeStage.name}
                      </h3>
                    </div>

                    <span className="w-fit rounded-full bg-[#ff5757]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff5757]">
                      {activeStage.speed}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {activeStage.desc}
                  </p>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-[#ff5757]" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Zone sélectionnée
                        </p>
                        <p className="text-sm font-bold text-[#353535]">
                          {muscleGroups.find((zone) => zone.id === muscleGroup)
                            ?.label ?? "Fessiers"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    Cette visualisation est informative. Elle ne remplace pas les
                    réglages et consignes donnés par l’équipe du centre pendant
                    la séance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
