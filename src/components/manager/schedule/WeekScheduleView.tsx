/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckSquare, Edit2, Eye, Plus, Square } from 'lucide-react';
import { Appointment, Client, Service } from '../../../types';

interface WeekScheduleViewProps {
  focusedDate: Date;
  appointmentsToRender: Appointment[];
  centerClients: Client[];
  services: Service[];
  selectedIds: string[];
  getWeekDates: (refDate: Date) => Date[];
  formatDateToYYYYMMDD: (date: Date) => string;
  getTodayDateString: () => string;
  onToggleSelectOne: (id: string) => void;
  onViewAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onBookingDateFilterChange: (date: string) => void;
  onBookAppointmentClick: () => void;
}

export function WeekScheduleView({
  focusedDate,
  appointmentsToRender,
  centerClients,
  services,
  selectedIds,
  getWeekDates,
  formatDateToYYYYMMDD,
  getTodayDateString,
  onToggleSelectOne,
  onViewAppointment,
  onEditAppointment,
  onBookingDateFilterChange,
  onBookAppointmentClick,
}: WeekScheduleViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {getWeekDates(focusedDate).map((dayDate) => {
        const dateStr = formatDateToYYYYMMDD(dayDate);
        const isToday = dateStr === getTodayDateString();
        const dayApts = appointmentsToRender.filter(a => a.dateTime.startsWith(dateStr));

        return (
          <div
            key={dateStr}
            className={`bg-white rounded-2xl border p-4 flex flex-col min-h-[400px] ${
              isToday ? 'border-[#ff5757] ring-1 ring-[#ff5757]/15 bg-[#ff5757]/2' : 'border-slate-100'
            }`}
          >
            <div className="border-b border-slate-100 pb-2 mb-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className={`text-base font-bold rounded-full w-8 h-8 inline-flex items-center justify-center font-display ${
                isToday ? 'bg-[#ff5757] text-white' : 'text-slate-800'
              }`}>
                {dayDate.getDate()}
              </span>
            </div>

            <div className="flex-1 space-y-2.5">
              {dayApts.length > 0 ? (
                dayApts.map(apt => {
                  const cl = centerClients.find(c => c.id === apt.clientId);
                  const srv = services.find(s => s.id === apt.serviceId);
                  const isSelected = selectedIds.includes(apt.id);
                  const hourPart = apt.dateTime.split('T')[1] || '';

                  return (
                    <div
                      key={apt.id}
                      className={`p-2.5 rounded-xl border text-[11px] relative group transition ${
                        isSelected
                          ? 'bg-[#ff5757]/5 border-[#ff5757]'
                          : 'bg-slate-50 border-slate-100/70 hover:bg-white hover:border-slate-200 hover:shadow-xs'
                      }`}
                    >
                      <button
                        onClick={() => onToggleSelectOne(apt.id)}
                        className="absolute top-1.5 right-1.5 text-slate-400 hover:text-[#ff5757] opacity-60 hover:opacity-100 cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="h-3.5 w-3.5 text-[#ff5757]" /> : <Square className="h-3.5 w-3.5" />}
                      </button>

                      <span className="font-mono font-bold text-slate-500 block mb-0.5">{hourPart}</span>
                      <div className="font-bold text-[#353535] truncate max-w-[90%]">
                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {srv?.name || 'Soin'}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          apt.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : apt.status === 'booked'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-400'
                        }`}>
                          {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                        </span>

                        <div className="flex gap-0.5">
                          <button
                            onClick={() => onViewAppointment(apt)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Voir"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onEditAppointment(apt)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-6 text-slate-300 italic text-[10px]">
                  <span>Aucun RDV</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onBookingDateFilterChange(dateStr);
                onBookAppointmentClick();
              }}
              className="mt-3 py-1.5 border border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer bg-slate-50/30 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" /> Planifier
            </button>
          </div>
        );
      })}
    </div>
  );
}
