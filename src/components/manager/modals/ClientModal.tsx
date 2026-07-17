/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Activity, ShieldAlert, Sparkles, Heart, AlertTriangle } from 'lucide-react';
import { Client } from '../../../types';

interface ClientModalProps {
  onClose: () => void;
  initialClient?: Client;
  mode?: 'create' | 'edit';
  onSubmit: (clientData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes: string;
    gender: 'H' | 'F';
    dob?: string;
    bloodType?: string;
    profession?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    medicalConditions?: string;
    sportGoals?: string[];
    avatarUrl?: string;
  }) => void;
}

type TabId = 'general' | 'profile' | 'health';

export function ClientModal({ onClose, onSubmit, initialClient, mode = 'create' }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Tab 1: General States
  const [firstName, setFirstName] = useState(initialClient?.firstName || '');
  const [lastName, setLastName] = useState(initialClient?.lastName || '');
  const [phone, setPhone] = useState(initialClient?.phone || '');
  const [email, setEmail] = useState(initialClient?.email || '');
  const [gender, setGender] = useState<'H' | 'F'>(initialClient?.gender || 'F');
  const [dob, setDob] = useState(initialClient?.dob || '');
  const [profession, setProfession] = useState(initialClient?.profession || '');
  const [avatarUrl, setAvatarUrl] = useState(initialClient?.avatarUrl || '');

  // Tab 2: Profile & Goals States
  const [bloodType, setBloodType] = useState(initialClient?.bloodType || 'O+');
  const [notes, setNotes] = useState(initialClient?.notes || '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialClient?.sportGoals || []);

  // Tab 3: Health & Emergency States
  const [medicalConditions, setMedicalConditions] = useState(initialClient?.medicalConditions || '');
  const [emergencyContactName, setEmergencyContactName] = useState(initialClient?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialClient?.emergencyContactPhone || '');

  const goalOptions = [
    'Perte de poids',
    'Tonification musculaire',
    'Prise de masse',
    'Performance cardio',
    'Amélioration posture',
    'Réhabilitation / Rééducation',
    'Bien-être / Anti-stress',
    'Remise en forme générale'
  ];

  const triggerToast = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleGoalToggle = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  // Non-blocking navigation
  const handleNext = () => {
    if (activeTab === 'general') {
      // Gentle toast notice if missing, but DO NOT block tab switching!
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        triggerToast('⚠️ Note : Pensez à remplir les champs obligatoires (Prénom, Nom, Téléphone) dans Général.', 'warning');
      }
      setActiveTab('profile');
    } else if (activeTab === 'profile') {
      setActiveTab('health');
    }
  };

  const handlePrev = () => {
    if (activeTab === 'health') {
      setActiveTab('profile');
    } else if (activeTab === 'profile') {
      setActiveTab('general');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final check: if required fields are missing, block submission and redirect to general tab with elegant toast
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      triggerToast('Veuillez remplir les champs obligatoires dans Général (Prénom, Nom, Téléphone) avant de continuer.', 'error');
      setActiveTab('general');
      return;
    }
    
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      notes: notes.trim(),
      gender,
      dob: dob || undefined,
      bloodType: bloodType || undefined,
      profession: profession || undefined,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      medicalConditions: medicalConditions.trim() || undefined,
      sportGoals: selectedGoals,
      avatarUrl: avatarUrl.trim() || undefined
    });
  };

  return (
    <div id="modal-client" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-300">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h4 className="font-bold text-slate-800 text-sm font-display flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#ff5757]" /> {mode === 'edit' ? 'Modifier la fiche adherent' : 'Fiche nouvel adherent'}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">{mode === 'edit' ? 'Mettez a jour les informations du membre.' : 'Configurez le profil complet du membre.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer transition-colors">✕</button>
        </div>

        {/* Tab Navigation (Non-blocking) */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-center text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'general' ? 'border-[#ff5757] text-[#ff5757]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-center text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'profile' ? 'border-[#ff5757] text-[#ff5757]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Objectifs & Profil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex-1 py-3 text-center text-[10px] uppercase tracking-wider font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'health' ? 'border-[#ff5757] text-[#ff5757]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Santé / Urgence
          </button>
        </div>

        {/* Elegant Custom Toast Notification inside Modal */}
        {toast && (
          <div className="px-6 pt-4 shrink-0">
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-2.5 text-[11px] font-semibold transition-all duration-300 animate-in fade-in slide-in-from-top-2 shadow-xs ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Modal Form Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Selma"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Messaoudi"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Téléphone de contact *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550 99 88 77"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Genre *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'H' | 'F')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                  >
                    <option value="F">Femme</option>
                    <option value="H">Homme</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Adresse E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="selma.m@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Date de naissance</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Profession / Secteur</label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ingénieur, Médecin, Étudiant..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Lien Photo de profil (Optionnel)</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & GOALS */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-600 block">Groupe Sanguin</label>
                <div className="flex gap-2 flex-wrap">
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBloodType(type)}
                      className={`px-3 py-1.5 rounded-lg border font-bold font-mono transition-all text-[10px] cursor-pointer ${
                        bloodType === type
                          ? 'bg-[#ff5757] border-[#ff5757] text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-600 block">Objectifs Sportifs (Sélection multiple)</label>
                <div className="grid grid-cols-2 gap-2">
                  {goalOptions.map(goal => {
                    const isSelected = selectedGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => handleGoalToggle(goal)}
                        className={`px-3 py-2 rounded-xl border text-left transition-premium font-semibold flex items-center justify-between text-[10px] cursor-pointer ${
                          isSelected
                            ? 'bg-[#ff5757]/10 border-[#ff5757] text-[#ff5757]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        <span>{goal}</span>
                        {isSelected && <Heart className="h-3 w-3 fill-[#ff5757] text-[#ff5757]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Remarques d'entraînement ou coach</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: douleurs genou gauche, préfère les entraînements le matin..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                ></textarea>
              </div>
            </div>
          )}

          {/* TAB 3: HEALTH & EMERGENCY */}
          {activeTab === 'health' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-1">
                <label className="font-semibold text-rose-600 block flex items-center gap-1">
                  ⚠️ Antécédents médicaux / Contre-indications
                </label>
                <textarea
                  rows={3}
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="ex: Hypertension, Prothèse hanche, Asthme ou 'Aucun'..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-rose-500 font-semibold"
                ></textarea>
                <span className="text-[10px] text-slate-400 block pt-0.5">Notez toute condition physique limitante pour l'électrostimulation (EMS).</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">📞 Contact d'Urgence</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Nom complet du contact</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Nom du conjoint/parent"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Téléphone d'urgence</label>
                    <input
                      type="text"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="0661 12 34 56"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            {activeTab !== 'general' ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Précédent
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Annuler
              </button>
            )}
          </div>

          <div>
            {activeTab !== 'health' ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-[#353535] hover:bg-slate-800 text-white font-semibold rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#ff5757] hover:bg-[#e04646] text-white font-bold rounded-xl cursor-pointer transition-premium shadow-md shadow-red-100"
              >
                {mode === 'edit' ? 'Enregistrer les modifications' : "Enregistrer l'Adherent"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
