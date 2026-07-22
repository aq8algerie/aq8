import { FormEvent, useState } from 'react';
import { Building2, CheckCircle2, Globe, Mail, Phone, Save, Sparkles, Sliders } from 'lucide-react';
import { GeneralSettings } from '../../types';

type SettingsPanelProps = {
  settings: GeneralSettings;
  onSave: (settings: GeneralSettings) => void;
};

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [email, setEmail] = useState(settings.contactEmail);
  const [phone, setPhone] = useState(settings.contactPhone);
  const [address, setAddress] = useState(settings['addressAlgérie']);
  const [promoEnabled, setPromoEnabled] = useState(settings.enableVoucherPromo);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...settings,
      contactEmail: email,
      contactPhone: phone,
      ['addressAlgérie']: address,
      enableVoucherPromo: promoEnabled,
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1e1e] via-[#2d2d2d] to-[#141414] p-6 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 h-48 w-48 translate-x-10 -translate-y-10 rounded-full bg-[#ff5757]/15 blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#ff8080] backdrop-blur-md">
            <Sliders className="h-3.5 w-3.5 text-[#ff5757]" />
            Configuration Globale Super Admin
          </div>
          <h3 className="font-display text-xl font-black tracking-tight text-white sm:text-2xl">
            Paramètres Réseau AQ8 Algérie
          </h3>
          <p className="text-xs font-medium leading-relaxed text-slate-300">
            Définissez les coordonnées centrales affichées sur les reçus, le footer et l'offre découverte nationale.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {showSavedToast && (
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-sm animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Paramètres globaux enregistrés et appliqués avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#ff5757]" /> E-mail Général de Contact
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-[#ff5757] focus:bg-white focus:ring-2 focus:ring-[#ff5757]/10 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#ff5757]" /> Téléphone Siège National
              </label>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-[#ff5757] focus:bg-white focus:ring-2 focus:ring-[#ff5757]/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#ff5757]" /> Adresse Centrale Siège
            </label>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-none focus:border-[#ff5757] focus:bg-white focus:ring-2 focus:ring-[#ff5757]/10 transition-all"
            />
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-rose-50/30 border border-slate-200/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-extrabold text-slate-900 block text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#ff5757]" /> Offre Découverte d'Essai
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-relaxed block">
                Affiche l'appel à l'action pour la séance d'essai gratuite ou découverte sur le site vitrine.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={promoEnabled}
                onChange={(event) => setPromoEnabled(event.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff5757]" />
            </label>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-[#242424] hover:bg-[#ff5757] font-black text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" /> Enregistrer les paramètres
          </button>
        </form>
      </div>
    </div>
  );
}