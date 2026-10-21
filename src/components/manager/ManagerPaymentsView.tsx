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
  Eye,
  Ban
} from 'lucide-react';
import { Client, Payment, Package, Center, ClientPackage, Appointment } from '../../types';
import { LegacyHistoryPanel } from './LegacyHistoryPanel';
import { ClientBalancesPanel } from './ClientBalancesPanel';
import { HistoricalMemberships } from './cards/HistoricalMemberships';
import { buildClientBalances, netReceipts, packageStatusLabel } from '../../lib/paymentBalances';
import { isHistoricalRecord } from '../../lib/legacyHistory';
import { matchesCrmSearch } from '../../lib/crmSearch';
import { matchesPaymentState, paymentMethodLabels, type PaymentStateFilter } from '../../lib/paymentRegister';
import { PaymentRegisterTable } from './PaymentRegisterTable';

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
  onCancelPackageClick?: (clientPackageId: string) => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

type PaymentPageSize = typeof PAGE_SIZE_OPTIONS[number];
type PaymentDateFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year';
type PaymentMethodFilter = 'all' | Payment['method'];
type MainTab = 'register' | 'balances' | 'history';

const safeText = (value: unknown) => String(value ?? '').trim();

const getClientDisplayName = (client?: Client) => {
  const fullName = `${safeText(client?.firstName)} ${safeText(client?.lastName)}`.trim();
  return fullName || safeText(client?.email) || safeText(client?.phone) || 'Dossier client non affiché';
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
  onReversePayment,
  onCancelPackageClick,
}: ManagerPaymentsViewProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('balances');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<PaymentPageSize>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<PaymentDateFilter>('all');
  const [stateFilter, setStateFilter] = useState<PaymentStateFilter>('all');
  const [traceNotice, setTraceNotice] = useState('');
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [selectedClientLedger, setSelectedClientLedger] = useState<Client | null>(null);
  const [showLedgerHistory, setShowLedgerHistory] = useState(false);
  const [balanceAsOf, setBalanceAsOf] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setBalanceAsOf(new Date()), 60000); return () => clearInterval(timer); }, []);

  const centerClients = useMemo(() => clients.filter(c => c.centerId === centerId && c.status !== 'archived'), [clients, centerId]);
  const centerPayments = useMemo(() => payments.filter(p => p.centerId === centerId && !isHistoricalRecord(p)), [payments, centerId]);
  const centerClientPackages = useMemo(() => clientPackages.filter(cp => cp.centerId === centerId), [clientPackages, centerId]);
  const centerAppointments = useMemo(() => appointments.filter(a => a.centerId === centerId && !isHistoricalRecord(a)), [appointments, centerId]);

  // Center Validation Mode
  const validationMode = currentCenter.sessionValidationMode || 'auto';

  const clientBalanceRows = useMemo(() => buildClientBalances({ centerId, clients: centerClients,
    clientPackages: centerClientPackages, payments: centerPayments, appointments: centerAppointments, now: balanceAsOf,
  }), [centerId, centerClients, centerClientPackages, centerPayments, centerAppointments, balanceAsOf]);
  const totalPostedAmount = useMemo(() => netReceipts(centerPayments), [centerPayments]);
  const totalSessionsRemaining = clientBalanceRows.reduce((sum, row) => sum + row.totalRemaining, 0);
  const clientsWithCredits = clientBalanceRows.filter(row => row.totalRemaining > 0).length;
  const nonUsableRemaining = clientBalanceRows.reduce((sum, row) => sum + row.nonUsableRemaining, 0);

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
          pay.clientId,
          pay.reversalOfPaymentId,
          pay.reversedByPaymentId,
          pay.id,
          pay.amount,
          pay.date,
          pay.method
        ];

        const matchesSearch = matchesCrmSearch(searchQuery, haystack, client?.phone || '');
        const matchesMethod = methodFilter === 'all' || pay.method === methodFilter;
        const matchesPackage = packageFilter === 'all' || pay.packageId === packageFilter;
        const matchesDate = isPaymentInDateFilter(pay.date, dateFilter);

        return matchesSearch && matchesMethod && matchesPackage && matchesDate && matchesPaymentState(pay, client, stateFilter);
      })
      .sort((a, b) => safeText(b.date).localeCompare(safeText(a.date)));
  }, [centerPayments, centerClients, packages, searchQuery, methodFilter, packageFilter, dateFilter, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / listPageSize));
  const normalizedListPage = Math.min(listPage, totalPages);
  const startIndex = (normalizedListPage - 1) * listPageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + listPageSize);
  const visibleStart = filteredPayments.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(startIndex + listPageSize, filteredPayments.length);
  const hasActiveFilters = Boolean(searchQuery.trim()) || methodFilter !== 'all' || packageFilter !== 'all' || dateFilter !== 'all' || stateFilter !== 'all';

  useEffect(() => {
    setListPage(1);
  }, [searchQuery, methodFilter, packageFilter, dateFilter, stateFilter, listPageSize]);

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
    setStateFilter('all');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div id="manager-payments-view" className="space-y-5">
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Paiements et forfaits</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Encaissements et crédits de séances</h2>
            <p className="mt-2 text-sm text-slate-600">Consultez les règlements du CRM, les crédits utilisables et l’historique de chaque adhérent.</p>
          </div>
          <button id="btn-payments-log-top" type="button" onClick={onLogPaymentClick} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700"><Plus className="h-4 w-4" /> Nouvel encaissement</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">Encaissements nets · CRM</p><p className="mt-2 text-2xl font-bold text-slate-900">{totalPostedAmount.toLocaleString('fr-DZ')} <span className="text-sm">DA</span></p><p className="mt-1 text-xs text-slate-500">Règlements moins écritures d’annulation · toutes dates</p></div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-semibold text-sky-800">Crédits utilisables aujourd’hui</p><p className="mt-2 text-2xl font-bold text-sky-900">{totalSessionsRemaining} <span className="text-sm">séances</span></p><p className="mt-1 text-xs text-sky-700">Forfaits en cours, non expirés · clients actifs</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">Adhérents avec crédits utilisables</p><p className="mt-2 text-2xl font-bold text-slate-900">{clientsWithCredits}</p><p className="mt-1 text-xs text-slate-500">Sur {centerClients.length} adhérents du centre</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><p>Les écritures de l’ancienne base sont consultables dans l’onglet Historique ancienne base.</p><p className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">Déduction des séances : {validationMode === 'auto' ? 'automatique' : 'validation manuelle'}</p></div>
        {nonUsableRemaining > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{nonUsableRemaining} crédit(s) figurent sur des forfaits non utilisables : expirés, clos ou rattachés à un client suspendu. Ils restent visibles dans le détail et ne sont pas comptés comme disponibles.</p>}
        {centerPayments.some(p => p.reportingExcluded) && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{centerPayments.filter(p => p.reportingExcluded).length} écriture(s) de démonstration, soit {centerPayments.filter(p => p.reportingExcluded).reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-DZ')} DA, restent conservées dans le registre et sont exclues des indicateurs financiers.</p>}
      </section>
      <nav aria-label="Paiements et crédits" className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 sm:grid-cols-3">
        {([{ id: 'register', label: `Registre CRM (${centerPayments.length} écritures)` }, { id: 'balances', label: 'Crédits de séances' }, { id: 'history', label: 'Historique ancienne base' }] as Array<{ id: MainTab; label: string }>).map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{tab.label}</button>)}
      </nav>

      {/* TAB 1: REGISTRE DES ENCAISSEMENTS */}
      {activeTab === 'history' && <LegacyHistoryPanel centerId={centerId} kind="finance" />}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-bold font-display text-slate-800 text-base">Registre des paiements du CRM</h3>
                <p className="text-xs text-slate-500">Recherchez un règlement, consultez son reçu et retrouvez les annulations.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">État de l’écriture
                <select value={stateFilter} onChange={e => setStateFilter(e.target.value as PaymentStateFilter)} className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="all">Toutes les écritures</option><option value="posted">Règlements enregistrés</option><option value="reversed">Règlements annulés</option><option value="reversal">Contre-écritures d’annulation</option><option value="adjustment">Régularisations</option><option value="excluded">Démonstration · hors indicateurs</option><option value="unresolved">Dossiers clients à retrouver</option>
                </select>
              </label>
              {centerPayments.some(p => !p.reportingExcluded && !centerClients.some(c => c.id === p.clientId)) && <button type="button" onClick={() => { resetFilters(); setStateFilter('unresolved'); }} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{centerPayments.filter(p => !p.reportingExcluded && !centerClients.some(c => c.id === p.clientId)).length} écriture(s) avec dossier client non affiché</button>}
            </div>
            <p className="text-xs text-slate-500">Les règlements annulés et leurs contre-écritures sont conservés séparément. Un dossier non affiché reste à vérifier ; aucun rattachement n’est déduit automatiquement.</p>
            {traceNotice && <p role="status" className="break-words rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{traceNotice} <button type="button" onClick={() => setTraceNotice('')} className="underline">Fermer</button></p>}
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
              <span>{visibleStart}-{visibleEnd} sur {filteredPayments.length} écriture(s) · Somme des montants affichés : {filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-DZ')} DA</span>
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

          <PaymentRegisterTable payments={paginatedPayments} clients={centerClients} packages={packages} onReceipt={setSelectedReceiptPayment} onReverse={onReversePayment} onRelated={id => { const related = centerPayments.find(p => p.id === id); if (related) { setTraceNotice(''); setSelectedReceiptPayment(related); } else setTraceNotice(`Écriture liée non présente dans le registre chargé : ${id}. La référence est conservée pour contrôle.`); }} />

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

      {activeTab === 'balances' && <ClientBalancesPanel rows={clientBalanceRows} packages={packages} onOpen={(client, history = false) => { setSelectedClientLedger(client); setShowLedgerHistory(history); }} />}

      {/* --- MODAL DETAILED CLIENT LEDGER & SOLDE HISTORY --- */}
      {selectedClientLedger && (() => {
        const clientPkgs = centerClientPackages.filter(cp => cp.clientId === selectedClientLedger.id);
        const clientPays = centerPayments.filter(p => p.clientId === selectedClientLedger.id).sort((a, b) => b.date.localeCompare(a.date));
        const clientApts = centerAppointments.filter(a => a.clientId === selectedClientLedger.id);
        const totalSpent = netReceipts(clientPays);
        const balance = clientBalanceRows.find(row => row.client.id === selectedClientLedger.id);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div role="dialog" aria-modal="true" aria-label="Dossier de paiements et crédits" className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-lg">
                    Dossier de paiements : {selectedClientLedger.firstName} {selectedClientLedger.lastName}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Forfaits et règlements du CRM courant. Les archives restent accessibles séparément.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClientLedger(null)}
                  aria-label="Fermer le dossier de paiements"
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <button type="button" onClick={() => setShowLedgerHistory(value => !value)} aria-expanded={showLedgerHistory} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">{showLedgerHistory ? 'Masquer les archives anciennes' : 'Consulter les anciens paiements, abonnements et réservations'}</button>
                {showLedgerHistory && <div className="space-y-4"><HistoricalMemberships client={selectedClientLedger} /><LegacyHistoryPanel centerId={centerId} clientId={selectedClientLedger.id} kind="finance" /><LegacyHistoryPanel centerId={centerId} clientId={selectedClientLedger.id} kind="reservations" /></div>}

                {/* Solde Summary Pill */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Crédits utilisables</span>
                    <span className="font-mono text-lg font-black text-[#0284c7]">
                      {balance?.pkgsCount ? `${balance.totalRemaining} séance(s)` : 'Non renseigné'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Encaissements nets CRM</span>
                    <span className="font-mono text-lg font-black text-slate-800">
                      {clientPays.length ? `${totalSpent.toLocaleString('fr-DZ')} DA` : 'Aucune écriture CRM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Séances validées CRM</span>
                    <span className="font-mono text-lg font-black text-emerald-600">
                      {clientApts.filter(a => a.status === 'completed').length} séances
                    </span>
                  </div>
                </div>

                <section className="space-y-3"><h4 className="text-sm font-bold text-slate-800">Règlements du CRM courant ({clientPays.length})</h4><p className="text-xs text-slate-500">Les règlements et leurs contre-écritures restent visibles. Le cumul est net des annulations.</p>
                  {clientPays.map(payment => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm"><div><p className="font-semibold text-slate-800">{payment.receiptNumber || payment.id}</p><p className="text-xs text-slate-500">{payment.date.slice(0, 10).split('-').reverse().join('/')} · {payment.kind === 'reversal' ? 'Écriture d’annulation' : payment.status === 'reversed' ? 'Règlement annulé' : 'Règlement enregistré'}</p></div><strong>{payment.amount.toLocaleString('fr-DZ')} DA</strong>{payment.kind !== 'reversal' && <button type="button" onClick={() => setSelectedReceiptPayment(payment)} className="text-xs font-semibold text-sky-700 underline">Voir le reçu</button>}</div>)}
                  {!clientPays.length && <p className="text-sm text-slate-500">Aucun règlement dans le CRM courant. Consultez les archives pour les paiements antérieurs.</p>}
                </section>
                {/* Packages Purchased Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Forfaits Souscrits ({clientPkgs.length})</h4>
                  <div className="space-y-2">
                    {clientPkgs.length > 0 ? clientPkgs.map(cp => {
                      const packDef = packages.find(p => p.id === cp.packageId);
                      const isCancelled = cp.status === 'cancelled';
                      const totalSess = cp.totalSessions;

                      return (
                        <div key={cp.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{packDef?.name || 'Forfait'}</span>
                            <span className="text-[10px] text-slate-400">Acheté le: {safeText(cp.purchaseDate)}</span>
                            {isCancelled && cp.cancellationReason && (
                              <span className="text-[10px] text-rose-600 font-semibold block">Motif: {cp.cancellationReason}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-mono font-bold text-[#0284c7] block">{isCancelled ? 0 : cp.sessionsRemaining} / {totalSess} séa.</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                isCancelled
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : packageStatusLabel(cp, balanceAsOf) === 'En cours'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {packageStatusLabel(cp, balanceAsOf)}
                              </span>
                            </div>
                            {!isCancelled && onCancelPackageClick && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClientLedger(null);
                                  onCancelPackageClick(cp.id);
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Annuler ce forfait"
                              >
                                <Ban className="h-3.5 w-3.5" /> Annuler le forfait
                              </button>
                            )}
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
                            {apt.deductedCredits === 1 ? 'Déduction enregistrée : 1 crédit' : 'Aucune déduction enregistrée'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'booked'
                            ? 'bg-sky-100 text-[#0284c7]'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {apt.status === 'completed' ? 'Validée' : apt.status === 'booked' ? 'Réservée' : apt.status === 'confirmed' ? 'Confirmée' : 'Annulée'}
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

                {selectedReceiptPayment.reportingExcluded && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><strong>DOCUMENT DE DÉMONSTRATION — HORS COMPTABILITÉ</strong><p>Exemple initial du projet, conservé pour la traçabilité. Ce document ne prouve aucun encaissement réel.</p></div>}
                {/* Receipt Details */}
                {(selectedReceiptPayment.status === 'reversed' || selectedReceiptPayment.kind === 'reversal') && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800"><p className="text-sm font-bold">{selectedReceiptPayment.kind === 'reversal' ? 'Contre-écriture d’annulation' : 'Reçu annulé'}</p><p className="mt-1 text-xs">Montant d’origine conservé pour la traçabilité. Ce document ne représente pas un nouvel encaissement.</p>{selectedReceiptPayment.reversedByPaymentId && <p className="mt-1 break-all text-xs">Annulation : {selectedReceiptPayment.reversedByPaymentId}</p>}{selectedReceiptPayment.reversalOfPaymentId && <p className="mt-1 break-all text-xs">Règlement d’origine : {selectedReceiptPayment.reversalOfPaymentId}</p>}</div>}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 text-[11px] pb-1.5 gap-3">
                    <span>{selectedReceiptPayment.kind === 'reversal' ? 'RÉFÉRENCE D’ANNULATION' : selectedReceiptPayment.receiptNumber ? 'REÇU DE PAIEMENT N°' : 'RÉFÉRENCE D’ÉCRITURE'}</span>
                    <span className="font-mono text-[#0284c7] text-right">{safeText(selectedReceiptPayment.receiptNumber) || selectedReceiptPayment.id}</span>
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
                    <span className="font-bold text-slate-700 text-right">{safeText(pack?.name) || safeText(selectedReceiptPayment.packageId) || 'Non renseigné'}</span>
                  </div>
                  {selectedReceiptPayment.clientId && <div className="flex justify-between gap-3 border-b border-slate-200/50 py-1 font-medium"><span className="text-slate-400">Référence du dossier :</span><span className="break-all text-right font-mono text-slate-700">{selectedReceiptPayment.clientId}</span></div>}
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Mode de règlement :</span>
                    <span className="font-bold text-slate-800 uppercase font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-md">{paymentMethodLabels[selectedReceiptPayment.method] || 'Non renseigné'}</span>
                  </div>
                </div>

                {/* Amount Paid block */}
                <div className="p-3 bg-[#0284c7]/5 border border-[#0284c7]/15 rounded-xl flex justify-between items-center gap-3">
                  <span className="font-bold text-[#0284c7] uppercase text-[10px] tracking-wide">{selectedReceiptPayment.status === 'reversed' ? 'Montant d’origine · reçu annulé' : selectedReceiptPayment.kind === 'reversal' ? 'Montant de l’annulation' : 'Montant réglé'}</span>
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
