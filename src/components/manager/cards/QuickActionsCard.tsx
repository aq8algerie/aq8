/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserPlus, Calendar, DollarSign, Scale } from 'lucide-react';

interface QuickActionsCardProps {
  onRegisterClient: () => void;
  onBookAppointment: () => void;
  onLogPayment: () => void;
  onLogMeasurements: () => void;
}

export function QuickActionsCard({
  onRegisterClient,
  onBookAppointment,
  onLogPayment,
  onLogMeasurements
}: QuickActionsCardProps) {
  return (
    <div id="quick-actions-card" className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
      <h3 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Actions Rapides Gérant</h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        Enregistrez un nouvel adhérent ou loguez un encaissement manuel en 1 clic.
      </p>
      
      <div className="space-y-2.5">
        <button
          id="btn-quick-register-client"
          onClick={onRegisterClient}
          className="w-full py-2.5 px-3 bg-[#353535] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Enregistrer un Client
        </button>
        <button
          id="btn-quick-book-appt"
          onClick={onBookAppointment}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Calendar className="h-4 w-4" /> Planifier un RDV
        </button>
        <button
          id="btn-quick-log-payment"
          onClick={onLogPayment}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <DollarSign className="h-4 w-4" /> Encaisser un Forfait
        </button>
        <button
          id="btn-quick-log-meas"
          onClick={onLogMeasurements}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Scale className="h-4 w-4" /> Noter des Mensurations
        </button>
      </div>
    </div>
  );
}
