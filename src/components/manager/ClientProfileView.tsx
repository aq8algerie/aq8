/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  User,
  ShieldAlert,
  Heart,
  Activity,
  Award,
  CheckCircle2,
  Clock,
  MessageCircle,
  PhoneCall,
  Scale,
  Zap,
} from 'lucide-react';
import { Client, Appointment, Service, ClientPackage, Package, Measurement } from '../../types';
import { ActivePackageCard } from './cards/ActivePackageCard';
import { MeasurementChart } from './cards/MeasurementChart';
import { formatDateTime } from '../../lib/centerManagerUtils';

interface ClientProfileViewProps {
  client: Client;
  appointments: Appointment[];
  services: Service[];
  clientPackages: ClientPackage[];
  packages: Package[];
  measurements: Measurement[];
  onBack: () => void;
  onAssignPackage: () => void;
  onLogMeasurement: () => void;
}

export function ClientProfileView({
  client,
  appointments,
  services,
  clientPackages,
  packages,
  measurements,
  onBack,
  onAssignPackage,
  onLogMeasurement,
}: ClientProfileViewProps) {
  // Filter for this client
  const clientApts = appointments.filter(a => a.clientId === client.id);
  const clientPkgs = clientPackages.filter(cp => cp.clientId === client.id);
  const clientMeas = (measurements || []).filter(m =>
    m && m.clientId && String(m.clientId).trim().toLowerCase() === String(client.id).trim().toLowerCase()
  );

  // Calculate age if DOB exists
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(client.dob);
  const isSuspended = client.status === 'suspended';

  const [activeProfileTab, setActiveProfileTab] = React.useState<'profile' | 'measurements' | 'packages'>('profile');

  // Stats calculation
  const completedSessionsCount = clientApts.filter(a => a.status === 'completed').length;
  const activePkg = clientPkgs.find(cp => cp.status === 'active' && cp.sessionsRemaining > 0);
  const totalRemainingSessions = activePkg ? activePkg.sessionsRemaining : 0;
  const initials = `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase() || 'C';

  const cleanPhone = client.phone ? client.phone.replace(/\s+/g, '') : '';
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '213' + cleanPhone.slice(1) : cleanPhone}` : '';

  return (
    <div id="client-profile-view" className="space-y-6">
      {/* Back navigation */}
      <button
        id="btn-client-profile-back"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-[#0284c7] font-bold transition cursor-pointer w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au fichier clients
      </button>

      {/* Luxury Member Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1c1c] via-[#282828] to-[#121212] p-6 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 h-64 w-64 translate-x-10 -translate-y-10 rounded-full bg-[#0284c7]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center font-black text-2xl shadow-lg border border-white/20">
              {initials}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black font-display text-white tracking-tight">
                  {client.firstName} {client.lastName}
                </h2>

                {client.gender && (
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    client.gender === 'F' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {client.gender === 'F' ? 'Femme' : 'Homme'}
                  </span>
                )}

                {isSuspended ? (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    Client Suspendu
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    Membre Actif
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                {client.phone && (
                  <span className="flex items-center gap-1 font-mono text-slate-200">
                    <Phone className="h-3.5 w-3.5 text-[#0284c7]" /> {client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1 text-slate-200 font-mono">
                    <Mail className="h-3.5 w-3.5 text-[#0284c7]" /> <span className="truncate">{client.email}</span>
                  </span>
                )}
                <span className="text-slate-400 font-medium">Inscrit le {client.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Contact Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold transition shadow-sm"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Appeler
              </a>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 text-xs font-bold transition shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}

            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold transition backdrop-blur-xs border border-white/10"
              >
                <Mail className="h-3.5 w-3.5 text-[#0284c7]" /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Profile Sub-Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveProfileTab('profile')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeProfileTab === 'profile'
              ? 'border-[#0284c7] text-[#0284c7]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" /> Dossier Client & Santé
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('measurements')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeProfileTab === 'measurements'
              ? 'border-[#0284c7] text-[#0284c7]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-4 w-4 text-[#0284c7]" /> Mensurations et suivis ({clientMeas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('packages')}
          className={`pb-3 px-2 text-xs sm:text-sm font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeProfileTab === 'packages'
              ? 'border-[#0284c7] text-[#0284c7]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="h-4 w-4" /> Forfaits & Séances ({clientPkgs.length})
        </button>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Séances Faites</span>
            <span className="text-base font-black font-display text-slate-800">{completedSessionsCount} faites</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Solde Restant</span>
            <span className="text-base font-black font-display text-slate-800">{totalRemainingSessions} séance(s)</span>
          </div>
        </div>

        <div
          onClick={() => setActiveProfileTab('measurements')}
          className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3 cursor-pointer hover:border-[#0284c7]/40 transition"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-rose-50 text-[#0284c7] flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensurations Enregistrées</span>
              <span className="text-base font-black font-display text-[#0284c7]">{clientMeas.length} enregistrées ➔</span>
            </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Statut Forfait</span>
            <span className="text-xs font-black font-display text-slate-800">
              {activePkg ? 'Actif' : 'À Renouveler'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Profile & Dossier Santé */}
      {activeProfileTab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Detailed Profile Information */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-[#0284c7]" /> Fiche Informations Détaillées
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Date de naissance :</span>
                    <span className="font-semibold text-slate-700">{client.dob ? `${client.dob} (${age} ans)` : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Profession :</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[150px]">{client.profession || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-semibold">Groupe Sanguin :</span>
                    <span className="font-bold text-[#0284c7] font-mono">{client.bloodType || '-'}</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">🚨 En Cas d'Urgence</span>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Contact :</span>
                    <span className="font-semibold text-slate-700">{client.emergencyContactName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-semibold">Téléphone :</span>
                    <span className="font-semibold text-slate-700 font-mono">{client.emergencyContactPhone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Sport Goals tags */}
              {client.sportGoals && client.sportGoals.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">🎯 Objectifs Sportifs & Remise en Forme</span>
                  <div className="flex flex-wrap gap-1.5">
                    {client.sportGoals.map((goal, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-[#0284c7]/5 border border-[#0284c7]/20 text-[#0284c7] px-3 py-1 rounded-xl text-[10px] font-bold">
                        <Heart className="h-3 w-3 fill-[#0284c7]" /> {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Medical Alerts & Coach notes */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Dossier Santé & Contre-indications
              </h4>

              {client.medicalConditions ? (
                <div className="p-4 bg-rose-50 border border-rose-200/80 text-rose-700 rounded-2xl flex items-start gap-3 shadow-xs">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold block uppercase tracking-wide text-[10px] text-rose-900">Alerte Médicale / Vigilance :</span>
                    <p className="font-semibold leading-relaxed text-rose-800">{client.medicalConditions}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  🟢 Aucune contre-indication ou problème de santé déclaré.
                </div>
              )}

              <div className="space-y-2">
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">📝 Remarques & Suivi Entraînement Coach</span>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 italic leading-relaxed">
                  {client.notes ? client.notes : "Aucune note sportive supplémentaire enregistrée."}
                </div>
              </div>
            </div>

            {/* Session logs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#0284c7]" /> Historique des Séances ({clientApts.length})
              </h4>

              {clientApts.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {[...clientApts].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).map(apt => {
                    const srv = services.find(s => s.id === apt.serviceId);
                    return (
                      <div key={apt.id} className="py-3.5 flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 block">{srv?.name || 'Prestation AQ8'}</span>
                          <span className="font-mono text-[11px] text-slate-500 block">{formatDateTime(apt.dateTime)}</span>
                          {apt.notes && <p className="text-[10px] text-slate-400 italic">Notes gérant : "{apt.notes}"</p>}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'booked'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  Aucune séance passée enregistrée pour cet adhérent.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ActivePackageCard
              clientPackages={clientPkgs}
              packages={packages}
              onAssignClick={onAssignPackage}
            />
            <MeasurementChart
              measurements={clientMeas}
              onLogMeasurementClick={onLogMeasurement}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Section Mensurations Détaillée (Tableau + Graphique) */}
      {activeProfileTab === 'measurements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-[#0284c7] tracking-wider">
                Suivi Anatomique Adhérent
              </span>
              <h3 className="text-2xl font-black font-display text-slate-900">
                Tableau & Graphique des Mensurations
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Consultez l'historique complet des relevés, le tableau comparatif et le graphique d'amincissement.
              </p>
            </div>
            <button
              type="button"
              onClick={onLogMeasurement}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0284c7] px-5 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-[#0369a1] cursor-pointer w-fit"
            >
              <Scale className="h-4 w-4" /> Ajouter mensurations
            </button>
          </div>

          {/* Grid with Table & Chart */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Table Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-[#0284c7]" /> Tableau des Mensurations Ajoutées ({clientMeas.length})
              </h4>

              {clientMeas.length > 0 ? (
                <div className="space-y-4">
                  {/* Latest Measurement Highlight Card */}
                  {(() => {
                    const sorted = [...clientMeas].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
                    const latest = sorted[0];
                    const initial = sorted[sorted.length - 1];
                    const weightDiff = sorted.length > 1 && latest.weight && initial.weight ? (latest.weight - initial.weight).toFixed(1) : null;

                    return (
                      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#38bdf8] bg-[#0284c7]/20 border border-[#0284c7]/30 px-3 py-1 rounded-lg">
                            Dernier Relevé • {latest.date}
                          </span>
                          {weightDiff !== null && (
                            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
                              Number(weightDiff) <= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              Progression : {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Poids</span>
                            <span className="text-lg font-black text-white">{latest.weight ? `${latest.weight} kg` : '-'}</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Taille</span>
                            <span className="text-lg font-black text-white">{latest.waist ? `${latest.waist} cm` : '-'}</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Hanches</span>
                            <span className="text-lg font-black text-white">{latest.hips ? `${latest.hips} cm` : '-'}</span>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Cuisses</span>
                            <span className="text-lg font-black text-white">{latest.thighs ? `${latest.thighs} cm` : '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Full Data Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Poids</th>
                          <th className="py-3 px-3">Taille</th>
                          <th className="py-3 px-3">Hanches</th>
                          <th className="py-3 px-3">Cuisses</th>
                          <th className="py-3 px-3">Poitrine</th>
                          <th className="py-3 px-3">Masse Gras %</th>
                          <th className="py-3 px-3">Masse Muscle %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {[...clientMeas]
                          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                          .map((m, idx) => (
                            <tr key={m.id || idx} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{m.date}</td>
                              <td className="py-3 px-3 font-black text-[#0284c7]">{m.weight} kg</td>
                              <td className="py-3 px-3">{m.waist ? `${m.waist} cm` : '-'}</td>
                              <td className="py-3 px-3">{m.hips ? `${m.hips} cm` : '-'}</td>
                              <td className="py-3 px-3">{m.thighs ? `${m.thighs} cm` : '-'}</td>
                              <td className="py-3 px-3">{m.chest ? `${m.chest} cm` : '-'}</td>
                              <td className="py-3 px-3 text-emerald-600 font-bold">{m.bodyFat ? `${m.bodyFat}%` : '-'}</td>
                              <td className="py-3 px-3 text-rose-600 font-bold">{m.muscleMass ? `${m.muscleMass}%` : '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-3">
                  <Scale className="mx-auto h-10 w-10 text-slate-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Aucune mensuration loguée pour le moment</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Prenez le poids et les mensurations anatomiques lors du bilan initial pour remplir le tableau de suivi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogMeasurement}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0369a1]"
                  >
                    <Scale className="h-4 w-4" /> Enregistrer le 1er bilan
                  </button>
                </div>
              )}
            </div>

            {/* Graph Column */}
            <div className="lg:col-span-5 space-y-6">
              <MeasurementChart
                measurements={clientMeas}
                onLogMeasurementClick={onLogMeasurement}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Forfaits & Abonnements */}
      {activeProfileTab === 'packages' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActivePackageCard
              clientPackages={clientPkgs}
              packages={packages}
              onAssignClick={onAssignPackage}
            />
          </div>
          <div className="space-y-6">
            <MeasurementChart
              measurements={clientMeas}
              onLogMeasurementClick={onLogMeasurement}
            />
          </div>
        </div>
      )}
    </div>
  );
}
