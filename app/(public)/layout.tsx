"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Menu,
  X,
  Phone,
  MapPin,
  ShieldCheck,
  ChevronDown,
  BookOpen
} from "lucide-react";
import { useData } from "@/components/context/DataProvider";
import { getPublicCenters } from "@/src/lib/centerVisibility";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { centers, settings } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [technologyMenuOpen, setTechnologyMenuOpen] = useState(false);

  const publicCenters = useMemo(() => getPublicCenters(centers), [centers]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setTechnologyMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* --- SITE PUBLIC HEADER --- */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
            {/* Logo */}
            <Link
              href="/"
              aria-label="AQ8 Algérie - Accueil"
              className="flex shrink-0 transition hover:opacity-85"
            >
              <img
                src="/images/logo.png"
                alt="AQ8 Algérie Logo"
                className="h-10 sm:h-12 w-auto max-w-[210px] object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-600">
              {/* Dropdown Technologies */}
              <div
                className="relative group py-2"
                onMouseEnter={() => setTechnologyMenuOpen(true)}
                onMouseLeave={() => setTechnologyMenuOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setTechnologyMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setTechnologyMenuOpen(false);
                    event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
                  }
                }}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-2 rounded-md hover:bg-slate-50 hover:text-[#242424] cursor-pointer"
                  aria-haspopup="menu"
                  aria-controls="technology-menu"
                  aria-expanded={technologyMenuOpen}
                  onClick={() => setTechnologyMenuOpen(open => !open)}
                >
                  Nos Technologies
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div id="technology-menu" role="menu" className={`absolute left-0 mt-1 w-48 rounded-lg border border-slate-100 bg-white p-2 shadow-lg z-50 ${technologyMenuOpen ? "block" : "hidden"}`}>
                  <Link
                    href="/aq8"
                    role="menuitem"
                    onClick={() => setTechnologyMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 hover:bg-slate-50 hover:text-[#ff5757] ${isActive("/aq8") ? "text-[#ff5757] bg-rose-50/40" : ""}`}
                  >
                    AQ8 EMS
                  </Link>
                  <Link
                    href="/wonder"
                    role="menuitem"
                    onClick={() => setTechnologyMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 hover:bg-slate-50 hover:text-[#ff5757] ${isActive("/wonder") ? "text-[#ff5757] bg-rose-50/40" : ""}`}
                  >
                    Wonder Sculpt
                  </Link>
                </div>
              </div>

              <Link
                href="/a-propos"
                className={`rounded-md px-3 py-2 transition-premium ${isActive("/a-propos") ? "text-[#ff5757]" : "hover:bg-slate-50 hover:text-[#242424]"}`}
              >
                À propos
              </Link>
              <Link
                href="/centres"
                className={`rounded-md px-3 py-2 transition-premium ${isActive("/centres") ? "text-[#ff5757]" : "hover:bg-slate-50 hover:text-[#242424]"}`}
              >
                Nos Centres
              </Link>
              <Link
                href="/conseils"
                className={`rounded-md px-3 py-2 transition-premium ${isActive("/conseils") ? "text-[#ff5757]" : "hover:bg-slate-50 hover:text-[#242424]"}`}
              >
                Conseils
              </Link>
              <Link
                href="/contact"
                className={`rounded-md px-3 py-2 transition-premium ${isActive("/contact") ? "text-[#ff5757]" : "hover:bg-slate-50 hover:text-[#242424]"}`}
              >
                Contact
              </Link>
            </nav>

            {/* Primary actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/reservation"
                className="inline-flex items-center gap-2 rounded-md bg-[#ff5757] px-4 py-2.5 text-xs font-bold text-white transition-premium hover:bg-[#e94949] cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Réserver
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-[#242424] transition-premium hover:border-[#242424] cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-[#ff5757]" /> Accès CRM
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile responsive drawer */}
        {mobileMenuOpen && (
          <div id="public-mobile-menu" className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 text-xs font-bold">
            <Link
              href="/reservation"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-[#ff5757]/20 transition-premium hover:bg-[#e94949]"
            >
              <Calendar className="h-4 w-4" />
              Réserver une séance
            </Link>
            {[
              { id: "/", label: "Accueil" },
              { id: "/a-propos", label: "À propos" },
              { id: "/centres", label: "Nos Centres" },
              { id: "/conseils", label: "Conseils & actualités" },
              { id: "/contact", label: "Contact" },
              { id: "/login", label: "Accéder au CRM AQ8" }
            ].map(link => (
              <Link
                key={link.id}
                href={link.id}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${isActive(link.id) ? "bg-rose-50 text-[#ff5757]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {link.id === "/login" && <ShieldCheck className="h-4 w-4 text-[#ff5757]" />}
                {link.id === "/conseils" && <BookOpen className="h-4 w-4 text-[#ff5757]" />}
                {link.label}
              </Link>
            ))}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-2">
              <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-normal text-slate-400">Technologie</div>
              {[
                { id: "/aq8", label: "AQ8 EMS" },
                { id: "/wonder", label: "Wonder Sculpt" }
              ].map(link => (
                <Link
                  key={link.id}
                  href={link.id}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full rounded-xl px-3 py-2.5 block text-left ${isActive(link.id) ? "bg-white text-[#ff5757] shadow-sm" : "text-slate-600 hover:bg-white"}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="flex-1 overflow-x-clip max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 w-full">
        {children}
      </main>

      {/* --- SITE PUBLIC FOOTER --- */}
      <footer className="border-t border-slate-200 bg-[#242424] pt-14 pb-8 text-white w-full">
        <div className="max-w-7xl mx-auto grid gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex p-0 transition-premium hover:opacity-85 cursor-pointer"
              aria-label="Retour à l'accueil AQ8 Algérie"
            >
              <img
                src="/images/logo.png"
                alt="AQ8 Algérie"
                className="h-12 w-auto max-w-[210px] object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">AQ8 Algérie réunit EMS, Wonder et accompagnement centre par centre pour une expérience claire, encadrée et premium.</p>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-white">Navigation & Info</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/aq8" className="hover:text-white transition">AQ8 EMS</Link></li>
              <li><Link href="/wonder" className="hover:text-white transition">Wonder Sculpt</Link></li>
              <li><Link href="/conseils" className="hover:text-white transition">Conseils & actualités</Link></li>
              <li><Link href="/a-propos#faq" className="hover:text-white transition text-[#ff5757]">Foire aux questions (FAQ)</Link></li>
              <li><Link href="/a-propos" className="hover:text-white transition">À propos d'AQ8</Link></li>
            </ul>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-white">Centres</h4>
            <ul className="space-y-2 text-slate-400">
              {publicCenters.map(c => (
                <li key={c.id}>
                  <Link
                    href={`/centres/${c.slug}`}
                    className="hover:text-white transition"
                  >
                    {c.name} ({c.city})
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-white">Contact</h4>
            <p className="text-slate-400 leading-relaxed flex items-start gap-1.5">
              <MapPin className="h-4 w-4 text-[#ff5757] shrink-0 mt-0.5" />
              {settings?.addressAlgérie || "12 Rue des Glycines, Hydra, Alger"}
            </p>
            <p className="text-slate-400 flex items-center gap-1.5 font-bold text-[#ff5757]">
              <Phone className="h-4 w-4 shrink-0" /> {settings?.contactPhone || "+213 (0) 23 48 50 60"}
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 px-4 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>© 2026 AQ8 Algérie. Tous droits réservés.</p>
          <nav aria-label="Informations légales" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end">
            <Link href="/mentions-legales" className="transition hover:text-white">
              Mentions légales
            </Link>
            <Link href="/politique-de-confidentialite" className="transition hover:text-white">
              Confidentialité
            </Link>
            <Link href="/conditions-generales-de-vente" className="transition hover:text-white">
              CGV
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
