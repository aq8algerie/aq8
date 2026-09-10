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
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  Flame,
  Trophy,
  Zap,
  Shield,
  Crown,
  Target,
  Gift,
  Star,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../../src/lib/firebase";
import { calculateClientGamification } from "../../src/lib/gamification";

type ActiveTab = "appointments" | "measurements" | "payments" | "gamification";

export function ClientPortalClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeAuthTab, setActiveAuthTab] = useState<"login" | "register">("login");
  const [authInitialized, setAuthInitialized] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Client Session State
  const [clientData, setClientData] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [clientPackages, setClientPackages] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("appointments");

  // Load Firebase Auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchClientPortalData(firebaseUser);
      } else {
        setClientData(null);
        setAppointments([]);
        setMeasurements([]);
        setPayments([]);
        setClientPackages([]);
      }
      setAuthInitialized(true);
    });
    return unsubscribe;
  }, []);

  const fetchClientPortalData = async (firebaseUser: any) => {
    setIsLoadingData(true);
    setLoginError("");
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await fetch('/api/client-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        setLoginError(data.error || "Une erreur est survenue lors de l'accès au compte.");
        await signOut(auth);
        setClientData(null);
        return;
      }

      setClientData(data.client);
      setAppointments(data.appointments || []);
      setMeasurements(data.measurements || []);
      setPayments(data.payments || []);
      setClientPackages(data.clientPackages || []);
    } catch (err) {
      console.error("Error fetching client portal data:", err);
      setLoginError("Impossible de charger les données du compte. Veuillez réessayer.");
      await signOut(auth);
      setClientData(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err: any) {
      console.error("Login failed:", err);
      let friendlyError = "Erreur de connexion. Veuillez vérifier vos identifiants.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        friendlyError = "Adresse e-mail ou mot de passe incorrect.";
      } else if (err.code === "auth/too-many-requests") {
        friendlyError = "Trop de tentatives infructueuses. Veuillez patienter un instant.";
      }
      setLoginError(friendlyError);
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setLoginError(getFriendlyAuthError(err, "Impossible de se connecter avec Google."));
      }
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setLoginError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setLoginError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/client-portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setLoginError(data.error || "Une erreur est survenue lors de la création du compte.");
        setIsLoggingIn(false);
        return;
      }
      
      // Auto login after successful registration
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err) {
      console.error("Registration failed:", err);
      setLoginError("Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
      setIsLoggingIn(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) {
      setResetError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Impossible d'envoyer l'e-mail de réinitialisation.");
      }

      setResetSent(true);
    } catch (err) {
      console.error("Reset password failed:", err);
      setResetError(err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setClientData(null);
    setAppointments([]);
    setMeasurements([]);
    setPayments([]);
    setClientPackages([]);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowForgotPassword(false);
  };

  const getFriendlyAuthError = (error: unknown, fallback: string) => {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    const message = error instanceof Error ? error.message : fallback;

    if (code.includes('popup-closed-by-user')) return 'Connexion Google annulée.';
    if (code.includes('popup-blocked')) return 'La fenêtre Google a été bloquée. Autorisez les popups.';
    if (code.includes('operation-not-allowed')) return "La connexion Google n'est pas encore activée.";
    if (code.includes('account-exists-with-different-credential')) {
      return 'Un compte existe déjà avec cet e-mail via une autre méthode.';
    }
    return message;
  };

  // SHOW LOADING SCREEN UNTIL AUTH STATE IS DETERMINED
  if (!authInitialized || (auth.currentUser && isLoadingData)) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0284c7] mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Chargement de votre espace client...</p>
      </div>
    );
  }

  // IF NOT LOGGED IN: SHOW LOGIN / SIGN UP FORM
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
            Connectez-vous ou créez votre compte pour accéder à vos rendez-vous, l'historique de vos mensurations et l'état de vos forfaits.
          </p>
        </div>

        {/* Auth Panel Box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 h-[4px] w-full bg-gradient-to-r from-[#0284c7] to-[#242424]" />

          {/* ─── FORGOT PASSWORD SUB-PANEL ─── */}
          {showForgotPassword ? (
            <div className="space-y-5 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-5 w-5 text-[#0284c7]" />
                <h2 className="text-base font-bold text-slate-800">Mot de passe oublié</h2>
              </div>
              <p className="text-slate-500 leading-relaxed font-medium">
                Saisissez votre e-mail pour recevoir un lien de réinitialisation.
              </p>

              {resetSent ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">E-mail envoyé !</p>
                    <p className="text-slate-500 leading-relaxed">
                      Si l’adresse correspond à un compte actif, vous recevrez un lien de réinitialisation dans quelques instants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(""); setResetError(null); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-600 block">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
                          placeholder="votre.email@gmail.com"
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full py-3 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-xs"
                    >
                      {isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Envoyer le lien de réinitialisation
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetError(null); setResetEmail(""); }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer pt-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* TABS SWITCHER */}
              <div className="flex border-b border-slate-100 mb-6">
                <button
                  type="button"
                  onClick={() => { setActiveAuthTab("login"); setLoginError(""); }}
                  className={`flex-1 pb-3 text-center text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    activeAuthTab === "login"
                      ? "border-[#0284c7] text-[#0284c7]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Se Connecter
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveAuthTab("register"); setLoginError(""); }}
                  className={`flex-1 pb-3 text-center text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                    activeAuthTab === "register"
                      ? "border-[#0284c7] text-[#0284c7]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Créer un Compte
                </button>
              </div>

              {loginError && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* ─── EMAIL/PASSWORD LOGIN FORM ─── */}
              {activeAuthTab === "login" ? (
                <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-600 block">Adresse E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                        placeholder="nom.prenom@gmail.com"
                        disabled={isLoggingIn}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-slate-600">Mot de passe</label>
                      <button
                        type="button"
                        onClick={() => { setShowForgotPassword(true); setLoginError(""); }}
                        className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                        placeholder="************"
                        disabled={isLoggingIn}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold disabled:opacity-60 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        Accéder à Mon Espace
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* ─── EMAIL/PASSWORD REGISTRATION FORM ─── */
                <form onSubmit={handleRegister} className="space-y-4 text-xs">
                  <p className="text-[11px] font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    💡 <strong>Important</strong> : Saisissez l'e-mail que vous avez fourni lors de votre inscription au centre pour lier votre compte.
                  </p>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-600 block">Adresse E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                        placeholder="nom.prenom@gmail.com"
                        disabled={isLoggingIn}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-600 block">Choisissez un mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                        placeholder="Minimum 8 caractères"
                        disabled={isLoggingIn}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold disabled:opacity-60 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-600 block">Confirmer le mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setLoginError(""); }}
                        placeholder="Confirmez votre mot de passe"
                        disabled={isLoggingIn}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs font-bold disabled:opacity-60 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Création du compte...
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        Créer mon Compte
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* OR DIVIDER */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ou</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* GOOGLE SIGN IN BUTTON */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2.5"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#0284c7]" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-[#4285f4]">G</span>
                )}
                {activeAuthTab === "login" ? "Continuer avec Google" : "S'inscrire avec Google"}
              </button>
            </>
          )}

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

  // Calculate Gamification Stats
  const gamificationStats = clientData?.gamificationStats || calculateClientGamification(appointments, measurements);
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

        {/* Quick Stats Grid with Gamification Badge & Streaks */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800 pt-6">
          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Niveau Adhérente</span>
            <span className="block text-base font-black text-amber-400 mt-1 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-400" />
              {gamificationStats.levelTitle}
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Streak Régularité</span>
            <span className="block text-base font-black text-rose-400 mt-1 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500 animate-bounce" />
              {gamificationStats.bestStreakWeeks} Sem. 🔥
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Séances Effectuées</span>
            <span className="block text-xl font-black text-emerald-400 mt-1">{gamificationStats.totalCompletedSessions}</span>
          </div>

          <div className="rounded-2xl bg-white/5 p-3.5 border border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase">Badges Débloqués</span>
            <span className="block text-xl font-black text-[#38bdf8] mt-1 flex items-center gap-1">
              <Award className="h-4 w-4" />
              {gamificationStats.badges.filter((b: any) => b.isUnlocked).length} / {gamificationStats.badges.length}
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
          { id: "gamification" as ActiveTab, label: "🏆 AQ8 Club & Badges", count: gamificationStats.badges.filter(b => b.isUnlocked).length },
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
          {(() => {
            const filteredClientPackages = clientPackages.filter(pkg => pkg.packageId !== 'pkg-legacy-payment' && !pkg.packageName?.toLowerCase().includes('legacy'));
            if (filteredClientPackages.length === 0) return null;
            return (
              <div className="space-y-3">
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-slate-700">
                  Vos Abonnements & Forfaits Actifs ({filteredClientPackages.length})
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredClientPackages.map((pkg, idx) => (
                    <div key={pkg.id || idx} className="rounded-2xl border-2 border-[#0284c7]/30 bg-[#0284c7]/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{pkg.packageName || "Forfait AQ8"}</span>
                      <span className="rounded-full bg-[#0284c7] px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
                        {pkg.type === 'aq8' ? 'AQ8 EMS' : pkg.type === 'wonder' ? 'Wonder' : 'Formule'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Séances restantes :</span>
                      <span className="font-mono text-sm font-black text-[#0284c7]">{pkg.sessionsRemaining ?? pkg.totalSessions ?? "Disponible"} / {pkg.sessionsCount || pkg.totalSessions || 10}</span>
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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

      {/* TAB 4: GAMIFICATION & AQ8 CLUB */}
      {activeTab === "gamification" && (
        <div className="space-y-8">
          {/* Header Card: Level & XP Progress */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#0284c7] p-6 sm:p-8 text-white shadow-xl">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black shadow-lg ring-4 ring-amber-400/20">
                  <Trophy className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-[11px] font-extrabold text-amber-300 border border-amber-400/30">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Membre Club AQ8
                  </span>
                  <h3 className="font-display text-2xl font-black">
                    {gamificationStats.levelTitle}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Total de {gamificationStats.totalCompletedSessions} séance(s) EMS complétée(s)
                  </p>
                </div>
              </div>

              {/* Bonus Sessions Reward Alert */}
              <div className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-md max-w-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-amber-400" />
                    Séance Bonus Régularité
                  </span>
                  <span className="bg-amber-400/20 px-2 py-0.5 rounded text-[10px]">
                    {gamificationStats.earnedBonusSessions} Gagnée(s) 🎉
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                  {gamificationStats.earnedBonusSessions > 0
                    ? `Bravo ! Vous avez obtenu ${gamificationStats.earnedBonusSessions} séance(s) offerte(s) grâce à vos streaks de régularité.`
                    : "Maintenez 2 séances par semaine pendant 1 mois pour débloquer 1 séance bonus gratuite !"}
                </p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-6 pt-6 border-t border-white/15 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Progression du Niveau</span>
                <span>{gamificationStats.progressToNextLevel}% ({gamificationStats.totalCompletedSessions} / {gamificationStats.nextLevelSessionTarget} séances)</span>
              </div>
              <div className="h-3 w-full bg-slate-950/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-[#38bdf8] rounded-full transition-all duration-700"
                  style={{ width: `${gamificationStats.progressToNextLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Regularity Streak Banner */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-display text-sm font-extrabold text-slate-900">
                  Streak de Régularité : {gamificationStats.bestStreakWeeks} Semaines Consécutives
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  Objectif : Effectuer au moins 2 séances EMS par semaine.
                </p>
              </div>
            </div>

            <Link
              href="/reservation"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-rose-700 transition"
            >
              <Calendar className="h-4 w-4" />
              Planifier mes 2 séances
            </Link>
          </div>

          {/* Badges Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-display text-base font-bold text-[#242424] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#0284c7]" />
                Vos Badges & Trophées AQ8 ({gamificationStats.badges.filter((b: any) => b.isUnlocked).length} / {gamificationStats.badges.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {gamificationStats.badges.map((badge: any) => {
                const isUnlocked = badge.isUnlocked;

                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                      isUnlocked
                        ? "bg-white border-amber-300 shadow-md ring-2 ring-amber-400/20"
                        : "bg-slate-50 border-slate-200 opacity-75"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs ${
                            isUnlocked
                              ? "bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-amber-300/50"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {badge.iconName === 'Award' && <Award className="h-6 w-6" />}
                          {badge.iconName === 'Flame' && <Flame className="h-6 w-6" />}
                          {badge.iconName === 'Zap' && <Zap className="h-6 w-6" />}
                          {badge.iconName === 'Shield' && <Shield className="h-6 w-6" />}
                          {badge.iconName === 'Scale' && <Scale className="h-6 w-6" />}
                          {badge.iconName === 'Crown' && <Crown className="h-6 w-6" />}
                        </div>

                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Débloqué
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                            <Lock className="h-3 w-3" />
                            Verrouillé
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-display text-sm font-extrabold text-slate-900">
                          {badge.title}
                        </h5>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    {/* Badge Progress or Unlocked Status Footer */}
                    <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold">
                      {isUnlocked ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          Accompli ! {badge.unlockedAt ? `• ${new Date(badge.unlockedAt).toLocaleDateString('fr-FR')}` : ''}
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-slate-600 text-[10px] font-extrabold">
                            <span>Progression</span>
                            <span>{badge.currentCount} / {badge.requiredCount}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0284c7] rounded-full"
                              style={{ width: `${Math.min(100, (badge.currentCount / badge.requiredCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Challenges Widget */}
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              <h4 className="font-display text-base font-extrabold">
                Défis du Mois AQ8 Algérie
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                <div className="flex justify-between items-center text-amber-400">
                  <span className="font-black uppercase tracking-wider text-[10px]">Défi 1 • Assiduité</span>
                  <span className="bg-amber-400/20 px-2 py-0.5 rounded text-[10px] text-amber-300 font-bold">+100 XP</span>
                </div>
                <h5 className="text-sm font-bold text-white">Effectuer 2 séances EMS cette semaine</h5>
                <p className="text-slate-400 text-[11px]">Conservez votre streak de régularité et accélérez vos résultats physique.</p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                <div className="flex justify-between items-center text-[#38bdf8]">
                  <span className="font-black uppercase tracking-wider text-[10px]">Défi 2 • Suivi Santé</span>
                  <span className="bg-[#38bdf8]/20 px-2 py-0.5 rounded text-[10px] text-[#38bdf8] font-bold">Badge Spécial</span>
                </div>
                <h5 className="text-sm font-bold text-white">Réaliser une pesée / mensurations avec votre coach</h5>
                <p className="text-slate-400 text-[11px]">Demandez votre bilan corporel lors de votre prochaine visite en centre.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
