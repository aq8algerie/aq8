/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Building, Lock, Mail, Activity } from 'lucide-react';
import { Center, CenterManager } from '../types';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { requireAuth } from '../lib/firebase';
import {
  CrmSession,
  getCrmAuthErrorMessage,
  provisionCrmUserAccount,
  resolveCrmSession,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_NAME
} from '../lib/crmAuth';

export function CrmPortal({
  centers,
  managers,
  onLoginSuccess,
  authErrorMessage,
  onAuthErrorClear
}: {
  centers: Center[];
  managers: CenterManager[];
  onLoginSuccess: (session: CrmSession) => void;
  authErrorMessage?: string | null;
  onAuthErrorClear?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowDemoTools = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';
  const visibleErrorMessage = errorMessage || authErrorMessage;

  const clearErrors = () => {
    setErrorMessage(null);
    onAuthErrorClear?.();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail) {
      setErrorMessage('Veuillez entrer une adresse e-mail.');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Veuillez entrer votre mot de passe.');
      return;
    }

    let firebaseAuth: ReturnType<typeof requireAuth> | null = null;
    setIsSubmitting(true);

    try {
      firebaseAuth = requireAuth();
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, trimmedEmail, trimmedPassword);
      const session = await resolveCrmSession(userCredential.user);
      onLoginSuccess(session);
    } catch (err) {
      console.error(err);
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
      const canProvisionAccount = firebaseAuth && [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/invalid-login-credentials'
      ].includes(code);

      if (firebaseAuth && canProvisionAccount) {
        try {
          const session = await provisionCrmUserAccount(firebaseAuth, trimmedEmail, trimmedPassword);
          onLoginSuccess(session);
          return;
        } catch (provisionError) {
          console.error(provisionError);
          if (firebaseAuth.currentUser) {
            await signOut(firebaseAuth).catch(() => {});
          }
          setErrorMessage(getCrmAuthErrorMessage(provisionError));
          return;
        }
      }

      if (firebaseAuth?.currentUser) {
        await signOut(firebaseAuth).catch(() => {});
      }
      setErrorMessage(getCrmAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (role: 'super_admin' | 'center_manager', mgr?: CenterManager) => {
    clearErrors();

    if (role === 'super_admin') {
      onLoginSuccess({
        uid: 'dÃ©mo-super-admin',
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        centerId: null,
        managerName: SUPER_ADMIN_NAME
      });
      return;
    }

    if (!mgr) return;

    if (centers.length === 0) {
      setErrorMessage('Aucun centre disponible. Connexion dÃ©mo impossible.');
      return;
    }

    onLoginSuccess({
      uid: `dÃ©mo-${mgr.email}`,
      email: mgr.email.toLowerCase().trim(),
      role: 'center_manager',
      centerId: mgr.centerId,
      managerName: mgr.name
    });
  };

  const isCentersEmpty = centers.length === 0;

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 bg-[#353535] text-white rounded-full flex items-center justify-center shadow-md border border-[#ff5757]/30">
          <ShieldCheck className="h-6 w-6 text-[#ff5757]" />
        </div>
        <h1 className="text-2xl font-bold text-[#353535] font-display">Portail CRM AQ8 AlgÃ©rie</h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Espace interne rÃ©servÃ© Ã  la direction AQ8 AlgÃ©rie et aux managers de centres.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6">
        <h3 className="font-bold text-[#353535] font-display text-sm border-b border-slate-100 pb-2">Connexion CRM</h3>

        {visibleErrorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-pulse">
            {visibleErrorMessage}
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
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearErrors();
                }}
                placeholder={SUPER_ADMIN_EMAIL}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5757] text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-600">Mot de passe</label>
              {allowDemoTools && (<span className="text-[10px] text-slate-400">Mode dÃ©mo local</span>)}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearErrors();
                }}
                placeholder="************"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:border-[#ff5757] text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#353535] hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Connexion en cours...' : 'Se Connecter au CRM'}
          </button>
        </form>
      </div>

      <div className={`${allowDemoTools ? 'block' : 'hidden'} bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4`}>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#ff5757]" />
          <h4 className="font-bold text-[#353535] text-xs font-display">Mode dÃ©monstration</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          AccÃ¨s local rÃ©servÃ© Ã ux essais hors production. Les accÃ¨s rÃ©els passent par Firebase Auth.
        </p>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('super_admin')}
            className="w-full p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-premium flex items-center justify-between group cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#ff5757]/10 text-[#ff5757] rounded-lg">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-700 text-xs block group-hover:text-[#ff5757] transition-colors">AccÃ¨s Super Admin</span>
                <span className="text-[10px] text-slate-500 font-mono">{SUPER_ADMIN_EMAIL}</span>
              </div>
            </div>
            <span className="text-[10px] text-[#ff5757] font-semibold bg-[#ff5757]/10 py-1 px-2.5 rounded-md">
              Tester -&gt;
            </span>
          </button>

          <div className="space-y-2 border-t border-slate-200/60 pt-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">AccÃ¨s gÃ©rant de centre</span>

            {isCentersEmpty ? (
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-xl font-medium">
                Aucun centre disponible pour le moment.
              </div>
            ) : managers.length === 0 ? (
              <div className="p-3 bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-xl italic">
                Aucun manager de centre configurÃ© pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {managers.map((mgr) => {
                  const center = centers.find(c => c.id === mgr.centerId);
                  return (
                    <button
                      key={mgr.id}
                      type="button"
                      onClick={() => handleQuickDemoLogin('center_manager', mgr)}
                      className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-premium flex items-center justify-between group cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
                          <Building className="h-3.5 w-3.5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 text-[11px] block group-hover:text-slate-900">{mgr.name}</span>
                          <span className="text-[9px] text-[#ff5757] font-bold">{center?.name || 'Centre'} ({center?.city || 'AlgÃ©rie'})</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 hover:text-slate-800">
                        Entrer -&gt;
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
