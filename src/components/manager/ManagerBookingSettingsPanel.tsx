/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, RotateCcw, Save, Trash2, Zap } from 'lucide-react';
import { Center } from '../../types';
import {
  BOOKING_DAY_KEYS,
  BookingDayKey,
  CenterCapacity,
  TimeRange,
  WeeklyOpeningHours,
  getCenterBookingCapacity,
  getCenterWeeklyOpeningHours,
  getDefaultCenterBookingCapacity,
  getDefaultCenterWeeklyOpeningHours,
} from '../../lib/bookingCapacityRules';

const DAY_LABELS: Array<{ key: BookingDayKey; label: string }> = [
  { key: '0', label: 'Dimanche' },
  { key: '1', label: 'Lundi' },
  { key: '2', label: 'Mardi' },
  { key: '3', label: 'Mercredi' },
  { key: '4', label: 'Jeudi' },
  { key: '5', label: 'Vendredi' },
  { key: '6', label: 'Samedi' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00',
];
const START_OPTIONS = TIME_OPTIONS.slice(0, -1);

type BookingSettingsPayload = {
  bookingCapacity: Center['bookingCapacity'];
  bookingHours: Center['bookingHours'];
};

type SaveResult = {
  ok: boolean;
  error?: string;
};

interface ManagerBookingSettingsPanelProps {
  currentCenter: Center;
  onSave: (settings: BookingSettingsPayload) => Promise<SaveResult>;
}

function minutes(value: string): number {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function nextHour(value: string): string {
  const index = TIME_OPTIONS.indexOf(value);
  return TIME_OPTIONS[Math.min(index + 1, TIME_OPTIONS.length - 1)] || '10:00';
}

function cloneWeeklyHours(hours: WeeklyOpeningHours): WeeklyOpeningHours {
  const next: WeeklyOpeningHours = {};
  for (const key of BOOKING_DAY_KEYS) {
    const ranges = hours[key] ?? [];
    if (ranges.length > 0) {
      next[key] = ranges.map(range => ({ start: range.start, end: range.end }));
    }
  }
  return next;
}

function sanitizeCapacity(capacity: CenterCapacity): CenterCapacity {
  return {
    aq8: Math.max(0, Math.min(20, Math.floor(Number(capacity.aq8) || 0))),
    wonder: Math.max(0, Math.min(20, Math.floor(Number(capacity.wonder) || 0))),
  };
}

function sanitizeHours(hours: WeeklyOpeningHours): Center['bookingHours'] {
  const next: Center['bookingHours'] = {};

  for (const key of BOOKING_DAY_KEYS) {
    const ranges = (hours[key] ?? [])
      .filter(range => START_OPTIONS.includes(range.start) && TIME_OPTIONS.includes(range.end) && minutes(range.end) > minutes(range.start))
      .sort((a, b) => minutes(a.start) - minutes(b.start));

    if (ranges.length > 0) {
      next[key] = ranges.map(range => ({ start: range.start, end: range.end }));
    }
  }

  return next;
}

export function ManagerBookingSettingsPanel({
  currentCenter,
  onSave,
}: ManagerBookingSettingsPanelProps) {
  const [capacity, setCapacity] = useState<CenterCapacity>(() => getCenterBookingCapacity(currentCenter.id, currentCenter));
  const [hours, setHours] = useState<WeeklyOpeningHours>(() => cloneWeeklyHours(getCenterWeeklyOpeningHours(currentCenter.id, currentCenter)));
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setCapacity(getCenterBookingCapacity(currentCenter.id, currentCenter));
    setHours(cloneWeeklyHours(getCenterWeeklyOpeningHours(currentCenter.id, currentCenter)));
    setLocalError('');
  }, [currentCenter]);

  const openDaysCount = useMemo(() => (
    BOOKING_DAY_KEYS.filter(key => (hours[key] ?? []).length > 0).length
  ), [hours]);

  const updateCapacity = (key: keyof CenterCapacity, value: string) => {
    const numeric = Math.max(0, Math.min(20, Number(value) || 0));
    setCapacity(prev => ({ ...prev, [key]: numeric }));
  };

  const setDayOpen = (key: BookingDayKey, open: boolean) => {
    setHours(prev => {
      const next = cloneWeeklyHours(prev);
      if (!open) {
        delete next[key];
        return next;
      }

      next[key] = next[key]?.length ? next[key] : [{ start: '09:00', end: '18:00' }];
      return next;
    });
  };

  const updateRange = (key: BookingDayKey, index: number, patch: Partial<TimeRange>) => {
    setHours(prev => {
      const next = cloneWeeklyHours(prev);
      const ranges = [...(next[key] ?? [])];
      const current = ranges[index] || { start: '09:00', end: '18:00' };
      const updated = { ...current, ...patch };
      if (minutes(updated.end) <= minutes(updated.start)) {
        updated.end = nextHour(updated.start);
      }
      ranges[index] = updated;
      next[key] = ranges;
      return next;
    });
  };

  const addRange = (key: BookingDayKey) => {
    setHours(prev => {
      const next = cloneWeeklyHours(prev);
      const ranges = [...(next[key] ?? [])];
      const lastRange = ranges[ranges.length - 1];
      const start = lastRange?.end && START_OPTIONS.includes(lastRange.end) ? lastRange.end : '09:00';
      const end = nextHour(start);
      ranges.push({ start, end });
      next[key] = ranges;
      return next;
    });
  };

  const removeRange = (key: BookingDayKey, index: number) => {
    setHours(prev => {
      const next = cloneWeeklyHours(prev);
      const ranges = [...(next[key] ?? [])];
      ranges.splice(index, 1);
      if (ranges.length > 0) {
        next[key] = ranges;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const restoreDefaults = () => {
    setCapacity(getDefaultCenterBookingCapacity(currentCenter.id));
    setHours(cloneWeeklyHours(getDefaultCenterWeeklyOpeningHours(currentCenter.id)));
    setLocalError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setLocalError('');

    const result = await onSave({
      bookingCapacity: sanitizeCapacity(capacity),
      bookingHours: sanitizeHours(hours),
    });

    if (!result.ok) {
      setLocalError(result.error || 'Enregistrement impossible.');
    }

    setSaving(false);
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5757]/10 text-[#ff5757]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-slate-800">Parametres de reservation</h3>
            <p className="text-[11px] font-medium leading-relaxed text-slate-500">
              Horaires publics, jours ouverts et capacite d'accueil par heure pour ce centre.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5757] px-4 py-2 text-[11px] font-bold text-white shadow-sm shadow-[#ff5757]/20 transition hover:bg-[#e94949] disabled:opacity-60 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {localError && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {localError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-slate-500">
            <Zap className="h-3.5 w-3.5 text-[#ff5757]" /> AQ8 par heure
          </div>
          <input
            type="number"
            min={0}
            max={20}
            value={capacity.aq8}
            onChange={(event) => updateCapacity('aq8', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 outline-none focus:border-[#ff5757]"
          />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-slate-500">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Wonder par heure
          </div>
          <input
            type="number"
            min={0}
            max={20}
            value={capacity.wonder}
            onChange={(event) => updateCapacity('wonder', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 outline-none focus:border-[#ff5757]"
          />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 text-[11px] font-bold uppercase text-slate-500">Jours ouverts</div>
          <div className="font-mono text-2xl font-bold text-slate-800">{openDaysCount}/7</div>
          <p className="mt-1 text-[10px] font-medium text-slate-500">Les jours fermes disparaissent du formulaire public.</p>
        </div>
      </div>

      <div className="space-y-3">
        {DAY_LABELS.map(day => {
          const ranges = hours[day.key] ?? [];
          const isOpen = ranges.length > 0;

          return (
            <div key={day.key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <label className="flex min-w-32 items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={(event) => setDayOpen(day.key, event.target.checked)}
                    className="h-4 w-4 accent-[#ff5757]"
                  />
                  {day.label}
                </label>

                <div className="flex-1 space-y-2">
                  {!isOpen ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-400">
                      Ferme
                    </div>
                  ) : (
                    <>
                      {ranges.map((range, index) => (
                        <div key={`${day.key}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <select
                            value={range.start}
                            onChange={(event) => updateRange(day.key, index, { start: event.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 font-mono text-[11px] font-bold text-slate-700 outline-none focus:border-[#ff5757]"
                          >
                            {START_OPTIONS.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <select
                            value={range.end}
                            onChange={(event) => updateRange(day.key, index, { end: event.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 font-mono text-[11px] font-bold text-slate-700 outline-none focus:border-[#ff5757]"
                          >
                            {TIME_OPTIONS.filter(option => minutes(option) > minutes(range.start)).map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRange(day.key, index)}
                            className="rounded-lg border border-rose-100 bg-white px-2 text-rose-500 transition hover:bg-rose-50 cursor-pointer"
                            title="Supprimer cette plage"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRange(day.key)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une plage
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
