/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Appointment, AppointmentStatus, Client, Service } from '../../../types';
import { getTodayDateString } from '../../../lib/centerManagerUtils';
import { getBookingHoursForDate, getServiceTypeById, getSlotAvailability } from '../../../lib/bookingCapacityRules';

interface EditAppointmentModalProps {
  appointment: Appointment | null;
  centerClients: Client[];
  services: Service[];
  appointments: Appointment[];
  onAppointmentChange: (appointment: Appointment) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export function EditAppointmentModal({
  appointment,
  centerClients,
  services,
  appointments,
  onAppointmentChange,
  onSubmit,
  onClose,
}: EditAppointmentModalProps) {
  if (!appointment) {
    return null;
  }

  const datePart = appointment.dateTime.split('T')[0] || getTodayDateString();
  const timePart = appointment.dateTime.split('T')[1] || '10:00';
  const selectedServiceType = getServiceTypeById(services, appointment.serviceId);
  const baseHours = getBookingHoursForDate(appointment.centerId, datePart);
  const allowedHours = Array.from(new Set([...baseHours, timePart].filter(Boolean))).sort();

  return (
    <div id="modal-edit-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-[#ff5757]" />
            <h4 className="font-bold text-slate-800 text-sm font-display">Modifier la Réservation</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Adhérent *</label>
            <select
              value={appointment.clientId}
              onChange={(event) => onAppointmentChange({ ...appointment, clientId: event.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              {centerClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName} ({client.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Prestation *</label>
            <select
              value={appointment.serviceId}
              onChange={(event) => onAppointmentChange({ ...appointment, serviceId: event.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration} min)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Date *</label>
              <input
                type="date"
                value={datePart}
                onChange={(event) => {
                  onAppointmentChange({ ...appointment, dateTime: `${event.target.value}T${timePart}` });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Heure *</label>
              <select
                value={timePart}
                onChange={(event) => {
                  onAppointmentChange({ ...appointment, dateTime: `${datePart}T${event.target.value}` });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none font-mono"
                required
              >
                {allowedHours.map(hour => {
                  const availability = selectedServiceType
                    ? getSlotAvailability(appointments, services, appointment.centerId, `${datePart}T${hour}`, selectedServiceType, appointment.id)
                    : null;
                  const label = availability
                    ? `${hour} - ${availability.remaining}/${availability.capacity} place(s)`
                    : hour;
                  return <option key={hour} value={hour}>{label}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Statut de la Séance *</label>
            <select
              value={appointment.status}
              onChange={(event) => onAppointmentChange({ ...appointment, status: event.target.value as AppointmentStatus })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              <option value="booked">Séance Planifiée (En attente)</option>
              <option value="completed">Séance Effectuée (Validée)</option>
              <option value="cancelled">Séance Annulée</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Notes spécifiques</label>
            <textarea
              value={appointment.notes || ''}
              onChange={(event) => onAppointmentChange({ ...appointment, notes: event.target.value })}
              placeholder="Particularités physiques, confort..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] text-white font-bold rounded-xl transition cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
