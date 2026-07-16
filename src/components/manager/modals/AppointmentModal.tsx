/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Appointment, Center, Client, Service } from '../../../types';
import { getTodayDateString } from '../../../lib/centerManagerUtils';
import { getBookingHoursForDate, getServiceTypeById, getSlotAvailability } from '../../../lib/bookingCapacityRules';

interface AppointmentModalProps {
  clients: Client[];
  services: Service[];
  appointments: Appointment[];
  centerId: string;
  onClose: () => void;
  onSubmit: (data: { clientId: string; serviceId: string; date: string; time: string; notes: string }) => void | Promise<void>;
  initialDate?: string;
  center: Center;
}

export function AppointmentModal({
  clients,
  services,
  appointments,
  centerId,
  onClose,
  onSubmit,
  initialDate,
  center
}: AppointmentModalProps) {
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const allowedHours = useMemo(() => getBookingHoursForDate(centerId, date, center), [centerId, date, center]);
  const selectedServiceType = useMemo(() => getServiceTypeById(services, serviceId), [services, serviceId]);

  useEffect(() => {
    if (allowedHours.length > 0 && !allowedHours.includes(time)) {
      setTime(allowedHours[0]);
    } else if (allowedHours.length === 0 && time !== '') {
      setTime('');
    }
  }, [allowedHours, time]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !serviceId || !date || !time) {
      return;
    }
    onSubmit({
      clientId,
      serviceId,
      date,
      time,
      notes: notes.trim()
    });
  };

  return (
    <div id="modal-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h4 className="font-bold text-slate-800 text-sm font-display">Planifier une séance</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Choisir l'Adhérent *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              <option value="">-- Sélectionner un adhérent --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Prestation *</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              required
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration} min)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Créneau Horaire *</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                required
                disabled={allowedHours.length === 0}
              >
                {allowedHours.length === 0 && (
                  <option value="">Centre ferme ce jour</option>
                )}
                {allowedHours.map(h => {
                  const availability = selectedServiceType
                    ? getSlotAvailability(appointments, services, centerId, `${date}T${h}`, selectedServiceType, undefined, center)
                    : null;
                  const label = availability
                    ? `${h} - ${availability.remaining}/${availability.capacity} place(s)`
                    : h;
                  return <option key={h} value={h}>{label}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 block">Instructions spécifiques</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Focus fessiers ou soulagement lombaires..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={allowedHours.length === 0}
              className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Planifier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
