/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarDays, FileText, Mail, Phone, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Appointment, Client, Package, Service } from '../../../types';
import { formatDateTime } from '../../../lib/centerManagerUtils';

type PackageType = Package['type'];

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  centerClients: Client[];
  services: Service[];
  getTechnologyForClient: (clientId: string) => PackageType | null;
  onClose: () => void;
}

export function AppointmentDetailsModal({
  appointment,
  centerClients,
  services,
  getTechnologyForClient,
  onClose,
}: AppointmentDetailsModalProps) {
  if (!appointment) {
    return null;
  }

  const client = centerClients.find(candidate => candidate.id === appointment.clientId);
  const service = services.find(candidate => candidate.id === appointment.serviceId);
  const tech = client ? getTechnologyForClient(client.id) : null;

  return (
    <div id="modal-view-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#ff5757]" />
            <h4 className="font-bold text-slate-800 text-sm font-display">Détails de la Séance</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${client?.gender === 'F' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adhérent du Centre</span>
                <h5 className="font-bold text-slate-800 text-sm">
                  {client ? `${client.firstName} ${client.lastName}` : 'Adhérent inconnu'}
                </h5>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200/50 pt-2.5 text-[11px] text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{client?.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{client?.email || 'Pas de courriel'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Soin Prestation</span>
                <span className="text-slate-800 font-bold block">{service?.name || 'Soin'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Durée de séance</span>
                <span className="text-slate-800 font-bold block">{service ? `${service.duration} minutes` : '20 min'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Date & Heure</span>
                <span className="text-slate-800 font-bold block font-mono">{formatDateTime(appointment.dateTime)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Technologie Forfait</span>
                {tech ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold ${
                    tech === 'aq8'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : tech === 'wonder'
                        ? 'bg-slate-100 text-slate-800 border border-slate-200'
                        : 'bg-slate-50 text-slate-500'
                  }`}>
                    {tech === 'aq8' ? 'AQ8 Électrostimulation' : tech === 'wonder' ? 'Wonder Muscle Sculpt' : 'Mixte'}
                  </span>
                ) : (
                  <span className="text-slate-400 italic block">Aucun forfait actif</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Identifiant unique</span>
                <span className="text-slate-500 block font-mono text-[10px]">{appointment.id}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Statut</span>
                <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${
                  appointment.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : appointment.status === 'booked'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {appointment.status === 'completed' ? 'Séance Effectuée' : appointment.status === 'booked' ? 'Rendez-vous planifié' : 'Séance Annulée'}
                </span>
              </div>
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-3">
              <span className="text-slate-400 font-semibold block flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Commentaires / Consignes spécifiques
              </span>
              <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 italic">
                {appointment.notes || 'Aucun commentaire consigné pour cette séance.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition cursor-pointer">
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
