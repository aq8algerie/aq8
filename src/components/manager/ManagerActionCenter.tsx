import { useState } from 'react';
import { Calendar, Layers, CheckCircle2 } from 'lucide-react';
import type { BookingRequest } from '../../types';
import type { ClientRetentionStatus } from '../../lib/crmRetention';

interface ManagerActionCenterProps {
  requests: BookingRequest[];
  renewals: ClientRetentionStatus[];
  onOpenSchedule: () => void;
  onOpenClient: (clientId: string) => void;
  onAssignPackage: (clientId: string) => void;
}

export function ManagerActionCenter({ requests, renewals, onOpenSchedule, onOpenClient, onAssignPackage }: ManagerActionCenterProps) {
  const [view, setView] = useState<'requests' | 'renewals'>('requests');
  const [showAll, setShowAll] = useState(false);
  const pending = requests.filter(request => request.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reasonLabels = { expired: 'Forfait expiré', low_credit: 'Crédits bientôt épuisés', no_package: 'Aucun forfait actif' };
  const sortedRenewals = [...renewals].sort((a, b) => {
    const priority = { expired: 0, low_credit: 1, no_package: 2 };
    return priority[a.renewalReason || 'no_package'] - priority[b.renewalReason || 'no_package'] || b.daysInactive - a.daysInactive;
  });
  const count = view === 'requests' ? pending.length : sortedRenewals.length;
  return (
    <section aria-label="Actions à traiter" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">À traiter</h3>
          <p className="mt-1 text-xs text-slate-500">Décidez des demandes reçues et préparez les renouvellements.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Catégorie des actions">
          {([
            { id: 'requests', label: 'Réservations', count: pending.length, icon: Calendar },
            { id: 'renewals', label: 'Renouvellements', count: sortedRenewals.length, icon: Layers },
          ] as const).map(item => (
            <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => { setView(item.id); setShowAll(false); }}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer ${view === item.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <item.icon className="h-4 w-4" />{item.label}<span>{item.count}</span>
            </button>
          ))}
        </div>
      </div>
      {count === 0 ? (
        <p className="flex items-center gap-2 mt-5 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4" />{view === 'requests' ? 'Aucune demande en attente.' : 'Aucun renouvellement à proposer pour ce filtre.'}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {view === 'requests' ? pending.slice(0, showAll ? pending.length : 5).map(request => (
            <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{request.firstName} {request.lastName}</p>
                <p className="mt-1 text-xs text-slate-500">{request.bookingDate.split('-').reverse().join('/')} à {request.bookingTime} · {request.service === 'aq8' ? 'AQ8' : request.service === 'wonder' ? 'Wonder' : request.service}</p>
              </div>
              <button type="button" onClick={onOpenSchedule} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer">Traiter la demande</button>
            </li>
          )) : sortedRenewals.slice(0, showAll ? sortedRenewals.length : 5).map(item => (
            <li key={item.client.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <button type="button" onClick={() => onOpenClient(item.client.id)} className="text-sm font-semibold text-slate-800 hover:underline cursor-pointer">{item.client.firstName} {item.client.lastName}</button>
                <p className="mt-1 text-xs text-slate-500">{reasonLabels[item.renewalReason || 'no_package']}{item.sessionsRemaining !== undefined ? ` · ${item.sessionsRemaining} séance(s) disponible(s)` : ''}</p>
              </div>
              <button type="button" onClick={() => onAssignPackage(item.client.id)} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 cursor-pointer">Proposer un forfait</button>
            </li>
          ))}
        </ul>
      )}
      {count > 5 && <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="mt-3 text-xs font-semibold text-sky-700 hover:underline cursor-pointer">{showAll ? 'Réduire la liste' : `Voir les ${count} actions →`}</button>}
    </section>
  );
}
