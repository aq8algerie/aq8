/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle2, CheckSquare, Clock, Edit2, Eye, Square, Trash2, XCircle } from 'lucide-react';
import { Appointment, Client, Package, Service } from '../../../types';
import { getSlotAvailability } from '../../../lib/bookingCapacityRules';

type PackageType = Package['type'];

interface DayScheduleViewProps {
  timelineHours: string[];
  focusedDate: Date;
  centerId: string;
  centerAppointments: Appointment[];
  centerClients: Client[];
  services: Service[];
  selectedIds: string[];
  formatDateToYYYYMMDD: (date: Date) => string;
  getAppointmentsForDayAndHour: (dateStr: string, hourStr: string) => Appointment[];
  getTechnologyForClient: (clientId: string) => PackageType | null;
  onToggleSelectOne: (id: string) => void;
  onViewAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCompleteAppointment: (id: string) => void | Promise<void>;
  onCancelAppointment: (id: string) => void | Promise<void>;
  onDeleteAppointment: (id: string) => void;
}

export function DayScheduleView({
  timelineHours,
  focusedDate,
  centerId,
  centerAppointments,
  centerClients,
  services,
  selectedIds,
  formatDateToYYYYMMDD,
  getAppointmentsForDayAndHour,
  getTechnologyForClient,
  onToggleSelectOne,
  onViewAppointment,
  onEditAppointment,
  onCompleteAppointment,
  onCancelAppointment,
  onDeleteAppointment,
}: DayScheduleViewProps) {
  const dateStr = formatDateToYYYYMMDD(focusedDate);

  if (timelineHours.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Centre ferme ce jour selon les horaires configures.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
      {timelineHours.map((hour) => {
        const hourApts = getAppointmentsForDayAndHour(dateStr, hour);
        const aq8Availability = getSlotAvailability(centerAppointments, services, centerId, `${dateStr}T${hour}`, 'aq8');
        const wonderAvailability = getSlotAvailability(centerAppointments, services, centerId, `${dateStr}T${hour}`, 'wonder');

        return (
          <div key={hour} className="flex gap-4 items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0 text-xs">
            <div className="shrink-0 w-28 pt-1 space-y-1">
              <div className="font-mono font-bold text-slate-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-300" />
                <span>{hour}</span>
              </div>
              <div className="flex flex-col gap-1 text-[9px] font-bold">
                <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-600">AQ8 {aq8Availability.remaining}/{aq8Availability.capacity}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">Wonder {wonderAvailability.remaining}/{wonderAvailability.capacity}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {hourApts.length > 0 ? (
                hourApts.map(apt => {
                  const cl = centerClients.find(c => c.id === apt.clientId);
                  const srv = services.find(s => s.id === apt.serviceId);
                  const isSelected = selectedIds.includes(apt.id);
                  const tech = cl ? getTechnologyForClient(cl.id) : null;

                  return (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#ff5757]/5 border-[#ff5757] shadow-sm'
                          : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleSelectOne(apt.id)}
                          className="text-slate-400 hover:text-[#ff5757] pt-0.5 cursor-pointer"
                        >
                          {isSelected ? <CheckSquare className="h-4.5 w-4.5 text-[#ff5757]" /> : <Square className="h-4.5 w-4.5" />}
                        </button>
                        <div className="space-y-1">
                          <div className="font-bold text-[#353535] flex items-center gap-1.5">
                            <span>{cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}</span>
                            {cl?.gender === 'F' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Femme"></span>
                            ) : cl?.gender === 'H' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Homme"></span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">{srv?.name || 'Soin'}</span>
                            <span>•</span>
                            <span className="font-mono">{apt.duration} min</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{cl?.phone}</span>
                          </div>
                          {apt.notes && (
                            <p className="text-[10px] text-slate-400 italic font-medium">"{apt.notes}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        {tech && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            tech === 'aq8'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : tech === 'wonder'
                                ? 'bg-slate-100 text-slate-800'
                                : 'bg-slate-50 text-slate-500'
                          }`}>
                            {tech === 'aq8' ? 'AQ8 EMS' : tech === 'wonder' ? 'Wonder' : 'Mixte'}
                          </span>
                        )}

                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'completed'
                            ? 'bg-green-50 text-green-600'
                            : apt.status === 'booked'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          {apt.status === 'completed' ? 'Effectuée' : apt.status === 'booked' ? 'Planifiée' : 'Annulée'}
                        </span>

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                          <button
                            onClick={() => onViewAppointment(apt)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditAppointment(apt)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {apt.status === 'booked' && (
                            <>
                              <button
                                onClick={() => onCompleteAppointment(apt.id)}
                                className="p-1 text-green-500 hover:text-green-700 rounded hover:bg-green-50 transition cursor-pointer"
                                title="Effectuer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onCancelAppointment(apt.id)}
                                className="p-1 text-amber-500 hover:text-amber-700 rounded hover:bg-amber-50 transition cursor-pointer"
                                title="Annuler"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onDeleteAppointment(apt.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-2.5 text-slate-300 italic text-[11px] flex items-center gap-1.5">
                  <span>Créneau disponible</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
