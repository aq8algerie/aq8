"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Lock,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Scale,
  Award,
  ChevronRight,
  ShieldCheck,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../src/lib/firebase";

type ActiveTab = "appointments" | "measurements" | "payments";

export function ClientPortalClient() {
  const [phoneInput, setPhoneInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Client Session State
  const [clientData, setClientData] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [clientPackages, setClientPackages] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("appointments");

  // Load saved phone session from localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem("aq8_client_phone");
    if (savedPhone) {
      setPhoneInput(savedPhone);
      fetchClientPortalData(savedPhone);
    }
  }, []);

  const normalizePhone = (p: string) => p.replace(/[^0-9]/g, "");

  const [requiresPin, setRequiresPin] = useState(false);

  const fetchClientPortalData = async (targetPhone: string, targetPin: string = "") => {
    const cleanPhone = normalizePhone(targetPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setLoginError("Veuillez saisir un numéro de téléphone valide (ex: 0795 12 84 09 ou +213...).");
      return;
    }

    setIsLoggingIn(true);
    setIsLoadingData(true);
    setLoginError("");

    try {
      const response = await fetch('/api/client-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, pin: targetPin }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        if (data.requiresPin) {
          setRequiresPin(true);
        }
        setLoginError(data.error || "Aucun compte ou rendez-vous trouvé avec ce numéro. Si vous êtes nouveau client, vous pouvez réserver votre 1ère séance ci-dessous.");
        setIsLoggingIn(false);
        setIsLoadingData(false);
        return;
      }

      setRequiresPin(false);
      setClientData(data.client);
      setAppointments(data.appointments || []);
      setMeasurements(data.measurements || []);
      setPayments(data.payments || []);
      setClientPackages(data.clientPackages || []);
      localStorage.setItem("aq8_client_phone", targetPhone);
    } catch (err) {
      console.error("Error fetching client portal data:", err);
      setLoginError("Impossible de charger les données du compte. Veuillez réessayer.");
    } finally {
      setIsLoggingIn(false);
      setIsLoadingData(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientPortalData(phoneInput.trim(), pinInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("aq8_client_phone");
    setClientData(null);
    setAppointments([]);
    setMeasurements([]);
    setPayments([]);
    setClientPackages([]);
    setPhoneInput("");
    setPinInput("");
    setRequiresPin(false);
  };

  // IF NOT LOGGED IN: SHOW LOGIN FORM
  if (!clientData) {
    return (
      <div className="mx-auto max-w-md space-y-8 py-6">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0284c7]/20 bg-[#f0f9ff] px-4 py-1.5 text-xs font-extrabold uppercase text-[#0284c7] shadow-sm">
            <User className="h-4 w-4" />
            Espace Adhérente AQ8
          </div>
          <h1 className="font-display text-3xl font-black text-[#242424]">
            Consultez votre compte
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
            Entrez votre numéro de téléphone pour accéder à vos rendez-vous, l'historique de vos mensurations et l'état de vos paiements.
          </p>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 h-[4px] w-full bg-gradient-to-r from-[#0284c7] to-[#242424]" />

          {loginError && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                Numéro de Téléphone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="0795 12 84 09 ou +213 795..."
                  disabled={isLoggingIn}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#0284c7] focus:bg-white focus:ring-2 focus:ring-[#0284c7]/20 disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Formats acceptés : <code>05xx</code>, <code>06xx</code>, <code>07xx</code> ou <code>+213 / +33</code> (espaces et tirets tolérés).
              </p>
            </div>

            {requiresPin && (
              <div className="space-y-2 rounded-xl bg-amber-50 p-4 border border-amber-200">
                <label className="text-xs font-extrabold uppercase tracking-wider text-amber-900 block flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                  Code PIN de Sécurité (4 chiffres) *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="****"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center font-mono text-base font-bold tracking-widest text-slate-900 outline-none transition focus:border-[#0284c7]"
                />
                <p className="text-[10px] text-amber-800 font-semibold">
                  Saisissez le code confidentiel attribué à votre fiche pour sécuriser votre compte.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !phoneInput.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0284c7] py-3.5 px-5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#0369a1] hover:scale-[1.02] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification du compte...
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  Accéder à Mon Espace
                </>
              )}
            </button>
          </form>

          {/* Quick Info Footer */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              Nouveau client ou pas encore de rendez-vous ?
            </p>
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-xs font-bold text-[#242424] transition hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0284c7]"
            >
              <Calendar className="h-3.5 w-3.5 text-[#0284c7]" />
              Réserver ma 1ère séance en direct
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // IF LOGGED IN: SHOW CLIENT DASHBOARD
  const upcomingAppts = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "booked" || a.status === "pending" || !a.status
  );
  const pastAppts = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  const latestMeasurement = measurements[0];
  const activeCenterName = clientData.centerName || localStorage.getItem("aq8_client_center") || "AQ8 Ouled Fayet";

  const handleCenterChange = (newCenterName: string) => {
    setClientData({ ...clientData, centerName: newCenterName });
    localStorage.setItem("aq8_client_center", newCenterName);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Top Banner Profile Summary with Center Selector */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#0284c7]/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0284c7] font-display text-2xl font-black text-white shadow-lg ring-4 ring-[#0284c7]/30">
              {(clientData.firstName || "A")[0].toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Compte Adhérente Vérifié
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black">
                {clientData.firstName} {clientData.lastName}
              </h1>
              <p className="text-xs font-medium text-slate-300 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-[#38bdf8]" />
                  {clientData.phone}
                </span>
              </p>
            </div>
          </div>

          {/* Direct Center Selector in Client Profile Sheet */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 px-1">
              <Activity className="h-4 w-4 text-[#38bdf8]" />
              <span>Mon Centre :</span>
            </div>
            <select
              value={activeCenterName}
              onChange={(e) => handleCenterChange(e.target.value)}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-[#0284c7] cursor-pointer"
            >
              <option value="AQ8 Ouled Fayet">AQ8 Ouled Fayet (Femmes)</option>
              <option value="AQ8 Birkhadem">AQ8 Birkhadem</option>
              <option value="AQ8 Sidi Yahia">AQ8 Sidi Yahia</option>
              <option value="AQ8 Draria">AQ8 Draria</option>
              <option value="AQ8 Tlemcen">AQ8 Tlemcen</option>
              <option value="AQ8 Blida">AQ8 Blida</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/reservation"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0369a1] hover:scale-105"
            >
              <Calendar className="h-4 w-4" />
              Réserver une séance
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/20"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800 pt-6">
          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Séances à venir</span>
            <span className="block text-xl font-black text-[#38bdf8] mt-1">{upcomingAppts.length}</span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Séances effectuées</span>
            <span className="block text-xl font-black text-emerald-400 mt-1">{pastAppts.length}</span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Dernier Poids</span>
            <span className="block text-xl font-black text-white mt-1">
              {latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : "En attente"}
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Statut Compte</span>
            <span className="block text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Actif & Validé
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Segmented Mobile Native Style) */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-2 pb-2 scrollbar-none">
        {[
          { id: "appointments" as ActiveTab, label: "📅 Mes Séances", count: appointments.length },
          { id: "measurements" as ActiveTab, label: "📏 Suivi & Mensurations", count: measurements.length },
          { id: "payments" as ActiveTab, label: "💳 Paiements & Forfaits", count: payments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/30"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#242424]">
              Planning de vos séances & Rendez-vous
            </h3>
            <button
              type="button"
              onClick={() => fetchClientPortalData(clientData.phone)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser les séances
            </button>
          </div>

          {/* Section 1: Upcoming Sessions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="h-3 w-3 rounded-full bg-[#0284c7] animate-pulse" />
              <h4 className="font-display text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                1. Vos Séances à Venir ({upcomingAppts.length})
              </h4>
            </div>

            {upcomingAppts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-3">
                <Calendar className="mx-auto h-8 w-8 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">
                  Vous n'avez aucune séance programmée pour le moment.
                </p>
                <Link
                  href="/reservation"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0369a1]"
                >
                  <Calendar className="h-4 w-4" />
                  Réserver une séance dans mon centre
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {upcomingAppts.map((appt) => {
                  const serviceLabel = appt.service?.toLowerCase() === "wonder" ? "Wonder Axion" : "AQ8 EMS";
                  const dateStr = appt.bookingDate || appt.date || "";
                  const timeStr = appt.bookingTime || appt.time || "";

                  return (
                    <div
                      key={appt.id}
                      className="group relative flex flex-col justify-between rounded-2xl border-2 border-[#0284c7]/30 bg-white p-5 shadow-md transition hover:border-[#0284c7] hover:shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-[#0284c7] px-3 py-1 text-xs font-black text-white uppercase">
                            {serviceLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Créneau Confirmé
                          </span>
                        </div>

                        <div>
                          <h4 className="font-display text-base font-bold text-[#242424]">
                            {dateStr ? new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "Date à venir"}
                          </h4>
                          <p className="text-sm font-extrabold text-[#0284c7] flex items-center gap-1.5 mt-1">
                            <Clock className="h-4 w-4" />
                            {timeStr || "Heure confirmée"}
                          </p>
                        </div>

                        <p className="text-xs font-semibold text-slate-600">
                          Centre : <span className="font-extrabold text-slate-800">{appt.centerName || activeCenterName}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Règle : Annulation gratuite &gt; 24h</span>
                        <span className="text-[#0284c7] font-bold">Séance garantie</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Past Sessions History */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h4 className="font-display text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                2. Historique des Séances Effectuées ({pastAppts.length})
              </h4>
            </div>

            {pastAppts.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium italic">
                Aucune ancienne séance enregistrée.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pastAppts.map((appt) => (
                  <div key={appt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{appt.service?.toLowerCase() === "wonder" ? "Wonder Axion" : "AQ8 EMS"}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Effectuée</span>
                    </div>
                    <p className="text-slate-500 font-medium">
                      {appt.bookingDate || appt.date} à {appt.bookingTime || appt.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEASUREMENTS */}
      {activeTab === "measurements" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#242424]">
              Historique de votre suivi corporel & mensurations
            </h3>
          </div>

          {measurements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-3">
              <Scale className="mx-auto h-10 w-10 text-slate-400" />
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-slate-800">
                  Aucune mensuration loguée pour l'instant
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Votre coach prendra vos mensurations anatomiques lors de votre bilan initial en centre (poids, tour de taille, cuisses, masse musculaire).
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {measurements.map((m, idx) => (
                <div key={m.id || idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-display text-xs font-bold text-slate-800">
                      Relevé du {m.date || m.createdAt ? new Date(m.date || m.createdAt).toLocaleDateString('fr-FR') : `Fiche #${idx + 1}`}
                    </span>
                    <span className="rounded-md bg-[#0284c7] px-2 py-0.5 text-xs font-black text-white">
                      {m.weight ? `${m.weight} kg` : "Poids non saisi"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                    {m.waist && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Tour de taille</span>
                        <span className="block text-slate-800 font-bold mt-0.5">{m.waist} cm</span>
                      </div>
                    )}
                    {m.hips && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Tour d'anches</span>
                        <span className="block text-slate-800 font-bold mt-0.5">{m.hips} cm</span>
                      </div>
                    )}
                    {m.thighs && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Tour de cuisses</span>
                        <span className="block text-slate-800 font-bold mt-0.5">{m.thighs} cm</span>
                      </div>
                    )}
                    {m.chest && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Poitrine</span>
                        <span className="block text-slate-800 font-bold mt-0.5">{m.chest} cm</span>
                      </div>
                    )}
                    {m.bodyFat && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Masse graisseuse</span>
                        <span className="block text-emerald-600 font-bold mt-0.5">{m.bodyFat} %</span>
                      </div>
                    )}
                    {m.muscleMass && (
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] text-slate-400 uppercase">Masse musculaire</span>
                        <span className="block text-[#0284c7] font-bold mt-0.5">{m.muscleMass} %</span>
                      </div>
                    )}
                  </div>

                  {m.notes && (
                    <p className="text-xs text-slate-500 font-medium italic border-t border-slate-100 pt-2">
                      Note coach : "{m.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS & PACKAGES */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#242424]">
              État des paiements & abonnements
            </h3>
          </div>

          {/* Subscribed Packages Card Section */}
          {clientPackages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-slate-700">
                Vos Abonnements & Forfaits Actifs ({clientPackages.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {clientPackages.map((pkg, idx) => (
                  <div key={pkg.id || idx} className="rounded-2xl border-2 border-[#0284c7]/30 bg-[#0284c7]/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{pkg.packageName || "Forfait AQ8"}</span>
                      <span className="rounded-full bg-[#0284c7] px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
                        {pkg.type === 'aq8' ? 'AQ8 EMS' : pkg.type === 'wonder' ? 'Wonder' : 'Formule'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Séances restantes :</span>
                      <span className="font-mono text-sm font-black text-[#0284c7]">{pkg.sessionsRemaining ?? pkg.totalSessions ?? "Disponible"} / {pkg.totalSessions || 10}</span>
                    </div>
                    {pkg.expirationDate && (
                      <p className="text-[10px] font-medium text-slate-500">Valide jusqu'au : {pkg.expirationDate}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipts & Payments History Section */}
          <div className="space-y-3">
            <h4 className="font-display text-xs font-black uppercase tracking-wider text-slate-700">
              Historique des Reçus de Paiement ({payments.length})
            </h4>

            {payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-3">
                <CreditCard className="mx-auto h-10 w-10 text-slate-400" />
                <div className="space-y-1">
                  <h4 className="font-display text-sm font-bold text-slate-800">
                    Aucun historique de règlement séparé
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Vos versements et règlements sont validés directement auprès de l'accueil de votre centre partenaire.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs font-semibold">
                    <div>
                      <span className="block font-bold text-slate-800">{p.packageName || p.description || "Séance / Formule AQ8"}</span>
                      <span className="block text-[11px] text-slate-400">{p.date || p.createdAt || "Date récente"}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-[#0284c7]">{p.amount ? `${p.amount} DZD` : "Payé en centre"}</span>
                      <span className="block text-[10px] text-emerald-600 font-bold uppercase">Règlement validé</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
