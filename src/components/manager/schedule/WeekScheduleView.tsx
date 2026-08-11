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
            className={`bg-white rounded-2xl border-2 p-3.5 flex flex-col min-h-[420px] shadow-xs ${
              isToday ? 'border-[#0284c7] ring-2 ring-[#0284c7]/20 bg-[#0284c7]/5' : 'border-slate-200'
            }`}
          >
            <div className="border-b border-slate-200 pb-2 mb-3 text-center">
              <span className="text-[11px] uppercase font-black text-slate-700 block tracking-wider">
                {dayDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className={`text-base font-black rounded-full w-9 h-9 inline-flex items-center justify-center font-display mt-0.5 ${
                isToday ? 'bg-[#0284c7] text-white shadow-md' : 'text-slate-900 bg-slate-100'
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
                      className={`p-3 rounded-xl border-2 text-xs relative group transition-all ${
                        isSelected
                          ? 'bg-[#0284c7]/10 border-[#0284c7] shadow-md'
                          : 'bg-white border-slate-200 hover:border-[#0284c7] hover:shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => onToggleSelectOne(apt.id)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-[#0284c7] cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="h-4 w-4 text-[#0284c7]" /> : <Square className="h-4 w-4 text-slate-400" />}
                      </button>

                      <span className="font-mono font-extrabold text-[#0284c7] block mb-1 text-xs bg-[#0284c7]/10 px-2 py-0.5 rounded w-fit">{hourPart}</span>
                      <div className="font-black text-slate-900 truncate max-w-[85%] text-xs">
                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent'}
                      </div>
                      <div className="text-[11px] text-slate-700 font-extrabold truncate mt-0.5">
                        {srv?.name || 'Soin'}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                          apt.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : apt.status === 'booked'
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-400 text-white'
                        }`}>
                          {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                        </span>

                        <div className="flex gap-1">
                          <button
                            onClick={() => onViewAppointment(apt)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Voir"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onEditAppointment(apt)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
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
                <div className="h-full flex flex-col items-center justify-center py-6 text-slate-400 italic text-[11px] font-medium">
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
