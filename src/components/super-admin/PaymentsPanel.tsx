import React, { useEffect, useState, useMemo } from 'react';
import { Printer, FileText, Search, Filter, CreditCard, Layers, List, DollarSign, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Client, Payment, Package, Center } from '../../types';

interface PaymentsPanelProps {
  centers: Center[];
  clients: Client[];
  payments: Payment[];
  packages: Package[];
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
type PaymentPageSize = typeof PAGE_SIZE_OPTIONS[number];
type PaymentMethodFilter = 'all' | Payment['method'];

const safeText = (value: unknown) => String(value ?? '').trim();

const getClientDisplayName = (client?: Client) => {
  const fullName = `${safeText(client?.firstName)} ${safeText(client?.lastName)}`.trim();
  return fullName || safeText(client?.email) || safeText(client?.phone) || 'Adhérant inconnu';
};

const parsePaymentDate = (dateStr: string) => {
  const normalized = safeText(dateStr).replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function PaymentsPanel({
  centers,
  clients,
  payments,
  packages
}: PaymentsPanelProps) {
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<PaymentPageSize>(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  
  // Month and Year filter
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  
  const [monthFilter, setMonthFilter] = useState<string>('all'); // '1' to '12' or 'all'
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));

  // Reset pagination on filter change
  useEffect(() => {
    setListPage(1);
  }, [searchQuery, methodFilter, centerFilter, packageFilter, monthFilter, yearFilter, listPageSize]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments
      .filter(pay => {
        const client = clients.find(c => c.id === pay.clientId);
        const pack = packages.find(p => p.id === pay.packageId);
        const center = centers.find(c => c.id === pay.centerId);
        
        const haystack = [
          getClientDisplayName(client),
          client?.email,
          client?.phone,
          pack?.name,
          center?.name,
          center?.city,
          pay.receiptNumber,
          pay.id,
          pay.amount,
          pay.date,
          pay.method
        ].map(safeText).join(' ').toLowerCase();

        const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
        const matchesMethod = methodFilter === 'all' || pay.method === methodFilter;
        const matchesCenter = centerFilter === 'all' || pay.centerId === centerFilter;
        const matchesPackage = packageFilter === 'all' || pay.packageId === packageFilter;
        
        // Date checks
        const pDate = parsePaymentDate(pay.date);
        if (!pDate) return false;
        
        const matchesYear = yearFilter === 'all' || String(pDate.getFullYear()) === yearFilter;
        const matchesMonth = monthFilter === 'all' || String(pDate.getMonth() + 1) === monthFilter;

        return matchesSearch && matchesMethod && matchesCenter && matchesPackage && matchesYear && matchesMonth;
      })
      .sort((a, b) => safeText(b.date).localeCompare(safeText(a.date)));
  }, [payments, clients, packages, centers, searchQuery, methodFilter, centerFilter, packageFilter, monthFilter, yearFilter]);

