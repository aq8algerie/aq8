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

  const fetchClientPortalData = async (targetPhone: string) => {
    const cleanPhone = normalizePhone(targetPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setLoginError("Veuillez saisir un numéro de téléphone valide (ex: 0795 12 84 09).");
      return;
    }

    setIsLoggingIn(true);
    setIsLoadingData(true);
    setLoginError("");

    try {
      const response = await fetch('/api/client-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        setLoginError(data.error || "Aucun compte ou rendez-vous trouvé avec ce numéro. Si vous êtes nouveau client, vous pouvez réserver votre 1ère séance ci-dessous.");
        setIsLoggingIn(false);
        setIsLoadingData(false);
        return;
      }

      setClientData(data.client);
      setAppointments(data.appointments || []);
      setMeasurements(data.measurements || []);
      setPayments(data.payments || []);
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
    fetchClientPortalData(phoneInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("aq8_client_phone");
    setClientData(null);
    setAppointments([]);
    setMeasurements([]);
    setPayments([]);
    setPhoneInput("");
    setPinInput("");
  };

  // IF NOT LOGGED IN: SHOW LOGIN FORM
  if (!clientData) {
    return (
      <div className="mx-auto max-w-md space-y-8 py-6">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0284c7]/20 bg-[#f0f9ff] px-4 py-1.5 text-xs font-extrabold uppercase text-[#0284c7] shadow-sm">
            <User className="h-4 w-4" />
            Espace Adhérent AQ8
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
                  placeholder="0795 12 84 09"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#0284c7] focus:bg-white focus:ring-2 focus:ring-[#0284c7]/20 disabled:opacity-60"
                />
              </div>
            </div>

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
    (a) => a.status === "confirmed" || a.status === "pending" || !a.status
  );
  const pastAppts = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  const latestMeasurement = measurements[0];

  return (
    <div className="space-y-8 py-4">
      {/* Top Banner Profile Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#0284c7]/15 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0284c7] font-display text-2xl font-black text-white shadow-lg">
              {(clientData.firstName || "A")[0].toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Espace Adhérent Certifié
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
                {clientData.centerName && (
                  <span className="flex items-center gap-1 text-slate-400">
                    • {clientData.centerName}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/reservation"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0369a1] hover:scale-105"
            >
              <Calendar className="h-4 w-4" />
              Réserver un créneau
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
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Rendez-vous à venir</span>
            <span className="block text-xl font-black text-white mt-1">{upcomingAppts.length}</span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Séances effectuées</span>
            <span className="block text-xl font-black text-emerald-400 mt-1">{pastAppts.length}</span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Dernier Poids</span>
            <span className="block text-xl font-black text-[#38bdf8] mt-1">
              {latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : "Non saisi"}
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Statut Compte</span>
            <span className="block text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              Compte Actif
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-4">
        {[
          { id: "appointments" as ActiveTab, label: "📅 Mes Rendez-vous", count: appointments.length },
          { id: "measurements" as ActiveTab, label: "📏 Suivi & Mensurations", count: measurements.length },
          { id: "payments" as ActiveTab, label: "💳 Paiements & Forfaits", count: payments.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-[#0284c7] text-[#0284c7]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[#242424]">
              Planning de vos séances
            </h3>
            <button
              type="button"
              onClick={() => fetchClientPortalData(clientData.phone)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0284c7] transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-4">
              <Calendar className="mx-auto h-10 w-10 text-slate-400" />
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-slate-800">
                  Aucun rendez-vous enregistré
                </h4>
                <p className="text-xs text-slate-500">
                  Vous n'avez pas encore de rendez-vous programmé avec ce numéro.
                </p>
              </div>
              <Link
                href="/reservation"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0369a1]"
              >
                <Calendar className="h-4 w-4" />
                Réserver ma 1ère séance
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {appointments.map((appt) => {
                const serviceLabel = appt.service?.toLowerCase() === "wonder" ? "Wonder Axion" : "AQ8 EMS";
                const isConfirmed = appt.status === "confirmed" || appt.status === "completed" || !appt.status;
                const dateStr = appt.bookingDate || appt.date || "";
                const timeStr = appt.bookingTime || appt.time || "";

                return (
                  <div
                    key={appt.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0284c7]/40 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-[#f0f9ff] px-2.5 py-1 text-xs font-black text-[#0284c7] uppercase">
                          {serviceLabel}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          <CheckCircle2 className="h-3 w-3" />
                          {appt.status === "completed" ? "Effectué" : "Créneau Confirmé"}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-display text-base font-bold text-[#242424]">
                          {dateStr ? new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "Date non précisée"}
                        </h4>
                        <p className="text-xs font-bold text-[#0284c7] flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          {timeStr || "Heure à confirmer"}
                        </p>
                      </div>

                      {appt.centerName && (
                        <p className="text-xs font-medium text-slate-500">
                          Centre : <span className="font-bold text-slate-700">{appt.centerName}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Réf: #{String(appt.id).slice(-6)}</span>
                      <span className="text-[#0284c7]">Rendez-vous garanti</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

          {payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-3">
              <CreditCard className="mx-auto h-10 w-10 text-slate-400" />
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-slate-800">
                  Aucun historique de règlement en ligne
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Vos paiements sont enregistrés directement auprès de l'accueil de votre centre partenaire lors de vos séances.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p, idx) => (
                <div key={p.id || idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs font-semibold">
                  <div>
                    <span className="block font-bold text-slate-800">{p.packageName || p.description || "Séance / Formule AQ8"}</span>
                    <span className="block text-[11px] text-slate-400">{p.date || "Date récente"}</span>
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
      )}
    </div>
  );
}
