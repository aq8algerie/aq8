/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckSquare, Clock, Eye, Plus, Square } from 'lucide-react';
import { Appointment, Client, Service } from '../../../types';

interface HorizontalGridScheduleViewProps {
  focusedDate: Date;
  timelineHours: string[];
  monthsShort: string[];
  centerClients: Client[];
  services: Service[];
  selectedIds: string[];
  getWeekDates: (refDate: Date) => Date[];
  formatDateToYYYYMMDD: (date: Date) => string;
  getTodayDateString: () => string;
  getAppointmentsForDayAndHour: (dateStr: string, hourStr: string) => Appointment[];
  onToggleSelectOne: (id: string) => void;
  onViewAppointment: (appointment: Appointment) => void;
  onBookingDateFilterChange: (date: string) => void;
  onBookAppointmentClick: () => void;
}

export function HorizontalGridScheduleView({
  focusedDate,
  timelineHours,
  monthsShort,
  centerClients,
  services,
  selectedIds,
  getWeekDates,
  formatDateToYYYYMMDD,
  getTodayDateString,
  getAppointmentsForDayAndHour,
  onToggleSelectOne,
  onViewAppointment,
  onBookingDateFilterChange,
  onBookAppointmentClick,
}: HorizontalGridScheduleViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[950px] border-collapse">
          <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider border-b-2 border-slate-200">
            <tr>
              <th className="p-4 w-36 border-r-2 border-slate-200 bg-slate-200/70 sticky left-0 z-10 font-black text-slate-900">Jour / Semaine</th>
              {timelineHours.map(hour => (
                <th key={hour} className="p-3 border-r border-slate-200 text-center w-32">
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className="h-3.5 w-3.5 text-[#0284c7]" />
                    <span className="font-mono font-extrabold text-[#0284c7] text-xs">{hour}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-200 text-slate-900">
            {getWeekDates(focusedDate).map((dayDate) => {
              const dateStr = formatDateToYYYYMMDD(dayDate);
              const isToday = dateStr === getTodayDateString();

              return (
                <tr key={dateStr} className={`group ${isToday ? 'bg-[#0284c7]/5' : 'hover:bg-slate-50/50'}`}>
                  <td className={`p-4 border-r-2 border-slate-200 font-black bg-white sticky left-0 z-10 shadow-md ${
                    isToday ? 'text-[#0284c7]' : 'text-slate-900'
                  }`}>
                    <div className="space-y-0.5">
                      <span className="text-[11px] uppercase font-black text-slate-600 block">
                        {dayDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </span>
                      <span className="text-base font-black font-display text-slate-900">{dayDate.getDate()} {monthsShort[dayDate.getMonth()]}</span>
                    </div>
                  </td>

                  {timelineHours.map(hour => {
                    const cellApts = getAppointmentsForDayAndHour(dateStr, hour);

                    return (
                      <td key={hour} className="p-2 border-r border-slate-200 align-top relative min-h-[95px] w-32">
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          {cellApts.length > 0 ? (
                            cellApts.map(appointment => {
                              const client = centerClients.find(candidate => candidate.id === appointment.clientId);
                              const service = services.find(candidate => candidate.id === appointment.serviceId);
                              const isSelected = selectedIds.includes(appointment.id);
                              const exactTime = appointment.dateTime.split('T')[1] || '';

                              return (
                                <div
                                  key={appointment.id}
                                  className={`p-2.5 rounded-xl border-2 text-xs transition-all relative shadow-xs ${
                                    isSelected
                                      ? 'bg-[#0284c7]/15 border-[#0284c7] shadow-md'
                                      : 'bg-white border-slate-300 hover:border-[#0284c7]'
                                  }`}
                                >
                                  <button
                                    onClick={() => onToggleSelectOne(appointment.id)}
                                    className="absolute top-1.5 right-1.5 text-slate-400 hover:text-[#0284c7] cursor-pointer"
                                  >
                                    {isSelected ? <CheckSquare className="h-4 w-4 text-[#0284c7]" /> : <Square className="h-4 w-4 text-slate-400" />}
                                  </button>

                                  <span className="font-mono font-extrabold text-[#0284c7] block text-[10px] bg-[#0284c7]/10 px-1.5 py-0.2 rounded w-fit mb-1">{exactTime}</span>
                                  <div className="font-black text-slate-900 truncate mb-0.5 text-xs">
                                    {client ? `${client.firstName} ${client.lastName}` : 'Adhérent'}
                                  </div>
                                  <span className="text-[10px] text-slate-700 font-extrabold block truncate">{service?.name || 'Soin'}</span>

                                  <div className="mt-2 flex items-center justify-between text-[9px] font-black">
                                    <span className={`px-1.5 py-0.5 rounded-md ${
                                      appointment.status === 'completed'
                                        ? 'bg-emerald-600 text-white'
                                        : appointment.status === 'booked'
                                          ? 'bg-sky-600 text-white'
                                          : 'bg-slate-400 text-white'
                                    }`}>
                                      {appointment.status === 'completed' ? 'Ok' : appointment.status === 'booked' ? 'Plan' : 'An'}
                                    </span>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => onViewAppointment(appointment)}
                                        className="p-1 text-slate-600 hover:text-slate-900 rounded transition cursor-pointer"
                                        title="Détails"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <button
                              onClick={() => {
                                onBookingDateFilterChange(dateStr);
                                onBookAppointmentClick();
                              }}
                              className="w-full h-full min-h-[48px] border border-dashed border-transparent hover:border-slate-200 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 text-xs font-bold transition cursor-pointer bg-slate-50/10 hover:bg-slate-50/50"
                              title="Planifier à ce créneau"
                            >
                              <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:opacity-100 transition" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
