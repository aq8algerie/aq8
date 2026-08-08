'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [verifying, setVerifying] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifying(false);
      setError('Lien de réinitialisation invalide ou manquant.');
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((accountEmail) => {
        setEmail(accountEmail);
        setVerifying(false);
      })
      .catch((err) => {
        console.error('[reset-password] invalid code:', err);
        setVerifying(false);
        setError('Ce lien de réinitialisation a expiré ou a déjà été utilisé.');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/crm');
      }, 3000);
    } catch (err) {
      console.error('[reset-password] confirm error:', err);
      const msg = err instanceof Error ? err.message : 'Échec de la réinitialisation.';
      if (msg.includes('weak-password')) {
        setError('Le mot de passe est trop faible. Choisissez un mot de passe plus complexe.');
      } else {
        setError('Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff5757]/10 text-[#ff5757] mb-2 shadow-xs">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black font-display text-slate-900 tracking-tight">
            Définir votre Mot de Passe
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Portail Sécurisé AQ8 Algérie CRM
          </p>
        </div>

        {verifying ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#ff5757] border-t-transparent" />
            <p className="text-xs font-semibold text-slate-600">Vérification de la clé de sécurité...</p>
          </div>
        ) : success ? (
          <div className="py-6 text-center space-y-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-900">Mot de passe réinitialisé !</h3>
              <p className="text-xs text-emerald-700 font-medium">
                Votre nouveau mot de passe a été enregistré avec succès. Redirection vers le CRM en cours...
              </p>
            </div>
            <Link
              href="/crm"
              className="inline-block mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              Se connecter au CRM
            </Link>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="h-4 w-4 text-rose-600" /> Lien Invalide ou Expiré
              </div>
              <p>{error}</p>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/crm"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#ff5757] transition"
              >
                <ArrowLeft className="h-4 w-4" /> Demander un nouveau lien depuis le CRM
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {email && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-medium text-center">
                Compte : <strong className="text-slate-900">{email}</strong>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Confirmer le mot de passe *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#ff5757] hover:bg-[#e03030] text-white font-extrabold rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Mise à jour en cours...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Enregistrer le mot de passe
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#ff5757] border-t-transparent" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
