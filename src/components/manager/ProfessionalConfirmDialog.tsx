import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ProfessionalConfirmTone = 'danger' | 'warning' | 'default';

type ProfessionalConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ProfessionalConfirmTone;
  loading?: boolean;
  id?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

function getToneConfig(tone: ProfessionalConfirmTone) {
  if (tone === 'danger') {
    return {
      Icon: Trash2,
      iconClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
      confirmClass: 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20',
      eyebrowClass: 'text-rose-600',
      eyebrow: 'Action definitive',
    };
  }

  if (tone === 'warning') {
    return {
      Icon: AlertTriangle,
      iconClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      confirmClass: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20',
      eyebrowClass: 'text-amber-600',
      eyebrow: 'Confirmation requise',
    };
  }

  return {
    Icon: CheckCircle2,
    iconClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    confirmClass: 'bg-[#353535] text-white hover:bg-black shadow-slate-950/20',
    eyebrowClass: 'text-slate-500',
    eyebrow: 'Confirmation',
  };
}

export function ProfessionalConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'default',
  loading = false,
  id = 'professional-confirm-dialog',
  onConfirm,
  onCancel,
}: ProfessionalConfirmDialogProps) {
  const config = getToneConfig(tone);
  const Icon = config.Icon;

  useEffect(() => {
    if (!open || loading) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) {
              onCancel();
            }
          }}
        >
          <motion.div
            id={id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${config.eyebrowClass}`}>
                  {config.eyebrow}
                </p>
                <h3 id={`${id}-title`} className="mt-1 text-base font-extrabold leading-6 tracking-normal text-slate-950">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                aria-label="Fermer la confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 sm:px-5">
              <p id={`${id}-description`} className="text-sm font-semibold leading-6 text-slate-600">
                {description}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold shadow-lg transition disabled:cursor-wait disabled:opacity-75 cursor-pointer ${config.confirmClass}`}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
