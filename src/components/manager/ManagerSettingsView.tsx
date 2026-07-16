/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Building2, CalendarClock, FileText, Image as ImageIcon, Mail, MapPin, Phone, Save, Settings } from 'lucide-react';
import { Center } from '../../types';
import { CrmActionResult } from '../../lib/crmTransactions';
import { ManagerBookingSettingsPanel } from './ManagerBookingSettingsPanel';

type CenterProfileSettings = Pick<Center,
  | 'phone'
  | 'email'
  | 'address'
  | 'imageUrl'
  | 'schedule'
  | 'description'
  | 'status'
  | 'importantNotes'
  | 'menHours'
  | 'womenHours'
  | 'equipment'
  | 'cancellationRule'
>;

type SettingsTabId = 'public' | 'reservation' | 'personalization';

const SETTINGS_TABS: Array<{
  id: SettingsTabId;
  label: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'public',
    label: 'Informations publiques',
    helper: 'Coordonnees, adresse, statut et presentation du centre.',
    icon: Building2,
  },
  {
    id: 'reservation',
    label: 'Parametres de reservation',
    helper: 'Horaires reservables et capacites AQ8 / Wonder par heure.',
    icon: CalendarClock,
  },
  {
    id: 'personalization',
    label: 'Personnalisation',
    helper: 'Notes, regles, equipement conseille et horaires par public.',
    icon: FileText,
  },
];

interface ManagerSettingsViewProps {
  currentCenter: Center;
  onSaveBookingSettings: (settings: { bookingCapacity: Center['bookingCapacity']; bookingHours: Center['bookingHours'] }) => Promise<CrmActionResult>;
  onSaveCenterProfile: (settings: CenterProfileSettings) => Promise<CrmActionResult>;
}

function joinLines(values?: string[]): string {
  return (values || []).join('\n');
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizeProfile(center: Center) {
  return {
    phone: center.phone || '',
    email: center.email || '',
    address: center.address || '',
    imageUrl: center.imageUrl || '',
    schedule: center.schedule || '',
    description: center.description || '',
    status: center.status || '',
    cancellationRule: center.cancellationRule || '',
    importantNotesText: joinLines(center.importantNotes),
    menHoursText: joinLines(center.menHours),
    womenHoursText: joinLines(center.womenHours),
    equipmentText: joinLines(center.equipment),
  };
}

export function ManagerSettingsView({
  currentCenter,
  onSaveBookingSettings,
  onSaveCenterProfile,
}: ManagerSettingsViewProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>('public');
  const [profile, setProfile] = useState(() => normalizeProfile(currentCenter));
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setProfile(normalizeProfile(currentCenter));
    setProfileError('');
  }, [currentCenter]);

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');

    const result = await onSaveCenterProfile({
      phone: profile.phone.trim(),
      email: profile.email.trim().toLowerCase(),
      address: profile.address.trim(),
      imageUrl: profile.imageUrl.trim(),
      schedule: profile.schedule.trim(),
      description: profile.description.trim(),
      status: profile.status.trim(),
      cancellationRule: profile.cancellationRule.trim(),
      importantNotes: splitLines(profile.importantNotesText),
      menHours: splitLines(profile.menHoursText),
      womenHours: splitLines(profile.womenHoursText),
      equipment: splitLines(profile.equipmentText),
    });

    if (!result.ok) {
      setProfileError(result.error || 'Enregistrement impossible.');
    }

    setSavingProfile(false);
  };

  const profileErrorAlert = profileError ? (
    <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
      {profileError}
    </div>
  ) : null;

  return (
    <div id="manager-settings-view" className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-xs">
            <Settings className="h-3.5 w-3.5 text-[#ff5757]" />
            Parametres manager
          </div>
          <h3 className="font-display text-lg font-bold text-slate-800">Parametres du centre</h3>
          <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
            Gere les disponibilites de reservation, les informations publiques et les textes affiches sur la fiche du centre.
          </p>
        </div>
      </div>

      <div id="manager-settings-tabs" className="overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xs">
        <div className="grid min-w-[720px] grid-cols-3 gap-1.5 lg:min-w-0">
          {SETTINGS_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSettingsTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-[#353535] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold leading-tight">{tab.label}</span>
                  <span className={`mt-1 block text-[10px] font-medium leading-snug ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                    {tab.helper}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSettingsTab === 'reservation' && (
        <div id="manager-settings-reservation-panel">
          <ManagerBookingSettingsPanel
            currentCenter={currentCenter}
            onSave={onSaveBookingSettings}
          />
        </div>
      )}

      {activeSettingsTab === 'public' && (
        <section id="manager-settings-public-panel" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-800">Informations publiques</h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                  Ces informations alimentent la fiche publique du centre et les points de contact client.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#353535] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#ff5757] disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {savingProfile ? 'Enregistrement...' : 'Enregistrer les infos'}
            </button>
          </div>

          {profileErrorAlert}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telephone</span>
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => updateProfile('phone', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) => updateProfile('email', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600 lg:col-span-2">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Adresse</span>
              <input
                type="text"
                value={profile.address}
                onChange={(event) => updateProfile('address', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600 lg:col-span-2">
              <span className="inline-flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image publique du centre</span>
              <input
                type="url"
                value={profile.imageUrl}
                onChange={(event) => updateProfile('imageUrl', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Statut affiche
              <input
                type="text"
                value={profile.status}
                onChange={(event) => updateProfile('status', event.target.value)}
                placeholder="Ouvert, Femmes uniquement, Horaires temporaires..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Horaires affiches sur la fiche
              <input
                type="text"
                value={profile.schedule}
                onChange={(event) => updateProfile('schedule', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600 lg:col-span-2">
              <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Description publique</span>
              <textarea
                value={profile.description}
                onChange={(event) => updateProfile('description', event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>
          </div>
        </section>
      )}

      {activeSettingsTab === 'personalization' && (
        <section id="manager-settings-personalization-panel" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5757]/10 text-[#ff5757]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-800">Personnalisation de la fiche</h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                  Saisis une information par ligne pour les listes affichees au public.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#353535] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#ff5757] disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>

          {profileErrorAlert}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Notes importantes
              <textarea
                value={profile.importantNotesText}
                onChange={(event) => updateProfile('importantNotesText', event.target.value)}
                rows={7}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Equipement conseille
              <textarea
                value={profile.equipmentText}
                onChange={(event) => updateProfile('equipmentText', event.target.value)}
                rows={7}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Horaires hommes
              <textarea
                value={profile.menHoursText}
                onChange={(event) => updateProfile('menHoursText', event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600">
              Horaires femmes
              <textarea
                value={profile.womenHoursText}
                onChange={(event) => updateProfile('womenHoursText', event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>

            <label className="space-y-1.5 text-xs font-bold text-slate-600 lg:col-span-2">
              Regle d'annulation
              <textarea
                value={profile.cancellationRule}
                onChange={(event) => updateProfile('cancellationRule', event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-slate-800 outline-none focus:border-[#ff5757] focus:bg-white resize-none"
              />
            </label>
          </div>
        </section>
      )}
    </div>
  );
}
