/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Plus, Printer, Trash2, FileText, CheckCircle2, Search, Filter, CreditCard, Layers, List } from 'lucide-react';
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

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

type PaymentPageSize = typeof PAGE_SIZE_OPTIONS[number];
type PaymentDateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year';
type PaymentMethodFilter = 'all' | Payment['method'];

const safeText = (value: unknown) => String(value ?? '').trim();

const getClientDisplayName = (client?: Client) => {
  const fullName = `${safeText(client?.firstName)} ${safeText(client?.lastName)}`.trim();
  return fullName || safeText(client?.email) || safeText(client?.phone) || 'Adherent inconnu';
};

const parsePaymentDate = (date: string) => {
  const normalizedDate = safeText(date).replace(' ', 'T');
  const parsed = new Date(normalizedDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isPaymentInDateFilter = (date: string, filter: PaymentDateFilter) => {
  if (filter === 'all') return true;

  const paymentDate = parsePaymentDate(date);
  if (!paymentDate) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPaymentDay = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());

  if (filter === 'today') {
    return startOfPaymentDay.getTime() === startOfToday.getTime();
  }

  if (filter === 'this_week') {
    const dayOfWeek = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
    return startOfPaymentDay >= startOfWeek;
  }

  if (filter === 'this_month') {
    return paymentDate.getFullYear() === now.getFullYear() && paymentDate.getMonth() === now.getMonth();
  }

  return paymentDate.getFullYear() === now.getFullYear();
};

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
  const [listPageSize, setListPageSize] = useState<PaymentPageSize>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<PaymentDateFilter>('all');
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerPayments = payments.filter(p => p.centerId === centerId);

  const filteredPayments = centerPayments
    .filter(pay => {
      const client = centerClients.find(c => c.id === pay.clientId);
      const pack = packages.find(p => p.id === pay.packageId);
      const haystack = [
        getClientDisplayName(client),
        client?.email,
        client?.phone,
        pack?.name,
        pay.receiptNumber,
        pay.id,
        pay.amount,
        pay.date,
        pay.method
      ].map(safeText).join(' ').toLowerCase();

      const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
      const matchesMethod = methodFilter === 'all' || pay.method === methodFilter;
      const matchesPackage = packageFilter === 'all' || pay.packageId === packageFilter;
      const matchesDate = isPaymentInDateFilter(pay.date, dateFilter);

      return matchesSearch && matchesMethod && matchesPackage && matchesDate;
    })
    .sort((a, b) => safeText(b.date).localeCompare(safeText(a.date)));

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / listPageSize));
  const normalizedListPage = Math.min(listPage, totalPages);
  const startIndex = (normalizedListPage - 1) * listPageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + listPageSize);
  const visibleStart = filteredPayments.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(startIndex + listPageSize, filteredPayments.length);
  const hasActiveFilters = Boolean(searchQuery.trim()) || methodFilter !== 'all' || packageFilter !== 'all' || dateFilter !== 'all';

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, methodFilter, packageFilter, dateFilter, listPageSize]);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  const resetFilters = () => {
    setSearchQuery('');
    setMethodFilter('all');
    setPackageFilter('all');
    setDateFilter('all');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div id="manager-payments-view" className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h3 className="font-bold font-display text-slate-800 text-base">Registre d'Encaissement Manuel</h3>
            <p className="text-[10px] text-slate-400 font-medium">Historique des règlements enregistrés dans votre centre.</p>
          </div>
          <button
            id="btn-payments-log"
            onClick={onLogPaymentClick}
            className="px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl transition-premium text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" /> Enregistrer un encaissement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <label className="md:col-span-4 relative block">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher client, reçu, forfait..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white"
            />
          </label>

          <label className="md:col-span-2 relative block">
            <CreditCard className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as PaymentMethodFilter)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Tous modes</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
              <option value="ccp">CCP</option>
              <option value="cheque">Chèque</option>
            </select>
          </label>

          <label className="md:col-span-2 relative block">
            <Layers className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={packageFilter}
              onChange={(event) => setPackageFilter(event.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Tous forfaits</option>
              {packages.map(pack => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2 relative block">
            <Filter className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as PaymentDateFilter)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="this_week">Cette semaine</option>
              <option value="this_month">Ce mois</option>
              <option value="this_year">Cette année</option>
            </select>
          </label>

          <label className="md:col-span-2 relative block">
            <List className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={listPageSize}
              onChange={(event) => setListPageSize(Number(event.target.value) as PaymentPageSize)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 font-semibold">
          <span>{visibleStart}-{visibleEnd} sur {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
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
              {paginatedPayments.length > 0 ? paginatedPayments.map(pay => {
                const cl = centerClients.find(c => c.id === pay.clientId);
                const pack = packages.find(p => p.id === pay.packageId);
                const amount = Number(pay.amount || 0);

                return (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-[#353535]">
                      {getClientDisplayName(cl)}
                    </td>
                    <td className="p-4 text-slate-600">{safeText(pack?.name) || 'Forfait'}</td>
                    <td className="p-4 font-mono font-semibold text-slate-400">{safeText(pay.receiptNumber) || '-'}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                      {amount.toLocaleString('fr-DZ')} DZD
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase">
                        {safeText(pay.method) || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">{safeText(pay.date) || '-'}</td>
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
              }) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Aucun paiement trouvé pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {paginatedPayments.length > 0 ? paginatedPayments.map(pay => {
          const cl = centerClients.find(c => c.id === pay.clientId);
          const pack = packages.find(p => p.id === pay.packageId);
          const amount = Number(pay.amount || 0);

          return (
            <div key={pay.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[#353535] truncate">
                    {getClientDisplayName(cl)}
                  </h4>
                  <span className="text-[11px] text-slate-500 block mt-1 font-semibold truncate">{safeText(pack?.name) || 'Forfait'}</span>
                </div>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[9px] uppercase shrink-0">
                  {safeText(pay.method) || '-'}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 text-xs gap-3">
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono min-w-0">
                  <div className="truncate">Reçu: {safeText(pay.receiptNumber) || '-'}</div>
                  <div>{safeText(pay.date) || '-'}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-sm text-[#ff5757] whitespace-nowrap">
                    {amount.toLocaleString('fr-DZ')} DZD
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptPayment(pay)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
                    title="Détails du reçu"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePayment(pay.id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-red-50 transition cursor-pointer"
                    title="Supprimer la transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 italic text-xs">
            Aucun paiement trouvé pour ces critères.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600">
        <span className="text-center sm:text-left">Page {normalizedListPage} sur {totalPages}</span>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={normalizedListPage === 1}
            onClick={() => setListPage(normalizedListPage - 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={normalizedListPage === totalPages}
            onClick={() => setListPage(normalizedListPage + 1)}
            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
          >
            Suivant
          </button>
        </div>
      </div>

      {/* --- RECEIPT DIALOG MODAL (PRINTABLE) --- */}
      {selectedReceiptPayment && (() => {
        const client = centerClients.find(c => c.id === selectedReceiptPayment.clientId);
        const pack = packages.find(p => p.id === selectedReceiptPayment.packageId);
        const receiptAmount = Number(selectedReceiptPayment.amount || 0);

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
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{safeText(currentCenter.name)}</span>
                  <p className="text-[9px] text-slate-400 font-mono leading-normal">{safeText(currentCenter.address)}<br />Tél: {safeText(currentCenter.phone)}</p>
                </div>

                {/* Receipt Details */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 text-[11px] pb-1.5 gap-3">
                    <span>REÇU DE PAIEMENT N°</span>
                    <span className="font-mono text-[#ff5757] text-right">{safeText(selectedReceiptPayment.receiptNumber) || `REC-${selectedReceiptPayment.id.slice(-6)}`}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Date d'émission :</span>
                    <span className="font-mono text-slate-700 text-right">{safeText(selectedReceiptPayment.date) || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Nom Adhérent :</span>
                    <span className="font-bold text-slate-800 uppercase text-right">{getClientDisplayName(client)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Forfait souscrit :</span>
                    <span className="font-bold text-slate-700 text-right">{safeText(pack?.name) || 'Abonnement'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Mode de règlement :</span>
                    <span className="font-bold text-slate-800 uppercase font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-md">{safeText(selectedReceiptPayment.method) || '-'}</span>
                  </div>
                </div>

                {/* Amount Paid block */}
                <div className="p-3 bg-[#ff5757]/5 border border-[#ff5757]/15 rounded-xl flex justify-between items-center gap-3">
                  <span className="font-bold text-[#ff5757] uppercase text-[10px] tracking-wide">Montant Total Réglé</span>
                  <span className="font-mono font-black text-slate-800 text-sm whitespace-nowrap">{receiptAmount.toLocaleString('fr-DZ')} DZD</span>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-6 text-[10px] text-center font-bold text-slate-400 uppercase">
                  <div>Signature Adhérent</div>
                  <div className="space-y-5">
                    <span>Cachet / Signature</span>
                    <div className="text-[9px] font-mono text-slate-350 italic font-medium">Gérant {safeText(currentCenter.city)}</div>
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
