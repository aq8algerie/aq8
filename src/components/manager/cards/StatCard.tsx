/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  trend?: {
    text: string;
    isPositive?: boolean;
  };
  borderLeftClass?: string;
}

export function StatCard({
  id,
  title,
  value,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  trend,
  borderLeftClass
}: StatCardProps) {
  return (
    <div id={id} className={`bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${borderLeftClass || 'border-l-4 border-l-slate-400'}`}>
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{title}</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl sm:text-2xl font-bold font-display text-slate-800">{value}</span>
          <div className={`p-1.5 rounded-lg ${iconBgClass} ${iconColorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-rose-500'} mt-1`}>
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}
