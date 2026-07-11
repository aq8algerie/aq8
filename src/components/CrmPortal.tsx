/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Building, Lock, Mail, Activity } from 'lucide-react';
import { Center, CenterManager } from '../types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { requireAuth, requireFirestore } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function CrmPortal({
  centers,
  managers,
  onLoginSuccess
}: {
  centers: Center[];
  managers: CenterManager[];
  onLoginSuccess: (role: 'super_admin' | 'center_manager', centerId: string | null, managerName: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const allowDemoTools = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

  // TODO Firebase Auth:
  // Remplacer cette logique mockée par signInWithEmailAndPassword.
  // Après connexion, récupérer le rôle utilisateur depuis Firestore.
  // Rediriger selon le rôle : super_admin ou center_manager.

  // Dynamic list of authorized demo accounts
  const getDemoUsers = () => {
    const list: Array<{
      email: string;
      password: string;
      role: 'super_admin' | 'center_manager';
      name: string;
      centerId: string | null;
    }> = [
      {
        email: "karim@aq8algerie.com",
        password: "demo123",
        role: "super_admin",
        name: "Karim Benchikh",
        centerId: null
      }
    ];

    managers.forEach(mgr => {
      list.push({
        email: mgr.email.toLowerCase().trim(),
        password: "demo123", // standard mock password for demonstration
        role: "center_manager",
        name: mgr.name,
        centerId: mgr.centerId
      });
    });

    return list;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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

    try {
      const auth = requireAuth();
      const db = requireFirestore();

      // 1. Authenticate using Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      if (!user || !user.email) {
        setErrorMessage("Erreur d'authentification.");
        return;
      }

      const userEmail = user.email.toLowerCase().trim();

      // 2. Super Admin check
      if (userEmail === 'karim@aq8algerie.com') {
        onLoginSuccess('super_admin', null, 'Karim Benchikh');
        return;
      }

      // 3. Manager check via Firestore
      const mgrRef = doc(db, 'managers', userEmail);
      const mgrSnap = await getDoc(mgrRef);

      if (!mgrSnap.exists()) {
        setErrorMessage('Aucun compte gérant associé à cet e-mail.');
        return;
      }

      const mgrData = mgrSnap.data() as CenterManager;

      if (!mgrData.active) {
        setErrorMessage('Votre compte gérant a été désactivé par le super administrateur.');
        return;
      }

      // Validate associated center
      const centerExists = centers.some(c => c.id === mgrData.centerId);
      if (!centerExists) {
        setErrorMessage('Votre centre de rattachement est inexistant ou désactivé.');
        return;
      }

      onLoginSuccess('center_manager', mgrData.centerId, mgrData.name);
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Erreur lors de la connexion. Veuillez vérifier vos identifiants.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        errMsg = 'Adresse e-mail ou mot de passe incorrect.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Adresse e-mail invalide.';
      }
      setErrorMessage(errMsg);
    }
  };

  const handleQuickDemoLogin = (role: 'super_admin' | 'center_manager', mgr?: CenterManager) => {
    setErrorMessage(null);
    if (role === 'super_admin') {
      onLoginSuccess('super_admin', null, 'Karim Benchikh');
    } else if (mgr) {
      if (centers.length === 0) {
        setErrorMessage('Aucun centre disponible. Connexion démo impossible.');
        return;
      }
      const targetCenter = centers.find(c => c.id === mgr.centerId);
      onLoginSuccess('center_manager', mgr.centerId, `${mgr.name}`);
    }
  };

  const isCentersEmpty = centers.length === 0;

  return (
    <div className="max-w-md mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 bg-[#353535] text-white rounded-full flex items-center justify-center shadow-md border border-[#ff5757]/30">
          <ShieldCheck className="h-6 w-6 text-[#ff5757]" />
        </div>
        <h1 className="text-2xl font-bold text-[#353535] font-display">Portail CRM AQ8 Algérie</h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Espace interne réservé à la direction AQ8 Algérie et aux managers de centres.
        </p>
      </div>

      {/* --- BLOC 1: Connexion CRM --- */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6">
        <h3 className="font-bold text-[#353535] font-display text-sm border-b border-slate-100 pb-2">Connexion CRM</h3>
        
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-pulse">
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
              {allowDemoTools && (<span className="text-[10px] text-slate-400">Pour démo: demo123</span>)}
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
            className="w-full py-3 bg-[#353535] hover:bg-slate-800 font-semibold text-white rounded-xl shadow-md transition-premium text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            Se Connecter au CRM
          </button>
        </form>
      </div>

      {/* --- BLOC 2: Mode démonstration --- */}
      <div className={`${allowDemoTools ? 'block' : 'hidden'} bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4`}>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#ff5757]" />
          <h4 className="font-bold text-[#353535] text-xs font-display">Mode démonstration</h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Accès de démonstration uniquement pour tester les habilitations et la restriction de données par centre.
        </p>

        <div className="space-y-3 pt-1">
          {/* Superadmin shortcut */}
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
                <span className="text-[10px] text-slate-500 font-mono">karim@aq8algerie.com</span>
              </div>
            </div>
            <span className="text-[10px] text-[#ff5757] font-semibold bg-[#ff5757]/10 py-1 px-2.5 rounded-md">
              Tester →
            </span>
          </button>

          {/* Center Manager shortcuts */}
          <div className="space-y-2 border-t border-slate-200/60 pt-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Accès Gérant de Centre (Cloisonnement)</span>
            
            {isCentersEmpty ? (
              <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-xl font-medium">
                Aucun centre disponible pour le moment.
              </div>
            ) : managers.length === 0 ? (
              <div className="p-3 bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-xl italic">
                Aucun manager de centre configuré pour le moment.
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
    </div>
  );
}

