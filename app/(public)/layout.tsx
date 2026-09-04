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
  BookOpen,
  Zap,
  Target,
  Sparkles,
  User,
  Trophy,
  LogOut,
  Flame,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
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
  const [scrolled, setScrolled] = useState(false);
  const [clientData, setClientData] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const publicCenters = useMemo(() => getPublicCenters(centers), [centers]);

  // Track Firebase Client Session for Personalized Header Journey
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch("/api/client-portal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.client) {
            setClientData(data.client);
          } else {
            setClientData(null);
          }
        } catch (err) {
          console.warn("Header client portal fetch error:", err);
          setClientData(null);
        }
      } else {
        setClientData(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setTechnologyMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-[#0284c7] selection:text-white">
      {/* --- SITE PUBLIC HEADER --- */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)] py-2"
            : "bg-white/95 backdrop-blur-md border-b border-slate-100 py-3"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-6">
            {/* Logo */}
            <Link
              href="/"
              aria-label="AQ8 Algérie - Accueil"
              className="flex shrink-0 transition-transform duration-300 hover:scale-[1.02]"
            >
              <img
                src="/images/logo.png"
                alt="AQ8 Algérie Logo"
                className="h-10 sm:h-12 w-auto max-w-[210px] object-contain drop-shadow-sm"
              />
            </Link>

            {/* Sleek Central Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              {/* Home Link */}
              <Link
                href="/"
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  isActive("/")
                    ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                    : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Accueil
              </Link>

              {/* Technologies Dropdown */}
              <div
                className="relative group"
                onMouseEnter={() => setTechnologyMenuOpen(true)}
                onMouseLeave={() => setTechnologyMenuOpen(false)}
              >
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    isActive("/aq8") || isActive("/wonder")
                      ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                      : "hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  onClick={() => setTechnologyMenuOpen(open => !open)}
                >
                  <span>Nos Technologies</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${technologyMenuOpen ? "rotate-180 text-[#0284c7]" : "text-slate-400"}`} />
                </button>

                {/* Dropdown Menu Card */}
                <div
                  className={`absolute left-0 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xl backdrop-blur-2xl z-50 transition-all duration-200 origin-top-left ${
                    technologyMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                  }`}
                >
                  <Link
                    href="/aq8"
                    onClick={() => setTechnologyMenuOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-[#f0f9ff] transition-all group/item"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0284c7] text-white shadow-md group-hover/item:scale-110 transition-transform">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block font-display text-sm font-black text-[#242424] group-hover/item:text-[#0284c7]">
                        AQ8 EMS
                      </span>
                      <span className="block text-[11px] font-medium text-slate-500">
                        Électrostimulation active 350 muscles
                      </span>
                    </div>
                  </Link>

                  <div className="my-1 border-t border-slate-100" />

                  <Link
                    href="/wonder"
                    onClick={() => setTechnologyMenuOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-all group/item"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#242424] text-white shadow-md group-hover/item:scale-110 transition-transform">
                      <Target className="h-4 w-4 text-[#38bdf8]" />
                    </div>
                    <div>
                      <span className="block font-display text-sm font-black text-[#242424] group-hover/item:text-[#0284c7]">
                        Wonder Axion
                      </span>
                      <span className="block text-[11px] font-medium text-slate-500">
                        Body shaping électromagnétique ciblé
                      </span>
                    </div>
                  </Link>
                </div>
              </div>

              <Link
                href="/a-propos"
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  isActive("/a-propos")
                    ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                    : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                À propos
              </Link>
              <Link
                href="/centres"
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  isActive("/centres")
                    ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                    : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Nos Centres
              </Link>
              <Link
                href="/conseils"
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  isActive("/conseils")
                    ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                    : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Conseils
              </Link>
              <Link
                href="/contact"
                className={`rounded-xl px-3.5 py-2 transition-all ${
                  isActive("/contact")
                    ? "bg-[#f0f9ff] text-[#0284c7] font-extrabold"
                    : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                Contact
              </Link>
            </nav>

            {/* Right Action Buttons: Ultra-Sleek Single Line Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {clientData ? (
                /* PARCOURS ADHÉRENT CONNECTÉ */
                <>
                  <Link
                    href="/client"
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/60 px-3.5 py-2 text-xs font-black text-amber-950 shadow-xs hover:border-amber-400 transition-all whitespace-nowrap"
                  >
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>
                      {clientData.firstName || "Mon Espace"}
                      <span className="ml-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-slate-950 font-black">
                        {clientData.gamificationStats?.levelTitle || "AQ8 Club"}
                      </span>
                    </span>
                  </Link>

                  <Link
                    href="/reservation"
                    className="group inline-flex items-center gap-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-[#0284c7]/20 transition-all hover:scale-[1.02] whitespace-nowrap"
                  >
                    <Zap className="h-4 w-4 text-yellow-300 shrink-0 transition-transform group-hover:scale-110" />
                    <span>Réserver 1-Clic</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                /* PARCOURS NOUVEAU CLIENT / VISITEUR */
                <>
                  <Link
                    href="/client"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#0284c7]/25 bg-[#f0f9ff] px-3.5 py-2 text-xs font-bold text-[#0284c7] hover:bg-[#0284c7] hover:text-white transition-all whitespace-nowrap"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>Espace Adhérente</span>
                  </Link>

                  <Link
                    href="/reservation"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300 shrink-0 transition-transform group-hover:scale-110" />
                    <span>Réserver ma 1ère séance</span>
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200/70 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all whitespace-nowrap"
                    title="Accès Administrateur / Staff CRM"
                  >
                    <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>CRM</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <Link
                href="/client"
                className="inline-flex items-center gap-1 rounded-xl border border-[#0284c7]/30 bg-[#f0f9ff] px-3 py-2 text-xs font-extrabold text-[#0284c7] shadow-sm"
              >
                <User className="h-3.5 w-3.5" />
                <span>Mon Espace</span>
              </Link>
              <Link
                href="/reservation"
                className="inline-flex items-center gap-1 rounded-xl bg-[#0284c7] px-3.5 py-2 text-xs font-bold text-white shadow-sm"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Réserver</span>
              </Link>
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-black rounded-xl bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Responsive Drawer */}
        {mobileMenuOpen && (
          <div id="public-mobile-menu" className="lg:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 text-xs font-bold shadow-2xl">
            {clientData ? (
              <>
                <Link
                  href="/client"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-black text-amber-950 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Mon Espace ({clientData.firstName})</span>
                  </div>
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-slate-950 font-black">
                    {clientData.gamificationStats?.levelTitle || "Club AQ8"}
                  </span>
                </Link>
                <Link
                  href="/reservation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#06b6d4] px-4 py-3 text-xs font-extrabold text-white shadow-md"
                >
                  <Zap className="h-4 w-4 text-yellow-300" />
                  Réserver en 1-Clic
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/client"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#242424]"
                >
                  <User className="h-4 w-4 text-[#0284c7]" />
                  Mon Espace Adhérente (Connexion)
                </Link>
                <Link
                  href="/reservation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#06b6d4] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0284c7]/20"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Réserver ma 1ère séance
                </Link>
              </>
            )}

            <div className="space-y-1 pt-1">
              {[
                { id: "/", label: "Accueil" },
                { id: "/a-propos", label: "À propos d'AQ8" },
                { id: "/centres", label: "Nos Centres en Algérie" },
                { id: "/conseils", label: "Conseils & actualités" },
                { id: "/contact", label: "Contact & Assistance" },
                { id: "/login", label: "Accès CRM Administrateur" }
              ].map(link => (
                <Link
                  key={link.id}
                  href={link.id}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 transition-colors ${
                    isActive(link.id) ? "bg-[#f0f9ff] text-[#0284c7]" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {link.id === "/login" && <ShieldCheck className="h-4 w-4 text-[#0284c7]" />}
                  {link.id === "/conseils" && <BookOpen className="h-4 w-4 text-[#0284c7]" />}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Nos Technologies
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/aq8"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl p-2.5 block text-center ${
                    isActive("/aq8") ? "bg-white text-[#0284c7] shadow-sm font-black" : "bg-white/60 text-slate-800"
                  }`}
                >
                  <Zap className="h-4 w-4 text-[#0284c7] mx-auto mb-1" />
                  AQ8 EMS
                </Link>
                <Link
                  href="/wonder"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl p-2.5 block text-center ${
                    isActive("/wonder") ? "bg-white text-[#0284c7] shadow-sm font-black" : "bg-white/60 text-slate-800"
                  }`}
                >
                  <Target className="h-4 w-4 text-[#242424] mx-auto mb-1" />
                  Wonder Axion
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="flex-1 overflow-x-clip max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 w-full">
        {children}
      </main>

      {/* --- SITE PUBLIC FOOTER --- */}
      <footer className="border-t border-slate-200 bg-[#1f1f1f] pt-16 pb-10 text-white w-full">
        <div className="max-w-7xl mx-auto grid gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex p-0 transition-opacity hover:opacity-85"
              aria-label="Retour à l'accueil AQ8 Algérie"
            >
              <img
                src="/images/logo.png"
                alt="AQ8 Algérie"
                className="h-12 w-auto max-w-[210px] object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              AQ8 Algérie réunit les technologies leaders EMS et Wonder Axion avec un suivi 100% personnalisé centre par centre.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-white">Navigation & Info</h4>
            <ul className="space-y-2.5 text-slate-400">
              <li><Link href="/client" className="hover:text-white transition text-[#38bdf8] font-bold">Mon Espace Adhérent</Link></li>
              <li><Link href="/aq8" className="hover:text-white transition">AQ8 EMS active</Link></li>
              <li><Link href="/wonder" className="hover:text-white transition">Wonder Axion</Link></li>
              <li><Link href="/conseils" className="hover:text-white transition">Conseils & actualités</Link></li>
              <li><Link href="/a-propos#faq" className="hover:text-white transition">Foire aux questions (FAQ)</Link></li>
              <li><Link href="/a-propos" className="hover:text-white transition">À propos d'AQ8</Link></li>
            </ul>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-display text-sm font-bold text-white">Nos Centres</h4>
            <ul className="space-y-2.5 text-slate-400">
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
            <h4 className="font-display text-sm font-bold text-white">Contact & Assistance</h4>
            <p className="text-slate-400 leading-relaxed flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#38bdf8] shrink-0 mt-0.5" />
              <span>{settings?.addressAlgérie || "12 Rue des Glycines, Hydra, Alger"}</span>
            </p>
            <p className="text-slate-400 flex items-center gap-2 font-bold text-[#38bdf8]">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{settings?.contactPhone || "+213 795 12 84 09"}</span>
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p>© 2026 AQ8 Algérie. Tous droits réservés.</p>
          <nav aria-label="Informations légales" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
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
