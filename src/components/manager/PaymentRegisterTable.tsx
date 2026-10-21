import React from 'react';
import type { Client, Package, Payment } from '../../types';
import { paymentEntryState, paymentMethodLabels, paymentStateLabels } from '../../lib/paymentRegister';

export function PaymentRegisterTable({ payments, clients, packages, onReceipt, onReverse, onRelated }: {
  payments: Payment[]; clients: Client[]; packages: Package[];
  onReceipt: (payment: Payment) => void; onReverse: (id: string) => void; onRelated: (id: string) => void;
}) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm">
      <thead className="border-b bg-slate-50 text-xs text-slate-500"><tr>
        <th className="p-4">Adhérent</th><th className="p-4">Forfait</th><th className="p-4">Reçu / référence</th>
        <th className="p-4">État de l’écriture</th><th className="p-4 text-right">Montant signé</th><th className="p-4">Mode</th><th className="p-4">Date</th><th className="p-4">Actions</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{payments.map(payment => {
        const client = clients.find(c => c.id === payment.clientId);
        const pack = packages.find(p => p.id === payment.packageId);
        const state = paymentEntryState(payment);
        const relatedId = state === 'reversal' ? payment.reversalOfPaymentId : payment.reversedByPaymentId;
        return <tr key={payment.id} className="align-top hover:bg-slate-50/70">
          <td className="p-4"><p className="font-semibold text-slate-900">{client ? `${client.firstName} ${client.lastName}`.trim() || client.email || 'Dossier client' : 'Dossier client à retrouver'}</p>
            <p className={`mt-1 break-all text-xs ${client ? 'text-slate-500' : 'text-amber-700'}`}>{client?.phone || payment.clientId || 'Référence client non renseignée'}</p>
          </td>
          <td className="p-4 text-slate-600">{pack?.name || 'Forfait non identifié'}{!pack && payment.packageId && <p className="mt-1 text-xs text-slate-500">{payment.packageId}</p>}</td>
          <td className="max-w-[190px] break-all p-4 text-xs text-slate-600"><p className="font-semibold">{payment.receiptNumber || payment.id}</p>{payment.receiptNumber && <details className="mt-1"><summary className="cursor-pointer text-sky-700">Référence d’écriture</summary><p className="mt-1">{payment.id}</p></details>}</td>
          <td className="p-4"><span data-payment-state={state} className={`inline-block rounded-lg px-2 py-1 text-xs font-semibold ${state === 'posted' ? 'bg-emerald-50 text-emerald-800' : state === 'adjustment' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{paymentStateLabels[state]}</span>
            {relatedId && <button type="button" onClick={() => onRelated(relatedId)} className="mt-2 block text-xs font-semibold text-sky-700 underline">{state === 'reversal' ? 'Voir le règlement d’origine' : 'Voir l’annulation'}</button>}
            {payment.reason && <p className="mt-1 text-xs text-slate-500">{payment.reason}</p>}
            {payment.dataQuality?.classification === 'confirmed_demo_fixture' && <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer text-sky-700">Preuve d’origine</summary><p className="mt-1">Exemple initial du projet : {payment.dataQuality.sourceFile}</p><p className="mt-1 break-all">Version : {payment.dataQuality.sourceCommit}</p><p className="mt-1">Montant et référence conservés. Hors comptabilité courante.</p></details>}
          </td>
          <td className={`whitespace-nowrap p-4 text-right font-semibold ${payment.amount < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{payment.amount > 0 ? '+' : ''}{payment.amount.toLocaleString('fr-DZ')} DA</td>
          <td className="p-4 text-xs text-slate-600">{paymentMethodLabels[payment.method] || 'Non renseigné'}</td>
          <td className="whitespace-nowrap p-4 text-xs text-slate-600">{payment.date.slice(0, 10).split('-').reverse().join('/')}</td>
          <td className="space-y-2 p-4"><button type="button" onClick={() => onReceipt(payment)} className="block whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">{state === 'reversal' || state === 'excluded' ? 'Voir le document' : 'Voir le reçu'}</button>
            {state === 'posted' && <button type="button" onClick={() => onReverse(payment.id)} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50">Annuler l’encaissement</button>}
          </td>
        </tr>;
      })}</tbody>
    </table></div>
    {!payments.length && <p className="p-8 text-center text-sm text-slate-500">Aucune écriture ne correspond aux filtres.</p>}
  </div>;
}
