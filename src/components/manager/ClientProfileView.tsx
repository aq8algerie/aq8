/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Phone, Mail, Calendar, Sparkles, User, ShieldAlert, Heart, Activity } from 'lucide-react';
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
  onLogMeasurement
}: ClientProfileViewProps) {
  // Filter for this client
  const clientApts = appointments.filter(a => a.clientId === client.id);
  const clientPkgs = clientPackages.filter(cp => cp.clientId === client.id);
  const clientMeas = measurements.filter(m => m.clientId === client.id);

  // Calculate age if DOB exists
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(client.dob);

  return (
    <div id="client-profile-view" className="space-y-6">
      {/* Back navigation & Header profile */}
      <div className="flex flex-col gap-4">
        <button
          id="btn-client-profile-back"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au fichier clients
        </button>

        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-[#ff5757]/5 rounded-full blur-2xl"></div>
          
          <div className="space-y-1.5 min-w-0">
            <h3 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
              {client.firstName} {client.lastName}
              {client.gender && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  client.gender === 'F' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {client.gender === 'F' ? 'Femme' : 'Homme'}
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-[#ff5757] font-semibold transition">
                <Phone className="h-3.5 w-3.5 text-[#ff5757]" /> {client.phone}
              </a>
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-[#ff5757] font-semibold transition">
                  <Mail className="h-3.5 w-3.5 text-[#ff5757]" /> <span className="truncate font-mono">{client.email}</span>
                </a>
              )}
              <span className="text-slate-400 font-medium">Membre depuis : {client.createdAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left main columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Detailed Profile Information */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
              <User className="h-4 w-4 text-[#ff5757]" /> Fiche Informations Détaillées
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
                  <span className="font-bold text-[#ff5757] font-mono">{client.bloodType || '-'}</span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider text-slate-400">🚨 En Cas d'Urgence</span>
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
                <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">🎯 Objectifs Sportifs</span>
                <div className="flex flex-wrap gap-1.5">
                  {client.sportGoals.map((goal, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-[#ff5757]/5 border border-[#ff5757]/20 text-[#ff5757] px-3 py-1 rounded-xl text-[10px] font-bold">
                      <Heart className="h-3 w-3 fill-[#ff5757]" /> {goal}
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
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold block uppercase tracking-wide text-[10px]">Alerte Médicale / Vigilance :</span>
                  <p className="font-semibold leading-relaxed text-rose-800">{client.medicalConditions}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-100/50 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                🟢 Aucune contre-indication ou problème de santé déclaré.
              </div>
            )}

            <div className="space-y-2">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">📝 Remarques & Suivi Entraînement</span>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 italic leading-relaxed">
                {client.notes ? client.notes : "Aucune note sportive supplémentaire."}
              </div>
            </div>
          </div>

          {/* Session logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-4 w-4 text-[#ff5757]" /> Historique des Séances Validées
            </h4>

            {clientApts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {[...clientApts].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).map(apt => {
                  const srv = services.find(s => s.id === apt.serviceId);
                  return (
                    <div key={apt.id} className="py-3.5 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-800 block">{srv?.name || 'Prestation'}</span>
                        <span className="font-mono text-[11px] text-slate-500 block">{formatDateTime(apt.dateTime)}</span>
                        {apt.notes && <p className="text-[10px] text-slate-400 italic">Notes gérant : "{apt.notes}"</p>}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        apt.status === 'completed'
                          ? 'bg-green-50 text-green-600 border border-green-150'
                          : apt.status === 'booked'
                          ? 'bg-blue-50 text-blue-600 border border-blue-150'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Aucune séance passée enregistrée sur ce client.
              </div>
            )}
          </div>
        </div>

        {/* Right sidebars */}
        <div className="space-y-6">
          {/* Active Package display */}
          <ActivePackageCard
            clientPackages={clientPkgs}
            packages={packages}
            onAssignClick={onAssignPackage}
          />

          {/* Weight graph tracking */}
          <MeasurementChart
            measurements={clientMeas}
            onLogMeasurementClick={onLogMeasurement}
          />
        </div>
      </div>
    </div>
  );
}
