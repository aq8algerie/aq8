import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type LegalDocumentSection = {
  id: string;
  label: string;
  title: string;
  icon: LucideIcon;
  content: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalDocumentSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl pb-12 sm:pb-16">
      <header className="border-b border-slate-200 py-8 sm:py-12">
        <p className="text-xs font-bold uppercase text-[#0284c7]">{eyebrow}</p>
        <h1 className="mt-4 font-display text-3xl font-black text-[#242424] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          {description}
        </p>
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Dernière mise à jour : {updatedAt}
        </p>
      </header>

      <div className="grid gap-10 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-12">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label={"Sommaire : " + title}>
            <p className="mb-3 text-xs font-extrabold uppercase text-slate-400">
              Sur cette page
            </p>
            <ul className="border-l border-slate-200">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={"#" + section.id}
                    className="block border-l-2 border-transparent py-2 pl-4 text-sm font-semibold text-slate-600 transition hover:border-[#0284c7] hover:text-[#242424]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 divide-y divide-slate-200">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section
                id={section.id}
                key={section.id}
                className={
                  "scroll-mt-28 " +
                  (index === 0 ? "pb-9" : "py-9") +
                  (index === sections.length - 1 ? " pb-0" : "")
                }
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#242424] text-white">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase text-[#0284c7]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="font-display text-xl font-black text-[#242424] sm:text-2xl">
                      {section.title}
                    </h2>
                  </div>
                </div>
                <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                  {section.content}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LegalAlert({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
      <p className="font-extrabold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export const legalLinkClass =
  "font-bold text-[#242424] underline decoration-slate-300 underline-offset-4 hover:text-[#0284c7]";
