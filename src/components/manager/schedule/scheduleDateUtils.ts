/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduleViewType } from './ScheduleToolbar';

export interface MonthGridDay {
  date: Date;
  isCurrentMonth: boolean;
}

export const WEEK_DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const MONTHS_FR_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MONTHS_FR_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
];

export const TIMELINE_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekDates = (referenceDate: Date): Date[] => {
  const currentDay = referenceDate.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + distanceToMonday);

  const dates: Date[] = [];
  for (let index = 0; index < 7; index++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    dates.push(date);
  }
  return dates;
};

export const getWeekRangeLabel = (referenceDate: Date): string => {
  const week = getWeekDates(referenceDate);
  const start = week[0];
  const end = week[6];

  return `${start.getDate()} ${MONTHS_FR_SHORT[start.getMonth()]} - ${end.getDate()} ${MONTHS_FR_SHORT[end.getMonth()]} ${end.getFullYear()}`;
};

export const getMonthGrid = (referenceDate: Date): MonthGridDay[] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthGridDay[] = [];

  for (let index = startDayOfWeek - 1; index >= 0; index--) {
    cells.push({
      date: new Date(year, month - 1, totalDaysInPrevMonth - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= totalDaysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return cells;
};

export const getNavigatedScheduleDate = (
  focusedDate: Date,
  viewType: ScheduleViewType,
  direction: 'previous' | 'next',
): Date => {
  const nextDate = new Date(focusedDate);
  const multiplier = direction === 'previous' ? -1 : 1;

  if (viewType === 'day') {
    nextDate.setDate(focusedDate.getDate() + multiplier);
  } else if (viewType === 'week' || viewType === 'horizontal_grid') {
    nextDate.setDate(focusedDate.getDate() + (7 * multiplier));
  } else if (viewType === 'month') {
    nextDate.setMonth(focusedDate.getMonth() + multiplier);
  }

  return nextDate;
};
