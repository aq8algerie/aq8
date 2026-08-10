import { Award, CheckCircle2, ShieldCheck, Users, Zap } from "lucide-react";

const trustItems = [
  {
    icon: Zap,
    value: "350+",
    label: "muscles sollicités",
    sublabel: "en 20 minutes seulement",
  },
  {
    icon: Users,
    value: "+15 000",
    label: "séances réalisées",
    sublabel: "à travers nos centres",
  },
  {
    icon: Award,
    value: "100%",
    label: "coachs certifiés",
    sublabel: "encadrement individuel",
  },
  {
    icon: ShieldCheck,
    value: "Top Sensation",
    label: "Wonder & EMS",
    sublabel: "sculpting & cardio actif",
  },
];

export function HomeTrustBar() {
  return (
    <section className="relative -mt-6 sm:-mt-8 lg:-mt-10 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-md sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex flex-col items-center text-center sm:items-start sm:text-left ${
                  index !== 0 ? "border-t border-slate-100 pt-5 sm:border-t-0 sm:pt-0 md:border-l md:border-slate-100 md:pl-6 lg:pl-8" : ""
                }`}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f9ff] text-[#0284c7] shadow-sm transition-transform duration-300 hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-black tracking-tight text-[#242424] sm:text-3xl">
                    {item.value}
                  </span>
                </div>
                <span className="mt-1 text-xs font-bold text-slate-800">
                  {item.label}
                </span>
                <span className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {item.sublabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
