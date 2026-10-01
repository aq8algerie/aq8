import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import type { Appointment, Center, Service } from '../../types';
import { getManagerAvailableSlots, type ManagerAvailableSlot } from '../../lib/managerDashboardMetrics';
import { getTodayDateString } from '../../lib/centerManagerUtils';

export function ManagerAvailableSlots({ centerId, center, appointments, services, onBook }: {
  centerId: string; center?: Center; appointments: Appointment[]; services: Service[];
  onBook: (slot: ManagerAvailableSlot) => void;
}) {
  const today = getTodayDateString();
  const [date, setDate] = useState(today);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const slots = getManagerAvailableSlots({ date, centerId, center, appointments, services, now });
  const remaining = slots.reduce((sum, slot) => sum + slot.remaining, 0);
  return (
    <section aria-label="Créneaux disponibles" className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Créneaux à remplir</h3>
          <p className="mt-1 text-xs text-slate-500">{remaining} place(s) disponible(s) · horaires à venir, réservations en attente incluses dans l’occupation.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Calendar className="h-4 w-4" />Date
          <input type="date" min={today} value={date} onChange={event => { setDate(event.target.value); setShowAll(false); }} className="rounded-xl border border-slate-200 p-2" />
        </label>
      </div>
      {slots.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">Aucun créneau disponible à venir pour cette date. Choisissez un autre jour.</p> : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {slots.slice(0, showAll ? slots.length : 8).map(slot => (
            <button type="button" key={`${slot.time}-${slot.serviceType}`} onClick={() => onBook(slot)} className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-left hover:border-sky-300 hover:bg-sky-50 cursor-pointer" aria-label={`Réserver ${slot.serviceType === 'aq8' ? 'AQ8' : 'Wonder'} le ${date} à ${slot.time}`}>
              <span><span className="block text-sm font-bold text-slate-800">{slot.time} · {slot.serviceType === 'aq8' ? 'AQ8' : 'Wonder'}</span><span className="text-xs text-slate-500">{slot.remaining} place(s) libre(s)</span></span>
              <span className="text-xs font-semibold text-sky-700">Réserver →</span>
            </button>
          ))}
        </div>
      )}
      {slots.length > 8 && <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-semibold text-sky-700 hover:underline cursor-pointer">{showAll ? 'Réduire la liste' : `Voir les ${slots.length} créneaux →`}</button>}
      <p className="mt-3 text-[11px] text-slate-400">La disponibilité est vérifiée de nouveau lors de l’enregistrement.</p>
    </section>
  );
}
