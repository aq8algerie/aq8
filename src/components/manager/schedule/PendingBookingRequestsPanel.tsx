import { AlertCircle, Calendar, CheckCircle2, Mail, Phone, XCircle } from 'lucide-react';
import { BookingRequest } from '../../../types';

type PendingBookingRequestsPanelProps = {
  requests: BookingRequest[];
  processingId: string | null;
  onAccept: (request: BookingRequest) => void;
  onReject: (request: BookingRequest) => void;
};

export function PendingBookingRequestsPanel({
  requests,
  processingId,
  onAccept,
  onReject
}: PendingBookingRequestsPanelProps) {
  if (requests.length === 0) return null;

  return (
    <div id="pending-booking-requests-panel" className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 font-display">
              Demandes en attente
              <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {requests.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">Demandes de réservation reçues depuis le site public.</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {requests.map((request) => (
          <div key={request.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {request.firstName[0]}{request.lastName[0]}
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800">{request.firstName} {request.lastName}</span>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {request.service === 'aq8' ? 'AQ8 EMS' : request.service === 'wonder' ? 'Wonder Sculpt' : request.service}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pl-10">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3" /> {request.phone}
                </span>
                {request.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {request.email}
                  </span>
                )}
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <Calendar className="h-3 w-3 text-[#ff5757]" />
                  {new Date(request.bookingDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })} à {request.bookingTime}
                </span>
                <span className="text-slate-400 text-[10px]">
                  Reçu {new Date(request.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                onClick={() => onAccept(request)}
                disabled={processingId === request.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {processingId === request.id ? 'En cours...' : 'Accepter'}
              </button>
              <button
                onClick={() => onReject(request)}
                disabled={processingId === request.id}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition disabled:opacity-60 cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}