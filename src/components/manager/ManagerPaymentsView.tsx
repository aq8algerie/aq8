/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Printer,
  Undo2,
  FileText,
  CheckCircle2,
  Search,
  Filter,
  CreditCard,
  Layers,
  List,
  Users,
  AlertTriangle,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Client, Payment, Package, Center, ClientPackage, Appointment } from '../../types';

interface ManagerPaymentsViewProps {
  centerId: string;
  clients: Client[];
  payments: Payment[];
  packages: Package[];
  clientPackages?: ClientPackage[];
  appointments?: Appointment[];
  currentCenter: Center;
  onLogPaymentClick: () => void;
  onReversePayment: (paymentId: string) => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

type PaymentPageSize = typeof PAGE_SIZE_OPTIONS[number];
type PaymentDateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year';
type PaymentMethodFilter = 'all' | Payment['method'];
type MainTab = 'register' | 'balances';

const safeText = (value: unknown) => String(value ?? '').trim();

const getClientDisplayName = (client?: Client) => {
  const fullName = `${safeText(client?.firstName)} ${safeText(client?.lastName)}`.trim();
  return fullName || safeText(client?.email) || safeText(client?.phone) || 'Adhérent inconnu';
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
  clientPackages = [],
  appointments = [],
  currentCenter,
  onLogPaymentClick,
  onReversePayment
}: ManagerPaymentsViewProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('register');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<PaymentPageSize>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<PaymentDateFilter>('all');
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [selectedClientLedger, setSelectedClientLedger] = useState<Client | null>(null);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'low' | 'empty' | 'active'>('all');

  const centerClients = useMemo(() => clients.filter(c => c.centerId === centerId), [clients, centerId]);
  const centerPayments = useMemo(() => payments.filter(p => p.centerId === centerId), [payments, centerId]);
  const centerClientPackages = useMemo(() => clientPackages.filter(cp => cp.centerId === centerId), [clientPackages, centerId]);
  const centerAppointments = useMemo(() => appointments.filter(a => a.centerId === centerId), [appointments, centerId]);

  // Center Validation Mode
  const validationMode = currentCenter.sessionValidationMode || 'auto';

