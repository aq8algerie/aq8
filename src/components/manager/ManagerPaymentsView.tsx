/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Printer, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Client, Payment, Package, Center } from '../../types';

interface ManagerPaymentsViewProps {
  centerId: string;
  clients: Client[];
  payments: Payment[];
  packages: Package[];
  currentCenter: Center;
  onLogPaymentClick: () => void;
  onDeletePayment: (paymentId: string) => void;
}

export function ManagerPaymentsView({
  centerId,
  clients,
  payments,
  packages,
  currentCenter,
  onLogPaymentClick,
  onDeletePayment
}: ManagerPaymentsViewProps) {
  const [listPage, setListPage] = useState(1);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerPayments = payments.filter(p => p.centerId === centerId);

  // Sorting payments chronologically (newest first)
  const sortedPayments = [...centerPayments].sort((a, b) => b.date.localeCompare(a.date));

  const pageSize = 5;
  const totalPages = Math.ceil(sortedPayments.length / pageSize);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div id="manager-payments-view" className="space-y-4">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold font-display text-slate-800 text-base">Registre d'Encaissement Manuel</h3>
          <p className="text-[10px] text-slate-400 font-medium">Historique des règlements enregistrés dans votre centre.</p>
        </div>
        <button
          id="btn-payments-log"
          onClick={onLogPaymentClick}
          className="px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl transition-premium text-xs flex items-center gap-1 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" /> Enregistrer un encaissement
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
              <tr>
                <th className="p-4">Adhérent</th>
                <th className="p-4">Forfait</th>
                <th className="p-4 font-mono">Reçu #</th>
                <th className="p-4 text-right">Montant</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(() => {
                const startIndex = (listPage - 1) * pageSize;
                const pageData = sortedPayments.slice(startIndex, startIndex + pageSize);

                if (pageData.length > 0) {
                  return pageData.map(pay => {
                    const cl = centerClients.find(c => c.id === pay.clientId);
                    const pack = packages.find(p => p.id === pay.packageId);
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-[#353535]">
                          {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                        </td>
                        <td className="p-4 text-slate-600">{pack?.name || 'Forfait'}</td>
                        <td className="p-4 font-mono font-semibold text-slate-400">{pay.receiptNumber || '-'}</td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800">
                          {pay.amount.toLocaleString('fr-DZ')} DZD
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase">
                            {pay.method}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-mono">{pay.date}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptPayment(pay)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
                              title="Voir / Imprimer le reçu"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePayment(pay.id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-red-50 transition cursor-pointer"
                              title="Supprimer la transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                } else {
                  return (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        Aucun paiement enregistré pour ce centre.
                      </td>
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {(() => {
          const startIndex = (listPage - 1) * pageSize;
          const pageData = sortedPayments.slice(startIndex, startIndex + pageSize);

          if (pageData.length > 0) {
            return pageData.map(pay => {
              const cl = centerClients.find(c => c.id === pay.clientId);
              const pack = packages.find(p => p.id === pay.packageId);
              return (
                <div key={pay.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-[#353535]">
                        {cl ? `${cl.firstName} ${cl.lastName}` : 'Adhérent inconnu'}
                      </h4>
                      <span className="text-[11px] text-slate-500 block mt-1 font-semibold">{pack?.name || 'Forfait'}</span>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[9px] uppercase">
                      {pay.method}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 text-xs">
                    <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                      <div>Reçu: {pay.receiptNumber || '-'}</div>
                      <div>{pay.date}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#ff5757]">
                        {pay.amount.toLocaleString('fr-DZ')} DZD
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptPayment(pay)}
                        className="p-1.5 hover:bg-slate-150 text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
                        title="Détails du reçu"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePayment(pay.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-red-50 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          } else {
            return (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 italic text-xs">
                Aucun paiement enregistré pour ce centre.
              </div>
            );
          }
        })()}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600">
          <button
            type="button"
            disabled={listPage === 1}
            onClick={() => setListPage(listPage - 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            Précédent
          </button>
          <span>Page {listPage} sur {totalPages}</span>
          <button
            type="button"
            disabled={listPage === totalPages}
            onClick={() => setListPage(listPage + 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            Suivant
          </button>
        </div>
      )}

      {/* --- RECEIPT DIALOG MODAL (PRINTABLE) --- */}
      {selectedReceiptPayment && (() => {
        const client = centerClients.find(c => c.id === selectedReceiptPayment.clientId);
        const pack = packages.find(p => p.id === selectedReceiptPayment.packageId);
        
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs crm-no-print">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 flex flex-col p-6 space-y-6">
              
              {/* Receipt Layout Wrapper */}
              <div id="printable-receipt-card" className="border border-slate-200 p-5 rounded-2xl bg-slate-50/50 space-y-5 text-xs text-slate-700 relative font-sans">
                {/* Visual Stamp background */}
                <div className="absolute right-6 top-6 opacity-10 transform rotate-12 pointer-events-none select-none">
                  <CheckCircle2 className="h-20 w-20 text-emerald-600" />
                </div>
                
                {/* Brand / Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-350">
                  <h4 className="font-extrabold text-base text-slate-800 tracking-wider">CRM AQ8 ALGÉRIE</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentCenter.name}</span>
                  <p className="text-[9px] text-slate-400 font-mono leading-normal">{currentCenter.address}<br />Tél: {currentCenter.phone}</p>
                </div>

                {/* Receipt Details */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 text-[11px] pb-1.5">
                    <span>REÇU DE PAIEMENT N°</span>
                    <span className="font-mono text-[#ff5757]">{selectedReceiptPayment.receiptNumber || `REC-${selectedReceiptPayment.id.slice(-6)}`}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium">
                    <span className="text-slate-400">Date d'émission :</span>
                    <span className="font-mono text-slate-700">{selectedReceiptPayment.date}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium">
                    <span className="text-slate-400">Nom Adhérent :</span>
                    <span className="font-bold text-slate-800 uppercase">{client ? `${client.firstName} ${client.lastName}` : 'Adhérent Inconnu'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium">
                    <span className="text-slate-400">Forfait souscrit :</span>
                    <span className="font-bold text-slate-700">{pack?.name || 'Abonnement'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium">
                    <span className="text-slate-400">Mode de règlement :</span>
                    <span className="font-bold text-slate-800 uppercase font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-md">{selectedReceiptPayment.method}</span>
                  </div>
                </div>

                {/* Amount Paid block */}
                <div className="p-3 bg-[#ff5757]/5 border border-[#ff5757]/15 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-[#ff5757] uppercase text-[10px] tracking-wide">Montant Total Réglé</span>
                  <span className="font-mono font-black text-slate-800 text-sm">{selectedReceiptPayment.amount.toLocaleString()} DZD</span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-6 text-[10px] text-center font-bold text-slate-400 uppercase">
                  <div>Signature Adhérent</div>
                  <div className="space-y-5">
                    <span>Cachet / Signature</span>
                    <div className="text-[9px] font-mono text-slate-350 italic font-medium">Gérant {currentCenter.city}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptPayment(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer text-center"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-[#353535] hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4" /> Imprimer le reçu
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
