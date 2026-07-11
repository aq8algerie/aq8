/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { Center } from '../../types';

interface ManagerTopBannerProps {
  currentCenter: Center;
}

export function ManagerTopBanner({ currentCenter }: ManagerTopBannerProps) {
  return (
    <div id="manager-top-banner" className="p-4 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-xs border border-slate-800">
      <div>
        <span className="text-[9px] font-bold text-[#ff5757] uppercase tracking-wider block">Espace de Gestion</span>
        <h2 className="text-lg font-bold font-display">{currentCenter.name} - {currentCenter.city}</h2>
      </div>
      <div className="flex gap-2 text-xs font-semibold text-slate-300">
        <span className="bg-slate-800 py-1 px-2.5 rounded-lg border border-white/5 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-[#ff5757]" /> {currentCenter.schedule}
        </span>
      </div>
    </div>
  );
}
