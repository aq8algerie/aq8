import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Dumbbell,
  Sparkles,
  Zap,
  ShieldCheck,
  Target,
} from "lucide-react";

export function HomeTechnologies() {
  return (
    <section className="space-y-10">
      {/* Header */}
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5757]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#ff5757]">
          <Sparkles className="h-3.5 w-3.5" />
          AQ8 & Wonder
        </span>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#353535] sm:text-3xl lg:text-4xl">
            Deux technologies complémentaires pour votre remise en forme
          </h2>

          <p className="mx-auto max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            AQ8 Algérie propose des séances encadrées d’électrostimulation et
            de sculpting corporel, avec un accompagnement adapté à vos objectifs
            de tonification, de suivi corporel et de bien-être.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* AQ8 EMS */}
        <article className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="relative h-64 overflow-hidden">
            <img
              src="/images/aq8algerie.webp"
              alt="Séance AQ8 EMS électrostimulation en Algérie"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#353535]/70 via-[#353535]/10 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff5757] text-white shadow-lg">
                <Zap className="h-6 w-6" />
              </div>

              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                EMS actif
              </span>
            </div>
          </div>

          <div className="relative flex h-full flex-col justify-between gap-8 p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#ff5757]/10 blur-3xl transition-all group-hover:bg-[#ff5757]/15" />

            <div className="relative space-y-5">
              <div className="space-y-3">
                <h3 className="font-display text-xl font-bold text-[#353535] sm:text-2xl">
                  AQ8 EMS
                </h3>

                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  AQ8 EMS repose sur l’électrostimulation active : vous réalisez
                  des mouvements encadrés pendant que la stimulation musculaire
                  accompagne l’effort, sous la supervision d’un professionnel.
                </p>
              </div>

              <ul className="space-y-3 text-sm font-medium text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <span>Travail musculaire global et encadré.</span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span>Intensité adaptée selon le profil et les objectifs.</span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <Dumbbell className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    Accompagnement orienté tonification et remise en forme.
                  </span>
                </li>
              </ul>
            </div>

            <Link
              href="/aq8"
              aria-label="Découvrir la technologie AQ8 EMS"
              className="relative inline-flex w-fit items-center gap-2 rounded-xl border border-[#ff5757]/20 bg-[#ff5757]/5 px-4 py-2.5 text-sm font-bold text-[#ff5757] transition-all hover:border-[#ff5757]/40 hover:bg-[#ff5757]/10"
            >
              Découvrir AQ8 EMS
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </article>

        {/* Wonder */}
        <article className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="relative h-64 overflow-hidden">
            <img
              src="/images/wonder-sculpt.webp"
              alt="Séance Wonder Sculpt AQ8 Algérie"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#353535]/70 via-[#353535]/10 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#353535] shadow-lg">
                <Target className="h-6 w-6" />
              </div>

              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                Sculpting ciblé
              </span>
            </div>
          </div>

          <div className="relative flex h-full flex-col justify-between gap-8 p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#353535]/10 blur-3xl transition-all group-hover:bg-[#353535]/15" />

            <div className="relative space-y-5">
              <div className="space-y-3">
                <h3 className="font-display text-xl font-bold text-[#353535] sm:text-2xl">
                  Wonder Sculpt
                </h3>

                <p className="text-sm font-medium leading-relaxed text-slate-600">
                  Wonder est une approche de sculpting corporel ciblé, pensée
                  pour accompagner le raffermissement, la tonification et le
                  suivi de certaines zones selon les besoins du client.
                </p>
              </div>

              <ul className="space-y-3 text-sm font-medium text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <Target className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    Travail ciblé sur des zones comme les abdominaux, cuisses ou
                    fessiers.
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    Accompagnement adapté aux objectifs de silhouette et de
                    tonification.
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5757]/10 text-[#ff5757]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    Suivi encadré avec consignes adaptées au profil du client.
                  </span>
                </li>
              </ul>
            </div>

            <Link
              href="/wonder"
              aria-label="Découvrir la technologie Wonder Sculpt"
              className="relative inline-flex w-fit items-center gap-2 rounded-xl border border-[#ff5757]/20 bg-[#ff5757]/5 px-4 py-2.5 text-sm font-bold text-[#ff5757] transition-all hover:border-[#ff5757]/40 hover:bg-[#ff5757]/10"
            >
              Découvrir Wonder
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </article>
      </div>

      {/* Responsible note */}
      <p className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-center text-xs font-medium leading-relaxed text-slate-500">
        Les résultats peuvent varier selon le profil, la régularité des séances,
        l’hygiène de vie et l’accompagnement suivi. Un échange préalable avec
        l’équipe du centre permet d’orienter le client vers la prestation adaptée.
      </p>
    </section>
  );
}