/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Appointment, Client, Service } from '../../../types';

interface MonthGridDay {
  date: Date;
  isCurrentMonth: boolean;
}

interface MonthScheduleViewProps {
  focusedDate: Date;
  weekDays: string[];
  appointmentsToRender: Appointment[];
  centerClients: Client[];
  services: Service[];
  getMonthGrid: (referenceDate: Date) => MonthGridDay[];
  formatDateToYYYYMMDD: (date: Date) => string;
  getTodayDateString: () => string;
  onOpenDay: (date: Date) => void;
}

export function MonthScheduleView({
  focusedDate,
  weekDays,
  appointmentsToRender,
  centerClients,
  services,
  getMonthGrid,
  formatDateToYYYYMMDD,
  getTodayDateString,
  onOpenDay,
}: MonthScheduleViewProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs space-y-4 overflow-hidden">
      <div className="grid grid-cols-7 gap-1.5 text-center font-black text-slate-800 uppercase text-[10px] tracking-wider border-b-2 border-slate-200 pb-2.5">
        {weekDays.map(day => <span key={day}>{day}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {getMonthGrid(focusedDate).map(({ date, isCurrentMonth }, index) => {
          const dateStr = formatDateToYYYYMMDD(date);
          const isToday = dateStr === getTodayDateString();
          const dayApts = appointmentsToRender.filter(appointment => appointment.dateTime.startsWith(dateStr));

          return (
            <div
              key={`${dateStr}-${index}`}
              onClick={() => onOpenDay(date)}
              className={`min-h-[100px] p-2 border-2 rounded-xl flex flex-col justify-between transition cursor-pointer ${
                isToday
                  ? 'border-[#0284c7] bg-[#0284c7]/10 ring-2 ring-[#0284c7]/20 hover:bg-[#0284c7]/15'
                  : isCurrentMonth
                    ? 'border-slate-200 bg-white hover:border-[#0284c7] hover:shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 opacity-40 hover:opacity-80'
              }`}
            >
              <span className={`text-xs font-black self-end w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? 'bg-[#0284c7] text-white shadow-sm' : 'text-slate-900 bg-slate-100'
              }`}>
                {date.getDate()}
              </span>

              <div className="space-y-1 mt-1 text-left flex-1 flex flex-col justify-end">
                {dayApts.length > 0 ? (
                  <>
                    {dayApts.slice(0, 2).map(appointment => {
                      const client = centerClients.find(candidate => candidate.id === appointment.clientId);
                      const service = services.find(candidate => candidate.id === appointment.serviceId);
                      const hourPart = appointment.dateTime.split('T')[1] || '';

                      return (
                        <div
                          key={appointment.id}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md truncate flex items-center gap-1.5 shadow-2xs ${
                            appointment.status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : appointment.status === 'booked'
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-500 text-white'
                          }`}
                          title={client ? `${hourPart} - ${client.firstName} ${client.lastName} (${service?.name})` : ''}
                        >
                          <span className="font-mono text-[9px] font-black opacity-90">{hourPart}</span>
                          <span className="truncate">{client ? `${client.firstName} ${client.lastName}` : 'Adhérent'}</span>
                        </div>
                      );
                    })}

                    {dayApts.length > 2 && (
                      <div className="text-[9px] font-black text-slate-900 text-center uppercase bg-slate-100 py-0.5 rounded border border-slate-300">
                        +{dayApts.length - 2} autres RDV
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
