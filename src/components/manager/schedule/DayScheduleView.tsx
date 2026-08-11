/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle2, CheckSquare, Clock, Edit2, Eye, PhoneCall, Square, XCircle } from 'lucide-react';
import { Appointment, Center, Client, Package, Service } from '../../../types';
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
  currentCenter: Center;
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
  currentCenter,
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
        const aq8Availability = getSlotAvailability(centerAppointments, services, centerId, `${dateStr}T${hour}`, 'aq8', undefined, currentCenter);
        const wonderAvailability = getSlotAvailability(centerAppointments, services, centerId, `${dateStr}T${hour}`, 'wonder', undefined, currentCenter);

        return (
          <div key={hour} className="flex gap-4 items-start border-b border-slate-200 pb-4 last:border-0 last:pb-0 text-xs">
            <div className="shrink-0 w-32 pt-1 space-y-1.5">
              <div className="font-mono font-extrabold text-sm text-[#0284c7] flex items-center gap-1.5 bg-[#0284c7]/10 px-2.5 py-1 rounded-lg border border-[#0284c7]/20 w-fit">
                <Clock className="h-4 w-4 text-[#0284c7]" />
                <span>{hour}</span>
              </div>
              <div className="flex flex-col gap-1 text-[10px] font-black">
                <span className="rounded-md bg-sky-100 border border-sky-300 px-2 py-0.5 text-sky-900 shadow-xs">AQ8 {aq8Availability.remaining}/{aq8Availability.capacity} dispo</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-white shadow-xs">Wonder {wonderAvailability.remaining}/{wonderAvailability.capacity} dispo</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {hourApts.length > 0 ? (
                hourApts.map(apt => {
                  const cl = centerClients.find(c => c.id === apt.clientId);
                  const srv = services.find(s => s.id === apt.serviceId);
                  const isSelected = selectedIds.includes(apt.id);
                  const tech = cl ? getTechnologyForClient(cl.id) : null;

                  return (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#0284c7]/10 border-[#0284c7] shadow-md ring-2 ring-[#0284c7]/20'
                          : 'bg-white border-slate-300 hover:border-[#0284c7] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleSelectOne(apt.id)}
                          className="text-slate-400 hover:text-[#0284c7] pt-0.5 cursor-pointer"
                        >
                          {isSelected ? <CheckSquare className="h-5 w-5 text-[#0284c7]" /> : <Square className="h-5 w-5 text-slate-400" />}
                        </button>
                        <div className="space-y-1">
                          <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                            <span>{cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}</span>
                            {cl?.gender === 'F' ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-pink-100 border border-pink-300 text-pink-700 text-[10px] font-bold">Femme</span>
                            ) : cl?.gender === 'H' ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-[10px] font-bold">Homme</span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 font-bold">
                            <span className="font-extrabold text-[#0284c7]">{srv?.name || 'Soin'}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-900">{apt.duration} min</span>
                            {cl?.phone && (
                              <>
                                <span>•</span>
                                <a
                                  href={`tel:${cl.phone}`}
                                  className="inline-flex items-center gap-1 font-mono text-slate-900 bg-slate-100 hover:bg-[#0284c7] hover:text-white px-2 py-0.5 rounded border border-slate-200 transition cursor-pointer font-bold shadow-2xs"
                                  title="Appeler le client"
                                >
                                  <PhoneCall className="h-3 w-3 text-[#0284c7] group-hover:text-white" />
                                  <span>{cl.phone}</span>
                                </a>
                              </>
                            )}
                          </div>
                          {apt.notes && (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded font-semibold italic">"{apt.notes}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        {tech && (
                          <span className={`px-2.5 py-1 rounded-md text-xs font-black shadow-xs ${
                            tech === 'aq8'
                              ? 'bg-sky-100 text-sky-900 border border-sky-300'
                              : tech === 'wonder'
                                ? 'bg-slate-900 text-white'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {tech === 'aq8' ? 'AQ8 EMS' : tech === 'wonder' ? 'Wonder' : 'Mixte'}
                          </span>
                        )}

                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-black shadow-xs ${
                          apt.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : apt.status === 'booked'
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-400 text-white'
                        }`}>
                          {apt.status === 'completed' ? '✓ Effectuée' : apt.status === 'booked' ? '📅 Planifiée' : '✕ Annulée'}
                        </span>

                        <div className="flex items-center gap-1 border-l-2 border-slate-200 pl-3">
                          <button
                            onClick={() => onViewAppointment(apt)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Voir"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditAppointment(apt)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {apt.status === 'booked' && (
                            <>
                              <button
                                onClick={() => onCompleteAppointment(apt.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Valider comme Effectuée"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onCancelAppointment(apt.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Annuler"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-2.5 text-slate-400 font-semibold italic text-xs flex items-center gap-2 bg-slate-50/50 px-3 rounded-lg border border-dashed border-slate-200">
                  <span>Libre — Créneau disponible</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
