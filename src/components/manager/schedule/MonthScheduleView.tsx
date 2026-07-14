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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4 overflow-hidden">
      <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-100 pb-2">
        {weekDays.map(day => <span key={day}>{day}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {getMonthGrid(focusedDate).map(({ date, isCurrentMonth }, index) => {
          const dateStr = formatDateToYYYYMMDD(date);
          const isToday = dateStr === getTodayDateString();
          const dayApts = appointmentsToRender.filter(appointment => appointment.dateTime.startsWith(dateStr));

          return (
            <div
              key={`${dateStr}-${index}`}
              onClick={() => onOpenDay(date)}
              className={`min-h-[90px] p-2 border rounded-xl flex flex-col justify-between transition cursor-pointer ${
                isToday
                  ? 'border-[#ff5757] bg-[#ff5757]/2 hover:bg-[#ff5757]/5'
                  : isCurrentMonth
                    ? 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                    : 'border-slate-50 opacity-40 hover:opacity-70'
              }`}
            >
              <span className={`text-[11px] font-bold self-end w-5 h-5 flex items-center justify-center rounded-full ${
                isToday ? 'bg-[#ff5757] text-white' : 'text-slate-500'
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
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded truncate flex items-center gap-1 text-[#353535] ${
                            appointment.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : appointment.status === 'booked'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                          title={client ? `${hourPart} - ${client.firstName} ${client.lastName} (${service?.name})` : ''}
                        >
                          <span className="font-mono text-[8px] font-semibold">{hourPart}</span>
                          <span className="truncate">{client ? `${client.firstName} ${client.lastName}` : 'Adhérent'}</span>
                        </div>
                      );
                    })}

                    {dayApts.length > 2 && (
                      <div className="text-[8px] font-bold text-slate-400 text-center uppercase bg-slate-50 py-0.5 rounded border border-slate-100">
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
