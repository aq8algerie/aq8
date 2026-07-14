/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Sparkles, Trash2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ScheduleBulkActionsBarProps {
  selectedCount: number;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function ScheduleBulkActionsBar({
  selectedCount,
  onComplete,
  onCancel,
  onDelete,
  onClearSelection,
}: ScheduleBulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <motion.div
      id="bulk-actions-schedule"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#353535] text-white p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl border border-slate-700/50"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="p-1 bg-white/10 rounded-lg text-[#ff5757]">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="font-bold">
          {selectedCount} sélection{selectedCount > 1 ? 's' : ''} dans le planning
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={onComplete}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Effectuer
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
        >
          <XCircle className="h-3.5 w-3.5" /> Annuler séances
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </button>
        <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 font-medium text-[10px] rounded-lg transition cursor-pointer"
        >
          Désélectionner
        </button>
      </div>
    </motion.div>
  );
}
