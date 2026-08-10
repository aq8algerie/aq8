/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, KeyRound, ArrowLeft, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Center } from '../types';
import { auth, db } from '../lib/firebase';

type CrmRole = 'super_admin' | 'center_manager';

type UserProfile = {
  role: CrmRole;
  centerId?: string | null;
  name?: string;
  displayName?: string;
  active?: boolean;
};

export function CrmPortal({
  centers,
  onLoginSuccess
}: {
  centers: Center[];
  onLoginSuccess: (role: CrmRole, centerId: string | null, managerName: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isAuthBusy = isSubmitting || isGoogleSubmitting;

  const loadUserProfile = async (user: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('La vérification de votre accès CRM a expiré. Réessayez dans quelques instants.')), 8000);
    });
    const snapshot = await Promise.race([getDoc(userRef), timeoutPromise]);
    const userEmailDisplay = user.email ? ` (${user.email})` : '';

    if (!snapshot.exists()) {
      throw new Error(`Votre compte${userEmailDisplay} est authentifié, mais aucun accès CRM ne lui a été attribué. Contactez le super administrateur.`);
    }

    const profile = snapshot.data() as UserProfile;
    if (profile.active !== true) {
      throw new Error('Votre accès CRM est désactivé. Contactez le super administrateur.');
    }
    if (profile.role !== 'super_admin' && profile.role !== 'center_manager') {
      throw new Error('Le rôle associé à votre compte CRM est invalide.');
    }
    if (profile.role === 'center_manager' && !profile.centerId) {
      throw new Error('Aucun centre n’est rattaché à votre compte manager.');
    }

    return profile;
  };

  const completeAuthenticatedLogin = async (user: User) => {
    const profile = await loadUserProfile(user);
    const centerId = profile.role === 'center_manager' ? profile.centerId || null : null;

    if (profile.role === 'center_manager') {
      const associatedCenter = centers.find(c => c.id === centerId);
      if (!associatedCenter) {
        throw new Error('Votre centre de rattachement est inexistant ou désactivé.');
      }
      if (associatedCenter.status === 'showcase' || associatedCenter.status === 'suspended') {
        throw new Error("L'accès CRM de votre centre est temporairement suspendu. Veuillez contacter la direction.");
      }
    }

    onLoginSuccess(
      profile.role,
      centerId,
      profile.displayName || profile.name || user.displayName || user.email || 'Utilisateur CRM'
    );
  };

  const getFriendlyAuthError = (error: unknown, fallback: string) => {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    const message = error instanceof Error ? error.message : fallback;

    if (code.includes('popup-closed-by-user')) return 'Connexion Google annulée.';
    if (code.includes('popup-blocked')) return 'La fenêtre Google a été bloquée par le navigateur. Autorisez les fenêtres contextuelles pour ce site.';
    if (code.includes('operation-not-allowed')) return "La connexion Google n'est pas encore activée dans Firebase Authentication.";
    if (code.includes('unauthorized-domain')) return "Ce domaine n'est pas autorisé dans Firebase Authentication.";
    if (code.includes('account-exists-with-different-credential')) {
      return 'Un compte CRM existe déjà avec cet e-mail. Connectez-vous avec le mot de passe, puis liez le compte Google côté Firebase.';
    }

    return message;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Veuillez entrer une adresse e-mail.');
      return;
    }
    if (!password) {
      setErrorMessage('Veuillez entrer votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      await completeAuthenticatedLogin(credential.user);
    } catch (error) {
      await signOut(auth).catch(() => undefined);
      setErrorMessage(getFriendlyAuthError(error, 'Connexion impossible. Vérifiez vos identifiants.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      await completeAuthenticatedLogin(credential.user);
    } catch (error) {
      await signOut(auth).catch(() => undefined);
      setErrorMessage(getFriendlyAuthError(error, 'Connexion Google impossible.'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) {
      setResetError('Veuillez entrer votre adresse e-mail.');
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
        throw new Error(data.error || 'Impossible d\'envoyer l\'e-mail de réinitialisation.');
      }

      if (data.useFirebaseFallback) {
        auth.languageCode = 'fr';
        await sendPasswordResetEmail(auth, trimmed);
      }

      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible d\'envoyer l\'e-mail. Vérifiez l\'adresse saisie.';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">

        {/* ─── COLUMN 1 (LEFT): BRANDING, LOGO, SLOGAN & BACKGROUND ─── */}
        <div className="relative lg:col-span-6 bg-[#161616] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-hidden">
          {/* Background Image with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/aq8algerie.webp"
              alt="AQ8 Studio Algérie"
              className="w-full h-full object-cover opacity-50 contrast-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#161616]/95 via-[#161616]/65 to-[#161616]/35" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#0284c7]/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Top Logo Header */}
          <div className="relative z-10 space-y-2">
            <div className="flex flex-col items-start gap-2">
              <img
                src="/images/logo.png"
                alt="AQ8 Algérie Logo"
                className="h-12 sm:h-14 w-auto object-contain brightness-0 invert drop-shadow-md"
              />
              <p className="text-[11px] uppercase font-extrabold text-[#0284c7] tracking-widest">
                Technologie Minceur & EMS
              </p>
            </div>
          </div>

          {/* Middle Title & Slogan */}
          <div className="relative z-10 space-y-4 my-6 sm:my-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0284c7]/20 border border-[#0284c7]/30 text-[#38bdf8] text-xs font-extrabold">
              <Sparkles className="h-3.5 w-3.5" /> Portail CRM de Gestion
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-black text-white leading-snug break-normal hyphens-none">
              L'Excellence Technologique au Service de votre Studio
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Pilotez l’activité de vos centres, suivez l'évolution des mensurations de vos adhérents et gérez vos forfaits en toute sécurité.
            </p>

            {/* Feature Bullets */}
            <div className="space-y-2.5 pt-2 text-xs font-semibold text-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[#0284c7]/20 flex items-center justify-center text-[#0284c7] shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span>Plannings de séances & Pré-réservations web</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[#0284c7]/20 flex items-center justify-center text-[#0284c7] shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span>Onglet dédié Mensurations & Graphiques de suivi</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-[#0284c7]/20 flex items-center justify-center text-[#0284c7] shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span>Encaissements DZD & Émission des reçus officiels</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 border-t border-white/10 pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-[#0284c7]" /> Espace Sécurisé Direction & Managers
            </span>
            <span>AQ8 Algérie © 2026</span>
          </div>
        </div>

        {/* ─── COLUMN 2 (RIGHT): FORM CONTAINER ─── */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center bg-white space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-[#353535] text-white rounded-2xl flex items-center justify-center shadow-md border border-[#0284c7]/30">
              {showForgotPassword
                ? <KeyRound className="h-5 w-5 text-[#0284c7]" />
                : <ShieldCheck className="h-5 w-5 text-[#0284c7]" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#353535] font-display">
              {showForgotPassword ? 'Réinitialiser le mot de passe' : 'Connexion CRM AQ8'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {showForgotPassword
                ? 'Entrez votre adresse e-mail professionnelle. Un lien de réinitialisation vous sera envoyé.'
                : 'Connectez-vous pour accéder au tableau de bord de votre studio.'}
            </p>
          </div>

          {/* ─── FORGOT PASSWORD PANEL ─── */}
          {showForgotPassword ? (
            <div className="space-y-5">
              {resetSent ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">E-mail envoyé !</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Si l’adresse <strong>{resetEmail.trim()}</strong> correspond à un compte CRM,
                      vous recevrez un lien de réinitialisation dans quelques instants.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); setResetError(null); }}
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

                  <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-600 block">E-mail professionnel</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
                          placeholder="karim@aq8algerie.com"
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full py-3 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Envoyer le lien de réinitialisation
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setResetError(null); setResetEmail(''); }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer pt-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* MAIN LOGIN FORM */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600 block">E-mail professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="karim@aq8algerie.com"
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-600">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setErrorMessage(null); }}
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="************"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 focus:outline-none focus:border-[#0284c7] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 cursor-pointer"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthBusy}
                  className="w-full py-3 bg-[#353535] hover:bg-slate-800 font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Se connecter au CRM
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ou</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAuthBusy}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGoogleSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#0284c7]" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-[#4285f4]">G</span>
                )}
                Continuer avec Google
              </button>
            </div>
          )}
        </div>
      </div>
  );
}
