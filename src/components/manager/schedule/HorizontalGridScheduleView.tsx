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
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
            <tr>
              <th className="p-4 w-32 border-r border-slate-100 bg-slate-100/50 sticky left-0 z-10">Jour / Semaine</th>
              {timelineHours.map(hour => (
                <th key={hour} className="p-3 border-r border-slate-100 text-center w-28">
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className="h-3 w-3 text-[#ff5757]" />
                    <span className="font-mono font-bold text-slate-700">{hour}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {getWeekDates(focusedDate).map((dayDate) => {
              const dateStr = formatDateToYYYYMMDD(dayDate);
              const isToday = dateStr === getTodayDateString();

              return (
                <tr key={dateStr} className={`group ${isToday ? 'bg-[#ff5757]/2' : 'hover:bg-slate-50/20'}`}>
                  <td className={`p-4 border-r border-slate-100 font-bold bg-white sticky left-0 z-10 shadow-sm ${
                    isToday ? 'text-[#ff5757]' : 'text-[#353535]'
                  }`}>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {dayDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </span>
                      <span className="text-sm font-display">{dayDate.getDate()} {monthsShort[dayDate.getMonth()]}</span>
                    </div>
                  </td>

                  {timelineHours.map(hour => {
                    const cellApts = getAppointmentsForDayAndHour(dateStr, hour);

                    return (
                      <td key={hour} className="p-2 border-r border-slate-100 align-top relative min-h-[90px] w-28">
                        <div className="space-y-1.5 h-full flex flex-col justify-between">
                          {cellApts.length > 0 ? (
                            cellApts.map(appointment => {
                              const client = centerClients.find(candidate => candidate.id === appointment.clientId);
                              const service = services.find(candidate => candidate.id === appointment.serviceId);
                              const isSelected = selectedIds.includes(appointment.id);
                              const exactTime = appointment.dateTime.split('T')[1] || '';

                              return (
                                <div
                                  key={appointment.id}
                                  className={`p-2 rounded-xl border text-[10px] transition-all relative ${
                                    isSelected
                                      ? 'bg-[#ff5757]/10 border-[#ff5757]'
                                      : 'bg-slate-50 border-slate-100/80 hover:border-slate-300'
                                  }`}
                                >
                                  <button
                                    onClick={() => onToggleSelectOne(appointment.id)}
                                    className="absolute top-1 right-1 text-slate-400 hover:text-[#ff5757] cursor-pointer"
                                  >
                                    {isSelected ? <CheckSquare className="h-3 w-3 text-[#ff5757]" /> : <Square className="h-3 w-3" />}
                                  </button>

                                  <span className="font-mono font-extrabold text-slate-500 block text-[9px]">{exactTime}</span>
                                  <div className="font-bold text-[#353535] truncate mb-0.5">
                                    {client ? `${client.firstName} ${client.lastName}` : 'Adhérent'}
                                  </div>
                                  <span className="text-[9px] text-slate-500 block truncate">{service?.name || 'Soin'}</span>

                                  <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold">
                                    <span className={`px-1 py-0.2 rounded-sm ${
                                      appointment.status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : appointment.status === 'booked'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-slate-200 text-slate-400'
                                    }`}>
                                      {appointment.status === 'completed' ? 'Ok' : appointment.status === 'booked' ? 'Plan' : 'An'}
                                    </span>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => onViewAppointment(appointment)}
                                        className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                                        title="Détails"
                                      >
                                        <Eye className="h-3 w-3" />
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
