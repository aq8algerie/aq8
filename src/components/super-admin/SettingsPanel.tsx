import { FormEvent, useState } from 'react';
import { GeneralSettings } from '../../types';

type SettingsPanelProps = {
  settings: GeneralSettings;
  onSave: (settings: GeneralSettings) => void;
};

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [email, setEmail] = useState(settings.contactEmail);
  const [phone, setPhone] = useState(settings.contactPhone);
  const [address, setAddress] = useState(settings['addressAlg\u00e9rie']);
  const [promoEnabled, setPromoEnabled] = useState(settings.enableVoucherPromo);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...settings,
      contactEmail: email,
      contactPhone: phone,
      ['addressAlg\u00e9rie']: address,
      enableVoucherPromo: promoEnabled
    });
    alert('Paramètres enregistrés avec succès !');
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs max-w-xl">
      <h3 className="font-bold font-display text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">
        Configuration générale AQ8
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">E-mail général de contact</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Téléphone siège</label>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-slate-600 block">Adresse centrale</label>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
          />
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800 block">Activer l'offre découverte sur le site</span>
            <span className="text-[10px] text-slate-500">
              Affiche l'appel à l'action pour réserver la séance découverte d'essai.
            </span>
          </div>
          <input
            type="checkbox"
            checked={promoEnabled}
            onChange={(event) => setPromoEnabled(event.target.checked)}
            className="h-4 w-4 accent-[#ff5757]"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 bg-[#353535] hover:bg-slate-800 font-semibold text-white rounded-xl transition-premium cursor-pointer"
        >
          Enregistrer les paramètres
        </button>
      </form>
    </div>
  );
}