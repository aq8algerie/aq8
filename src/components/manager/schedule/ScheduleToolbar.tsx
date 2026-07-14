/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, Plus, Search } from 'lucide-react';

export type ScheduleViewType = 'day' | 'week' | 'month' | 'horizontal_grid';

interface ScheduleToolbarProps {
  viewType: ScheduleViewType;
  focusedDate: Date;
  weekRangeLabel: string;
  monthLabel: string;
  searchTerm: string;
  onViewTypeChange: (viewType: ScheduleViewType) => void;
  onBookAppointmentClick: () => void;
  onNavPrev: () => void;
  onNavToday: () => void;
  onNavNext: () => void;
  onSearchTermChange: (value: string) => void;
}

export function ScheduleToolbar({
  viewType,
  focusedDate,
  weekRangeLabel,
  monthLabel,
  searchTerm,
  onViewTypeChange,
  onBookAppointmentClick,
  onNavPrev,
  onNavToday,
  onNavNext,
  onSearchTermChange,
}: ScheduleToolbarProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold font-display text-slate-800 text-base">Planning Interactif du Centre</h3>
          <p className="text-xs text-slate-500">
            Visualisez l'emploi du temps, alternez les vues Jour, Semaine, Mois, et Grille Horizontale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-600">
            <button
              id="btn-view-day"
              onClick={() => onViewTypeChange('day')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewType === 'day' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Jour
            </button>
            <button
              id="btn-view-week"
              onClick={() => onViewTypeChange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewType === 'week' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Hebdo
            </button>
            <button
              id="btn-view-month"
              onClick={() => onViewTypeChange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewType === 'month' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Mensuelle
            </button>
            <button
              id="btn-view-hgrid"
              onClick={() => onViewTypeChange('horizontal_grid')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewType === 'horizontal_grid' ? 'bg-[#353535] text-white shadow-xs' : 'hover:text-slate-900'
              }`}
              title="Grille Horizontale"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grille Horizontale
            </button>
          </div>

          <button
            id="btn-schedule-add-rdv"
            onClick={onBookAppointmentClick}
            className="px-3.5 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
          >
            <Plus className="h-4 w-4" /> Réserver Créneau
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-50">
        <div id="schedule-date-nav" className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-slate-200/70 bg-white overflow-hidden p-0.5">
            <button
              id="btn-nav-prev"
              onClick={onNavPrev}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              id="btn-nav-today"
              onClick={onNavToday}
              className="px-3 py-1 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer border-l border-r border-slate-100"
            >
              Aujourd'hui
            </button>
            <button
              id="btn-nav-next"
              onClick={onNavNext}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#353535]">
            <Calendar className="h-4 w-4 text-[#ff5757]" />
            <span className="font-bold font-display">
              {viewType === 'day' && (
                <span>
                  {focusedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              {(viewType === 'week' || viewType === 'horizontal_grid') && <span>Semaine du : {weekRangeLabel}</span>}
              {viewType === 'month' && <span className="capitalize">{monthLabel}</span>}
            </span>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par adhérent / soin..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-300 text-xs text-slate-700"
          />
        </div>
      </div>
    </div>
  );
}
