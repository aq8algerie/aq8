/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
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

  // États pour la recherche et le menu déroulant
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Récupérer l'adhérent sélectionné
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === clientId) || null;
  }, [clients, clientId]);

  // Filtrer les adhérents par nom, prénom ou téléphone
  const filteredClients = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return clients;
    return clients.filter(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const phone = c.phone ? c.phone.toLowerCase() : '';
      return fullName.includes(query) || phone.includes(query);
    });
  }, [clients, searchTerm]);

  // Fermer la liste déroulante au clic en dehors
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.client-search-select-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isDropdownOpen]);

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
    <div id="modal-appointment" className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 relative overflow-visible my-8 sm:my-0">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h4 className="font-bold text-slate-800 text-sm font-display">Planifier une séance</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1 relative client-search-select-container">
            <label className="font-semibold text-slate-600 block">Choisir l'Adhérent *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none flex justify-between items-center cursor-pointer text-slate-700 min-h-[34px]"
              >
                <span className="truncate">
                  {selectedClient
                    ? `${selectedClient.firstName} ${selectedClient.lastName} (${selectedClient.phone || 'Pas de numéro'})`
                    : "-- Sélectionner un adhérent --"}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom ou téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-xs focus:ring-0 focus:outline-none placeholder-slate-400"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">Aucun adhérent trouvé</div>
                    ) : (
                      filteredClients.map(c => {
                        const isSelected = c.id === clientId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClientId(c.id);
                              setIsDropdownOpen(false);
                              setSearchTerm('');
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors ${
                              isSelected ? 'bg-[#0284c7]/10 text-[#0284c7] font-semibold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-medium">{c.firstName} {c.lastName}</span>
                              {c.phone && <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">({c.phone})</span>}
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-[#0284c7]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Select natif masqué pour conserver la validation HTML5 standard */}
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              required
              tabIndex={-1}
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
              className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] font-semibold text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Planifier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