  // Overall Financial Stats
  const totalPostedAmount = useMemo(() => {
    return centerPayments
      .filter(p => p.status !== 'reversed' && p.kind !== 'reversal')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [centerPayments]);

  const totalSessionsPurchased = useMemo(() => {
    return centerClientPackages.reduce((sum, cp) => sum + (cp.totalSessions || 0), 0);
  }, [centerClientPackages]);

  const totalSessionsRemaining = useMemo(() => {
    return centerClientPackages
      .filter(cp => cp.status === 'active')
      .reduce((sum, cp) => sum + Math.max(0, cp.sessionsRemaining || 0), 0);
  }, [centerClientPackages]);

  // Filtered Payments for Register Tab
  const filteredPayments = useMemo(() => {
    return centerPayments
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
  }, [centerPayments, centerClients, packages, searchQuery, methodFilter, packageFilter, dateFilter]);

  // Client Balances Calculation
  const clientBalanceRows = useMemo(() => {
    return centerClients.map(client => {
      const pkgs = centerClientPackages.filter(cp => cp.clientId === client.id);
      const activePkg = pkgs.find(cp => cp.status === 'active' && cp.sessionsRemaining > 0);
      const totalAcquired = pkgs.reduce((sum, cp) => sum + (cp.totalSessions || 0), 0);
      const totalRemaining = pkgs.filter(cp => cp.status === 'active').reduce((sum, cp) => sum + Math.max(0, cp.sessionsRemaining || 0), 0);
      const clientPays = centerPayments.filter(p => p.clientId === client.id && p.status !== 'reversed');
      const totalSpent = clientPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const clientApts = centerAppointments.filter(a => a.clientId === client.id);
      const completedApts = clientApts.filter(a => a.status === 'completed').length;

      let statusCategory: 'active' | 'low' | 'empty' = 'empty';
      if (totalRemaining > 2) statusCategory = 'active';
      else if (totalRemaining > 0) statusCategory = 'low';

      return {
        client,
        activePkg,
        pkgsCount: pkgs.length,
        totalAcquired,
        totalRemaining,
        totalSpent,
        completedApts,
        statusCategory,
        lastPaymentDate: clientPays[0]?.date || null,
      };
    });
  }, [centerClients, centerClientPackages, centerPayments, centerAppointments]);

  const filteredClientBalances = useMemo(() => {
    return clientBalanceRows.filter(row => {
      const fullName = `${row.client.firstName} ${row.client.lastName}`.toLowerCase();
      const matchesQuery = !searchQuery.trim() || fullName.includes(searchQuery.trim().toLowerCase()) || row.client.phone.includes(searchQuery.trim());
      const matchesBalance = balanceFilter === 'all' || row.statusCategory === balanceFilter;
      return matchesQuery && matchesBalance;
    }).sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [clientBalanceRows, searchQuery, balanceFilter]);

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
    setBalanceFilter('all');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div id="manager-payments-view" className="space-y-5">
      {/* Top Banner KPI & Mode Indicator */}
      <div className="bg-gradient-to-br from-[#1e1e1e] via-[#2a2a2a] to-[#121212] rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 translate-x-12 -translate-y-12 rounded-full bg-[#0284c7]/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#0284c7] backdrop-blur-md mb-2">
                <CreditCard className="h-3.5 w-3.5" /> Finance & Comptabilité Adhérents
              </div>
              <h2 className="font-display text-2xl font-black text-white">Suivi des Paiements & Soldes</h2>
              <p className="text-xs text-slate-300 font-medium">Gérez le registre d'encaissement et la déduction des séances pour chaque adhérent.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-payments-log-top"
                onClick={onLogPaymentClick}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl transition shadow-md text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Enregistrer un encaissement
              </button>
            </div>
          </div>

          {/* Validation Mode Badge & Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0284c7]/20 text-[#0284c7] flex items-center justify-center font-bold">
                DZD
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Encaissements</span>
                <span className="font-mono text-base font-black text-white">{totalPostedAmount.toLocaleString('fr-DZ')} DZD</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Séances Vendues</span>
                <span className="font-mono text-base font-black text-white">{totalSessionsPurchased} séances</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Solde Global Restant</span>
                <span className="font-mono text-base font-black text-sky-300">{totalSessionsRemaining} séa. dispo</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                validationMode === 'auto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {validationMode === 'auto' ? <Zap className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mode Déduction</span>
                <span className={`text-xs font-black uppercase ${validationMode === 'auto' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {validationMode === 'auto' ? '⚡ Automatique' : '✋ Manuel à la séance'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'register'
              ? 'bg-[#353535] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="h-4 w-4" /> Registre d'Encaissement Manuel ({centerPayments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'balances'
              ? 'bg-[#353535] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" /> Suivi des Soldes Adhérents ({centerClients.length})
        </button>
      </div>

      {/* TAB 1: REGISTRE DES ENCAISSEMENTS */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-bold font-display text-slate-800 text-base">Historique des Règlements</h3>
                <p className="text-[10px] text-slate-400 font-medium">Recherchez et consultez les reçus des règlements encaisseurs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <label className="md:col-span-4 relative block">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher client, reçu, forfait..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white"
                />
              </label>

              <label className="md:col-span-2 relative block">
                <CreditCard className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value as PaymentMethodFilter)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white appearance-none"
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white appearance-none"
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white appearance-none"
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white appearance-none"
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
                              onClick={() => onReversePayment(pay.id)}
                              disabled={pay.kind === 'reversal' || pay.status === 'reversed' || amount <= 0}
                              className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-lg border border-amber-100 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                              title={pay.status === 'reversed' ? 'Encaissement déjà annulé' : 'Annuler comptablement l’encaissement'}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      {/* TAB 2: SUIVI DES SOLDES ADHÉRENTS */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-bold font-display text-slate-800 text-base">Suivi des Crédits & Soldes de Séances</h3>
                <p className="text-[10px] text-slate-400 font-medium">Consultez le nombre de séances disponibles pour chaque membre du centre.</p>
              </div>

              {/* Balance Category Filter */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBalanceFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    balanceFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tous ({clientBalanceRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    balanceFilter === 'active' ? 'bg-emerald-50 text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Soldes actifs ({clientBalanceRows.filter(r => r.statusCategory === 'active').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('low')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    balanceFilter === 'low' ? 'bg-amber-50 text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Solde bas ≤2 ({clientBalanceRows.filter(r => r.statusCategory === 'low').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('empty')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    balanceFilter === 'empty' ? 'bg-rose-50 text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Épuisé / 0 ({clientBalanceRows.filter(r => r.statusCategory === 'empty').length})
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher par prénom, nom ou téléphone d'adhérent..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0284c7] focus:bg-white"
              />
            </div>
          </div>

          {/* Client Balances Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Adhérent</th>
                    <th className="p-4">Forfait Actif</th>
                    <th className="p-4 text-center">Séances Achetées</th>
                    <th className="p-4 text-center">Séances Consommées</th>
                    <th className="p-4 text-center">Solde Restant</th>
                    <th className="p-4 text-right">Total Investi</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredClientBalances.length > 0 ? filteredClientBalances.map(row => {
                    const activePackDef = packages.find(p => p.id === row.activePkg?.packageId);

                    return (
                      <tr key={row.client.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          <div>{row.client.firstName} {row.client.lastName}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">{row.client.phone}</div>
                        </td>

                        <td className="p-4">
                          {row.activePkg ? (
                            <span className="font-semibold text-slate-700 block">
                              {activePackDef?.name || 'Forfait en cours'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Aucun forfait actif</span>
                          )}
                        </td>

                        <td className="p-4 text-center font-mono font-semibold text-slate-600">
                          {row.totalAcquired} séa.
                        </td>

                        <td className="p-4 text-center font-mono font-semibold text-slate-600">
                          {row.completedApts} faite{row.completedApts > 1 ? 's' : ''}
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                            row.statusCategory === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.statusCategory === 'low'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {row.totalRemaining} séance{row.totalRemaining > 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="p-4 text-right font-mono font-bold text-slate-800">
                          {row.totalSpent.toLocaleString('fr-DZ')} DZD
                        </td>

                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedClientLedger(row.client)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#0284c7] hover:text-white text-slate-700 font-bold rounded-xl transition text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Fiche Solde
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        Aucun adhérent trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETAILED CLIENT LEDGER & SOLDE HISTORY --- */}
      {selectedClientLedger && (() => {
        const clientPkgs = centerClientPackages.filter(cp => cp.clientId === selectedClientLedger.id);
        const clientPays = centerPayments.filter(p => p.clientId === selectedClientLedger.id && p.status !== 'reversed');
        const clientApts = centerAppointments.filter(a => a.clientId === selectedClientLedger.id);
        const totalSpent = clientPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const activePkg = clientPkgs.find(cp => cp.status === 'active' && cp.sessionsRemaining > 0);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-lg">
                    Historique & Solde : {selectedClientLedger.firstName} {selectedClientLedger.lastName}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Fiche financière et de déduction des séances pour cet adhérent.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClientLedger(null)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Solde Summary Pill */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Solde Disponible</span>
                    <span className="font-mono text-lg font-black text-[#0284c7]">
                      {activePkg ? `${activePkg.sessionsRemaining} / ${activePkg.totalSessions}` : '0 séance'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Cumul Réglé</span>
                    <span className="font-mono text-lg font-black text-slate-800">
                      {totalSpent.toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Rendez-vous Réalisés</span>
                    <span className="font-mono text-lg font-black text-emerald-600">
                      {clientApts.filter(a => a.status === 'completed').length} séances
                    </span>
                  </div>
                </div>

                {/* Packages Purchased Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Forfaits Souscrits ({clientPkgs.length})</h4>
                  <div className="space-y-2">
                    {clientPkgs.length > 0 ? clientPkgs.map(cp => {
                      const packDef = packages.find(p => p.id === cp.packageId);
                      return (
                        <div key={cp.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{packDef?.name || 'Forfait'}</span>
                            <span className="text-[10px] text-slate-400">Acheté le: {safeText(cp.purchaseDate)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-[#0284c7] block">{cp.sessionsRemaining} / {cp.totalSessions} séa.</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              cp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {cp.status}
                            </span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-4 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl">
                        Aucun forfait enregistré pour cet adhérent.
                      </div>
                    )}
                  </div>
                </div>

                {/* Session History & Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Historique des Séances & Déductions</h4>
                  <div className="space-y-2">
                    {clientApts.length > 0 ? clientApts.map(apt => (
                      <div key={apt.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block">Séance du {apt.dateTime.replace('T', ' ')}</span>
                          <span className="text-[10px] text-slate-400">
                            {apt.deductedCredits === 1 ? '1 crédit déduit' : '0 crédit déduit (Attente validation)'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'booked'
                            ? 'bg-sky-100 text-[#0284c7]'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {apt.status === 'completed' ? 'Validée' : apt.status === 'booked' ? 'Réservée' : 'Annulée'}
                        </span>
                      </div>
                    )) : (
                      <div className="p-4 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl">
                        Aucune séance enregistrée pour le moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedClientLedger(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                    <span className="font-mono text-[#0284c7] text-right">{safeText(selectedReceiptPayment.receiptNumber) || `REC-${selectedReceiptPayment.id.slice(-6)}`}</span>
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
                <div className="p-3 bg-[#0284c7]/5 border border-[#0284c7]/15 rounded-xl flex justify-between items-center gap-3">
                  <span className="font-bold text-[#0284c7] uppercase text-[10px] tracking-wide">Montant Total Réglé</span>
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer text-center text-xs"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-[#353535] hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-sm text-xs"
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
