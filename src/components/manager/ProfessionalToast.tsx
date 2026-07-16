import { AlertTriangle, Ban, CalendarCheck, CheckCircle2, CreditCard, FileCheck2, Info, PackageCheck, Ruler, Trash2, UserCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'cancelled'
  | 'completed'
  | 'payment'
  | 'package'
  | 'measurement'
  | 'booking-request'
  | 'bulk'
  | 'default';

export type ProfessionalToastState = {
  message: string;
  type?: ToastType;
  action?: ToastAction;
  title?: string;
};

type ProfessionalToastProps = {
  toast: ProfessionalToastState | null;
  onDismiss?: () => void;
  id?: string;
};

type ToastPresentation = {
  title: string;
  toneClass: string;
  iconWrapClass: string;
  progressClass: string;
  Icon: typeof CheckCircle2;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function inferAction(message: string, type: ToastType): ToastAction {
  const text = normalize(message);
  if (type === 'error') return 'default';
  if (text.includes('supprim')) return 'deleted';
  if (text.includes('annul')) return 'cancelled';
  if (text.includes('valid') || text.includes('credit') || text.includes('effectue')) return 'completed';
  if (text.includes('paiement') || text.includes('encaissement')) return 'payment';
  if (text.includes('forfait')) return 'package';
  if (text.includes('mensuration')) return 'measurement';
  if (text.includes('demande')) return 'booking-request';
  if (text.includes('mise a jour') || text.includes('modifi')) return 'updated';
  if (text.includes('adherent') || text.includes('client')) return 'created';
  if (text.includes('masse') || text.includes('selection')) return 'bulk';
  if (text.includes('rendez-vous') || text.includes('reservation') || text.includes('rdv')) return 'created';
  return 'default';
}

function getPresentation(toast: ProfessionalToastState): ToastPresentation {
  const type = toast.type || 'success';
  const action = toast.action || inferAction(toast.message, type);

  if (type === 'error') {
    return {
      title: toast.title || 'Action impossible',
      toneClass: 'border-rose-200 bg-white text-rose-950 shadow-rose-950/10',
      iconWrapClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
      progressClass: 'bg-rose-500',
      Icon: AlertTriangle,
    };
  }

  if (type === 'warning') {
    return {
      title: toast.title || 'Verification requise',
      toneClass: 'border-amber-200 bg-white text-amber-950 shadow-amber-950/10',
      iconWrapClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      progressClass: 'bg-amber-500',
      Icon: AlertTriangle,
    };
  }

  if (type === 'info') {
    return {
      title: toast.title || 'Information',
      toneClass: 'border-sky-200 bg-white text-sky-950 shadow-sky-950/10',
      iconWrapClass: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
      progressClass: 'bg-sky-500',
      Icon: Info,
    };
  }

  const successBase = {
    toneClass: 'border-emerald-200 bg-white text-slate-950 shadow-slate-950/10',
    iconWrapClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    progressClass: 'bg-emerald-500',
  };

  if (action === 'deleted') {
    return {
      title: toast.title || 'Suppression confirmee',
      toneClass: 'border-rose-200 bg-white text-slate-950 shadow-slate-950/10',
      iconWrapClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
      progressClass: 'bg-rose-500',
      Icon: Trash2,
    };
  }
  if (action === 'cancelled') {
    return {
      title: toast.title || 'Reservation annulee',
      toneClass: 'border-amber-200 bg-white text-slate-950 shadow-slate-950/10',
      iconWrapClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
      progressClass: 'bg-amber-500',
      Icon: Ban,
    };
  }
  if (action === 'completed') {
    return {
      title: toast.title || 'Seance validee',
      ...successBase,
      Icon: CalendarCheck,
    };
  }
  if (action === 'payment') {
    return {
      title: toast.title || 'Encaissement enregistre',
      ...successBase,
      Icon: CreditCard,
    };
  }
  if (action === 'package') {
    return {
      title: toast.title || 'Forfait active',
      ...successBase,
      Icon: PackageCheck,
    };
  }
  if (action === 'measurement') {
    return {
      title: toast.title || 'Mensurations enregistrees',
      ...successBase,
      Icon: Ruler,
    };
  }
  if (action === 'booking-request') {
    return {
      title: toast.title || 'Pre-reservation traitee',
      ...successBase,
      Icon: FileCheck2,
    };
  }
  if (action === 'created') {
    return {
      title: toast.title || 'Creation effectuee',
      ...successBase,
      Icon: UserCheck,
    };
  }
  if (action === 'updated') {
    return {
      title: toast.title || 'Modification enregistree',
      ...successBase,
      Icon: CheckCircle2,
    };
  }
  if (action === 'bulk') {
    return {
      title: toast.title || 'Traitement termine',
      ...successBase,
      Icon: FileCheck2,
    };
  }

  return {
    title: toast.title || 'Operation reussie',
    ...successBase,
    Icon: CheckCircle2,
  };
}

export function ProfessionalToast({ toast, onDismiss, id = 'professional-toast' }: ProfessionalToastProps) {
  const presentation = toast ? getPresentation(toast) : null;
  const Icon = presentation?.Icon || CheckCircle2;

  return (
    <AnimatePresence>
      {toast && presentation && (
        <motion.div
          id={id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`fixed right-4 top-4 z-[120] w-[calc(100vw-2rem)] max-w-[390px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur ${presentation.toneClass}`}
        >
          <div className="flex items-start gap-3 p-4 pr-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${presentation.iconWrapClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-extrabold leading-5 tracking-normal text-slate-950">
                {presentation.title}
              </p>
              <p className="text-xs font-semibold leading-relaxed text-slate-600">
                {toast.message}
              </p>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <motion.div
            className={`h-1 ${presentation.progressClass}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3.6, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
