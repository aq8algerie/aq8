/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Building, Lock, Mail, Activity, Loader2, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Center, CenterManager } from '../types';
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
  managers,
  onLoginSuccess
}: {
  centers: Center[];
  managers: CenterManager[];
  onLoginSuccess: (role: CrmRole, centerId: string | null, managerName: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isDemoLoginEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const loadUserProfile = async (uid: string): Promise<UserProfile> => {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) {
      throw new Error("Votre compte existe, mais aucun profil CRM ne lui est associé.");
    }

    const profile = snapshot.data() as UserProfile;
    if (profile.active === false) {
      throw new Error('Votre accès CRM est désactivé. Contactez un administrateur.');
    }
    if (profile.role !== 'super_admin' && profile.role !== 'center_manager') {
      throw new Error('Votre rôle CRM est invalide ou manquant.');
    }
    if (profile.role === 'center_manager' && !profile.centerId) {
      throw new Error('Votre profil gérant n’est rattaché à aucun centre.');
    }

    return profile;
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
      const profile = await loadUserProfile(credential.user.uid);
      const centerId = profile.role === 'center_manager' ? profile.centerId || null : null;

      if (profile.role === 'center_manager') {
        const centerExists = centers.some(c => c.id === centerId);
        if (!centerExists) {
          throw new Error('Votre centre de rattachement est inexistant ou désactivé.');
        }
      }

      onLoginSuccess(
        profile.role,
        centerId,
        profile.displayName || profile.name || credential.user.displayName || credential.user.email || 'Utilisateur CRM'
      );
    } catch (error) {
      await signOut(auth).catch(() => undefined);
      const message = error instanceof Error ? error.message : 'Connexion impossible. Vérifiez vos identifiants.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (role: CrmRole, mgr?: CenterManager) => {
    setErrorMessage(null);
    if (role === 'super_admin') {
      onLoginSuccess('super_admin', null, 'Karim Benchikh');
    } else if (mgr) {
      if (centers.length === 0) {
        setErrorMessage('Aucun centre disponible. Connexion démo impossible.');
        return;
      }
      onLoginSuccess('center_manager', mgr.centerId, mgr.name);
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
      await sendPasswordResetEmail(auth, trimmed);
      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible d\'envoyer l\'e-mail. Vérifiez l\'adresse saisie.';
      // Translate common Firebase error codes
      if (msg.includes('user-not-found') || msg.includes('invalid-email')) {
        setResetError('Adresse e-mail introuvable ou invalide.');
      } else {
        setResetError(msg);
      }
    } finally {
      setIsResetting(false);
    }
  };

  const isCentersEmpty = centers.length === 0;

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 bg-[#353535] text-white rounded-full flex items-center justify-center shadow-md border border-[#ff5757]/30">
          {showForgotPassword
            ? <KeyRound className="h-6 w-6 text-[#ff5757]" />
            : <ShieldCheck className="h-6 w-6 text-[#ff5757]" />}
        </div>
        <h1 className="text-2xl font-bold text-[#353535] font-display">
          {showForgotPassword ? 'Réinitialiser le mot de passe' : 'Portail CRM AQ8 Algérie'}
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {showForgotPassword
            ? 'Entrez votre adresse e-mail professionnelle. Un lien de réinitialisation vous sera envoyé.'
            : 'Espace interne réservé à la direction AQ8 Algérie et aux managers de centres.'}
        </p>
      </div>

      {/* ─── FORGOT PASSWORD PANEL ─── */}
      {showForgotPassword ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
          {resetSent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 text-sm">E-mail envoyé !</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Si l’adresse <strong>{resetEmail.trim()}</strong> correspond à un compte CRM,
                  vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); setResetError(null); }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#ff5757] hover:text-[#e04646] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-[#353535] font-display text-sm border-b border-slate-100 pb-2">
                Réinitialisation du mot de passe
              </h3>

              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {resetError}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">E-mail professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => { setResetEmail(e.target.value); setResetError(null); }}
                      placeholder="karim@aq8algerie.com"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5757] text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-3 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
          {/* MAIN LOGIN PANEL */}
          <h3 className="font-bold text-[#353535] font-display text-sm border-b border-slate-100 pb-2">Connexion CRM</h3>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">E-mail professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="karim@aq8algerie.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5757] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-600">Mot de passe</label>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setErrorMessage(null); }}
                  className="text-[10px] font-bold text-[#ff5757] hover:text-[#e04646] transition-colors cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5757] text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#353535] hover:bg-slate-800 font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter au CRM
            </button>
          </form>
        </div>
      )}

      {isDemoLoginEnabled && (
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#ff5757]" />
            <h4 className="font-bold text-[#353535] text-xs font-display">Mode démonstration local</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Raccourcis réservés au développement. En production, l’accès passe par Firebase Auth et le profil CRM.
          </p>

          <div className="space-y-3 pt-1">
            <button
              onClick={() => handleQuickDemoLogin('super_admin')}
              className="w-full p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-premium flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#ff5757]/10 text-[#ff5757] rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 text-xs block group-hover:text-[#ff5757] transition-colors">Accès Super Admin</span>
                  <span className="text-[10px] text-slate-500 font-mono">session locale</span>
                </div>
              </div>
              <span className="text-[10px] text-[#ff5757] font-semibold bg-[#ff5757]/10 py-1 px-2.5 rounded-md">
                Tester →
              </span>
            </button>

            <div className="space-y-2 border-t border-slate-200/60 pt-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Accès gérant de centre</span>

              {isCentersEmpty ? (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-xl font-medium">
                  Aucun centre disponible pour le moment.
                </div>
              ) : managers.length === 0 ? (
                <div className="p-3 bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-xl italic">
                  Aucun manager de centre chargé pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {managers.map((mgr) => {
                    const center = centers.find(c => c.id === mgr.centerId);
                    return (
                      <button
                        key={mgr.id}
                        onClick={() => handleQuickDemoLogin('center_manager', mgr)}
                        className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-premium flex items-center justify-between group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
                            <Building className="h-3.5 w-3.5" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 text-[11px] block group-hover:text-slate-900">{mgr.name}</span>
                            <span className="text-[9px] text-[#ff5757] font-bold">{center?.name || 'Centre'} ({center?.city || 'Algérie'})</span>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-500 hover:text-slate-800">
                          Entrer →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}