  // Paginated payments
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / listPageSize));
  const normalizedListPage = Math.min(listPage, totalPages);
  const startIndex = (normalizedListPage - 1) * listPageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + listPageSize);
  const visibleStart = filteredPayments.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(startIndex + listPageSize, filteredPayments.length);
  const hasActiveFilters = searchQuery.trim() || methodFilter !== 'all' || centerFilter !== 'all' || packageFilter !== 'all' || monthFilter !== 'all' || yearFilter !== String(currentYear);

  const resetFilters = () => {
    setSearchQuery('');
    setMethodFilter('all');
    setCenterFilter('all');
    setPackageFilter('all');
    setMonthFilter('all');
    setYearFilter(String(currentYear));
  };

  // Receipt modal state
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const selectedReceiptCenter = selectedReceiptPayment ? centers.find(c => c.id === selectedReceiptPayment.centerId) : null;
  const selectedReceiptClient = selectedReceiptPayment ? clients.find(c => c.id === selectedReceiptPayment.clientId) : null;
  const selectedReceiptPackage = selectedReceiptPayment ? packages.find(p => p.id === selectedReceiptPayment.packageId) : null;

  // Monthly stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthVal = now.getMonth(); // 0-indexed
    const thisYearVal = now.getFullYear();
    
    const prevMonthVal = thisMonthVal === 0 ? 11 : thisMonthVal - 1;
    const prevYearVal = thisMonthVal === 0 ? thisYearVal - 1 : thisYearVal;

    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let totalRevenueVal = 0;
    const centerRevenues: Record<string, number> = {};

    payments.forEach(pay => {
      const pDate = parsePaymentDate(pay.date);
      if (!pDate) return;
      
      const amount = Number(pay.amount || 0);
      totalRevenueVal += amount;
      
      // Calculate top center
      centerRevenues[pay.centerId] = (centerRevenues[pay.centerId] || 0) + amount;

      if (pDate.getFullYear() === thisYearVal && pDate.getMonth() === thisMonthVal) {
        revenueThisMonth += amount;
      } else if (pDate.getFullYear() === prevYearVal && pDate.getMonth() === prevMonthVal) {
        revenueLastMonth += amount;
      }
    });

    // Find top performing center
    let topCenterId = '';
    let topCenterRevenue = 0;
    Object.entries(centerRevenues).forEach(([cId, rev]) => {
      if (rev > topCenterRevenue) {
        topCenterRevenue = rev;
        topCenterId = cId;
      }
    });
    const topCenterName = centers.find(c => c.id === topCenterId)?.name || 'Aucun';

    return {
      revenueThisMonth,
      revenueLastMonth,
      totalRevenueVal,
      topCenterName,
      topCenterRevenue
    };
  }, [payments, centers]);

  const monthLabels: Record<string, string> = {
    '1': 'Janvier', '2': 'Février', '3': 'Mars', '4': 'Avril',
    '5': 'Mai', '6': 'Juin', '7': 'Juillet', '8': 'Août',
    '9': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div id="super-admin-payments-view" className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Consolidé */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chiffre d'Affaires Réseau</span>
            <span className="text-xl font-bold font-mono text-[#353535] block">
              {stats.totalRevenueVal.toLocaleString('fr-DZ')} <span className="text-xs font-semibold text-slate-500">DZD</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 block">Montant brut historique</span>
          </div>
          <div className="h-10 w-10 bg-[#ff5757]/15 rounded-2xl flex items-center justify-center text-[#ff5757]">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Chiffre du mois */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revenus du Mois en Cours</span>
            <span className="text-xl font-bold font-mono text-emerald-600 block">
              {stats.revenueThisMonth.toLocaleString('fr-DZ')} <span className="text-xs font-semibold text-emerald-600/70">DZD</span>
            </span>
            <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Mois actif
            </span>
          </div>
          <div className="h-10 w-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        {/* Chiffre du mois dernier */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revenus du Mois Dernier</span>
            <span className="text-xl font-bold font-mono text-slate-700 block">
              {stats.revenueLastMonth.toLocaleString('fr-DZ')} <span className="text-xs font-semibold text-slate-400">DZD</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 block">Mois précédent clos</span>
          </div>
          <div className="h-10 w-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        {/* Meilleur centre */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Studio Top Performance</span>
            <span className="text-sm font-black text-slate-800 block truncate font-display">
              {stats.topCenterName}
            </span>
            <span className="text-[9px] font-bold text-slate-500 font-mono">
              {stats.topCenterRevenue.toLocaleString()} DZD cumulés
            </span>
          </div>
          <div className="h-10 w-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters Dashboard Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold font-display text-slate-800 text-sm">Registre Général des Encaisses</h3>
          <p className="text-[10px] text-slate-400 font-medium">Recherchez et filtrez l'historique complet des paiements mensuels à travers tout le réseau.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5">
          {/* Text Search */}
          <label className="md:col-span-3 relative block">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chercher client, reçu..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white"
            />
          </label>

          {/* Center Selector */}
          <label className="md:col-span-2 relative block">
            <List className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Tous les centres</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* Month Selector */}
          <label className="md:col-span-2 relative block">
            <Filter className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Tous les mois</option>
              {Object.entries(monthLabels).map(([num, name]) => (
                <option key={num} value={num}>{name}</option>
              ))}
            </select>
          </label>

          {/* Year Selector */}
          <label className="md:col-span-1.5 relative block">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white"
            >
              <option value="all">Toutes années</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </label>

          {/* Method Filter */}
          <label className="md:col-span-2 relative block">
            <CreditCard className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethodFilter)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white appearance-none"
            >
              <option value="all">Tous modes</option>
              <option value="cash">Espèces</option>
              <option value="card">Carte</option>
              <option value="ccp">CCP</option>
              <option value="cheque">Chèque</option>
            </select>
          </label>

          {/* Page size */}
          <label className="md:col-span-1.5 relative block">
            <select
              value={listPageSize}
              onChange={(e) => setListPageSize(Number(e.target.value) as PaymentPageSize)}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#ff5757] focus:bg-white font-mono"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}/page</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 font-semibold">
          <span>Affichage de {visibleStart} à {visibleEnd} sur {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-650">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-150 uppercase text-[10px]">
              <tr>
                <th className="p-4">Centre</th>
                <th className="p-4">Adhérent</th>
                <th className="p-4">Forfait</th>
                <th className="p-4 font-mono">Reçu #</th>
                <th className="p-4 text-right">Montant</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Date de règlement</th>
                <th className="p-4 text-center">Impression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {paginatedPayments.length > 0 ? paginatedPayments.map(pay => {
                const cl = clients.find(c => c.id === pay.clientId);
                const pack = packages.find(p => p.id === pay.packageId);
                const center = centers.find(c => c.id === pay.centerId);
                const amount = Number(pay.amount || 0);

                return (
                  <tr key={pay.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Center badge */}
                    <td className="p-4">
                      <span className="inline-block bg-[#ff5757]/10 text-[#ff5757] px-2 py-0.5 rounded-md font-bold uppercase text-[9px] tracking-wide">
                        {center?.name || 'Inconnu'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#353535]">
                      {getClientDisplayName(cl)}
                    </td>
                    <td className="p-4 text-slate-500">{safeText(pack?.name) || 'Forfait'}</td>
                    <td className="p-4 font-mono text-slate-400">{safeText(pay.receiptNumber) || '-'}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-800">
                      {amount.toLocaleString('fr-DZ')} DZD
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase">
                        {safeText(pay.method) || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">{safeText(pay.date) || '-'}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptPayment(pay)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-205 transition cursor-pointer"
                        title="Détails du reçu"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic font-semibold">
                    Aucun règlement enregistré ne correspond à ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-650">
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

      {/* --- RECEIPT MODAL DIALOG (PRINTABLE) --- */}
      {selectedReceiptPayment && selectedReceiptCenter && (() => {
        const receiptAmount = Number(selectedReceiptPayment.amount || 0);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs crm-no-print">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 flex flex-col p-6 space-y-6">

              {/* Receipt Layout Wrapper */}
              <div id="printable-receipt-card" className="border border-slate-200 p-5 rounded-2xl bg-slate-50/50 space-y-5 text-xs text-slate-700 relative font-sans">
                {/* Brand / Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <h4 className="font-extrabold text-base text-slate-800 tracking-wider">CRM AQ8 ALGÉRIE</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{safeText(selectedReceiptCenter.name)}</span>
                  <p className="text-[9px] text-slate-400 font-mono leading-normal">
                    {safeText(selectedReceiptCenter.address)}<br />Tél: {safeText(selectedReceiptCenter.phone)}
                  </p>
                </div>

                {/* Receipt Details */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 text-[11px] pb-1.5 gap-3">
                    <span>REÇU DE PAIEMENT N°</span>
                    <span className="font-mono text-[#ff5757] text-right">
                      {safeText(selectedReceiptPayment.receiptNumber) || `REC-${selectedReceiptPayment.id.slice(-6)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Date d'émission :</span>
                    <span className="font-mono text-slate-700 text-right">{safeText(selectedReceiptPayment.date) || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Nom Adhérent :</span>
                    <span className="font-bold text-slate-800 uppercase text-right">{getClientDisplayName(selectedReceiptClient || undefined)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Forfait souscrit :</span>
                    <span className="font-bold text-slate-700 text-right">{safeText(selectedReceiptPackage?.name) || 'Abonnement'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 py-1 font-medium gap-3">
                    <span className="text-slate-400">Mode de règlement :</span>
                    <span className="font-bold text-slate-800 uppercase font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded-md">
                      {safeText(selectedReceiptPayment.method) || '-'}
                    </span>
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
                    <div className="text-[9px] font-mono text-slate-350 italic font-medium">Gérant {safeText(selectedReceiptCenter.city)}</div>
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
