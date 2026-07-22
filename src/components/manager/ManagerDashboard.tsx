/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  Scale,
  Clock,
  Filter,
  Layers,
  Award,
  Venus,
  Mars,
  Activity,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  TrendingDown,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { Client, Appointment, Payment, Measurement, Service, Package, ClientPackage } from '../../types';
import { StatCard } from './cards/StatCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { formatDZD } from '../../lib/centerManagerUtils';
import { SubTabId } from './ManagerTabs';
import { AppointmentMutationOptions, CrmActionResult } from '../../lib/crmTransactions';
import { isPackageExpired } from '../../lib/packageRules';

interface ManagerDashboardProps {
  centerId: string;
  clients: Client[];
  appointments: Appointment[];
  payments: Payment[];
  measurements: Measurement[];
  services: Service[];
  packages: Package[];
  clientPackages: ClientPackage[];
  bookingDateFilter: string;
  onCompleteAppointment: (id: string, options?: AppointmentMutationOptions) => Promise<CrmActionResult>;
  onCancelAppointment: (id: string, options?: AppointmentMutationOptions) => Promise<CrmActionResult>;
  onOpenTab: (tab: SubTabId) => void;
  onRegisterClientClick: () => void;
  onBookAppointmentClick: () => void;
  onLogPaymentClick: () => void;
  onLogMeasurementsClick: () => void;
}

export function ManagerDashboard({
  centerId,
  clients,
  appointments,
  payments,
  measurements,
  services,
  packages,
  clientPackages,
  bookingDateFilter,
  onCompleteAppointment,
  onCancelAppointment,
  onOpenTab,
  onRegisterClientClick,
  onBookAppointmentClick,
  onLogPaymentClick,
  onLogMeasurementsClick
}: ManagerDashboardProps) {
  // 1. Gender filtering state & Affluence Tab state
  const [genderFilter, setGenderFilter] = useState<'All' | 'F' | 'H'>('All');
  const [affluenceTab, setAffluenceTab] = useState<'weekday' | 'hourly' | 'monthly' | 'revenue'>('weekday');
  const [hoveredManagerRevenuePoint, setHoveredManagerRevenuePoint] = useState<number | null>(null);

  // Filter core lists
  const centerClients = clients.filter(c => c.centerId === centerId);
  const centerAppointments = appointments.filter(a => a.centerId === centerId);
  const todayBookings = centerAppointments.filter(a => a.dateTime.startsWith(bookingDateFilter));

  // Filter based on selected gender
  const filteredClients = centerClients.filter(c => genderFilter === 'All' || c.gender === genderFilter);

  const filteredAppointments = centerAppointments.filter(a => {
    const cl = centerClients.find(c => c.id === a.clientId);
    return genderFilter === 'All' || (cl && cl.gender === genderFilter);
  });

  const filteredPayments = payments.filter(p => p.centerId === centerId).filter(p => {
    const cl = centerClients.find(c => c.id === p.clientId);
    return genderFilter === 'All' || (cl && cl.gender === genderFilter);
  });

  const filteredMeasurements = measurements.filter(m => {
    const cl = centerClients.find(c => c.id === m.clientId);
    return cl && cl.centerId === centerId && (genderFilter === 'All' || cl.gender === genderFilter);
  });

  // Filtered computed values
  const filteredClientsCount = filteredClients.length;
  const filteredRevenue = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const filteredAppointmentsCount = filteredAppointments.length;
  const filteredMeasurementsCount = filteredMeasurements.length;

  // --- ALERTES METIER ---

  // 1. Forfaits sur le point d'expirer (< 7 jours restants, actifs)
  const centerClientIds = new Set(centerClients.map(c => c.id));
  const centerClientPackages = clientPackages.filter(cp => centerClientIds.has(cp.clientId));
  
  const expiringPackages = centerClientPackages.filter(cp => {
    if (cp.status !== 'active' || cp.sessionsRemaining <= 0) return false;
    if (!cp.purchaseDate) return false;
    const purchase = new Date(cp.purchaseDate);
    if (isNaN(purchase.getTime())) return false;
    const diffDays = (Date.now() - purchase.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 38 && diffDays <= 45; // Entre 38 et 45 jours = expire dans < 7j
  });

  const expiringCount = expiringPackages.length;
  const expiredPackages = centerClientPackages.filter(cp => isPackageExpired(cp) && cp.status !== 'expired' && cp.status !== 'completed');
  const expiredCount = expiredPackages.length;

  // 2. Clients en solde négatif (aucun forfait actif valide, ni expiré réglé)
  const negativeBalanceClients = centerClients.filter(client => {
    const clientPkgs = centerClientPackages.filter(cp => cp.clientId === client.id);
    const hasValidPackage = clientPkgs.some(cp =>
      cp.status === 'active' &&
      cp.sessionsRemaining > 0 &&
      !isPackageExpired(cp)
    );
    return !hasValidPackage;
  });
  const negativeBalanceCount = negativeBalanceClients.length;

  // 3. Résumé journalier des séances du jour
  const todayCompleted = todayBookings.filter(a => a.status === 'completed').length;
  const todayBooked = todayBookings.filter(a => a.status === 'booked').length;
  const todayTotal = todayBookings.length;
  const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // Global static breakdowns (for the visual breakdown panels)
  const totalClients = centerClients.length || 1;
  const womenCount = centerClients.filter(c => c.gender === 'F' || !c.gender).length;
  const menCount = centerClients.filter(c => c.gender === 'H').length;
  const womenPercent = Math.round((womenCount / totalClients) * 100);
  const menPercent = Math.round((menCount / totalClients) * 100);

  // Scheduled session technology breakdown (AQ8 vs Wonder)
  let aq8SessionsCount = 0;
  let wonderSessionsCount = 0;
  let mixSessionsCount = 0;

  filteredAppointments.forEach(apt => {
    if (apt.status === 'cancelled') return;

    const service = services.find(s => s.id === apt.serviceId);
    if (service?.type === 'aq8') aq8SessionsCount++;
    else if (service?.type === 'wonder') wonderSessionsCount++;
    else mixSessionsCount++;
  });

  const totalActiveSessions = aq8SessionsCount + wonderSessionsCount + mixSessionsCount || 1;
  const aq8SubPercent = Math.round((aq8SessionsCount / totalActiveSessions) * 100);
  const wonderSubPercent = Math.round((wonderSessionsCount / totalActiveSessions) * 100);
  const mixSubPercent = Math.round((mixSessionsCount / totalActiveSessions) * 100);

  // Weekday distribution (Sun=0, Mon=1, etc.)
  const weekDaysFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const weekdayCounts = Array(7).fill(0);
  filteredAppointments.forEach(apt => {
    if (apt.status !== 'cancelled') {
      const datePart = apt.dateTime.split('T')[0];
      if (datePart) {
        const d = new Date(datePart);
        if (!isNaN(d.getTime())) {
          weekdayCounts[d.getDay()]++;
        }
      }
    }
  });
  const maxWeekdayVal = Math.max(...weekdayCounts, 1);

  // Hourly distribution
  const hourlyLabels = ['Matinée (08h-12h)', 'Midi (12h-15h)', 'Après-midi (15h-18h)', 'Soirée (18h-21h)'];
  const hourlyCounts = [0, 0, 0, 0]; // Matin, Midi, Après-midi, Soirée
  filteredAppointments.forEach(apt => {
    if (apt.status !== 'cancelled') {
      const timePart = apt.dateTime.split('T')[1];
      if (timePart) {
        const hour = parseInt(timePart.split(':')[0], 10);
        if (hour >= 8 && hour < 12) hourlyCounts[0]++;
        else if (hour >= 12 && hour < 15) hourlyCounts[1]++;
        else if (hour >= 15 && hour < 18) hourlyCounts[2]++;
        else if (hour >= 18 && hour <= 21) hourlyCounts[3]++;
      }
    }
  });
  const maxHourlyVal = Math.max(...hourlyCounts, 1);

  // Monthly distribution
  const monthsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyCounts = Array(12).fill(0);
  filteredAppointments.forEach(apt => {
    if (apt.status !== 'cancelled') {
      const datePart = apt.dateTime.split('T')[0];
      if (datePart) {
        const d = new Date(datePart);
        if (!isNaN(d.getTime())) {
          monthlyCounts[d.getMonth()]++;
        }
      }
    }
  });
  const maxMonthlyVal = Math.max(...monthlyCounts, 1);
  // Local revenue trend for this center
  const getLocalRevenueTrendData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const centerPayments = payments.filter(payment => payment.centerId === centerId);
    const validDates = centerPayments
      .map(payment => new Date(payment.date))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const latestDate = validDates.at(-1) || new Date();
    const startMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() - 5, 1);

    return Array.from({ length: 6 }, (_, index) => {
      const currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
      const monthlyPayments = centerPayments.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate.getFullYear() === currentMonth.getFullYear() && paymentDate.getMonth() === currentMonth.getMonth();
      });
      const total = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: `${months[currentMonth.getMonth()]} ${String(currentMonth.getFullYear()).slice(-2)}`,
        value: total
      };
    });
  };

  return (
    <div id="manager-dashboard" className="space-y-6">
      {/* Upper filter bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Filtre Analytique Sexe / Genre :</span>
        </div>
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setGenderFilter('All')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              genderFilter === 'All' ? 'bg-[#353535] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tous ({centerClients.length})
          </button>
          <button
            onClick={() => setGenderFilter('F')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              genderFilter === 'F' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Venus className="h-3.5 w-3.5 shrink-0" />
            Femmes ({womenCount})
          </button>
          <button
            onClick={() => setGenderFilter('H')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              genderFilter === 'H' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mars className="h-3.5 w-3.5 shrink-0" />
            Hommes ({menCount})
          </button>
        </div>
      </div>

      {/* Stat metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-clients"
          title="Membres Abonnés"
          value={filteredClientsCount}
          icon={Users}
          iconBgClass={genderFilter === 'F' ? 'bg-rose-50' : genderFilter === 'H' ? 'bg-blue-50' : 'bg-slate-100'}
          iconColorClass={genderFilter === 'F' ? 'text-rose-600' : genderFilter === 'H' ? 'text-blue-600' : 'text-slate-700'}
          trend={{ text: "↑ 4 nouveaux ce mois", isPositive: true }}
          borderLeftClass={genderFilter === 'F' ? 'border-l-4 border-l-rose-500' : genderFilter === 'H' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-blue-500'}
        />
        <StatCard
          id="stat-revenue"
          title="Chiffre d'Affaires"
          value={formatDZD(filteredRevenue)}
          icon={DollarSign}
          iconBgClass="bg-emerald-50"
          iconColorClass="text-emerald-600"
          trend={{ text: "↑ 14.5% vs mois dernier", isPositive: true }}
          borderLeftClass="border-l-4 border-l-emerald-500"
        />
        <StatCard
          id="stat-bookings"
          title="Nombre de Réservations"
          value={filteredAppointmentsCount}
          icon={Calendar}
          iconBgClass="bg-amber-50"
          iconColorClass="text-amber-600"
          trend={{ text: "↑ 9.2% taux d'occupation", isPositive: true }}
          borderLeftClass="border-l-4 border-l-amber-500"
        />
        <StatCard
          id="stat-measurements"
          title="Suivis Mensurations"
          value={filteredMeasurementsCount}
          icon={Scale}
          iconBgClass="bg-rose-50 text-rose-500"
          iconColorClass="text-[#ff5757]"
          trend={{ text: "↑ 3 nouveaux bilans", isPositive: true }}
          borderLeftClass="border-l-4 border-l-rose-500"
        />
      </div>

      {/* === ALERTES MÉTIER === */}
      {(expiringCount > 0 || expiredCount > 0 || negativeBalanceCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Alerte: Forfaits sur le point d'expirer */}
          {expiringCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl"
            >
              <div className="h-9 w-9 shrink-0 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800">Forfaits expirant bientôt</p>
                <p className="text-[11px] text-amber-700 font-medium leading-snug mt-0.5">
                  <span className="font-mono font-black text-sm text-amber-900">{expiringCount}</span> forfait{expiringCount > 1 ? 's' : ''} arrive{expiringCount > 1 ? 'nt' : ''} à échéance dans moins de 7 jours.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenTab('clients')}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline mt-1 cursor-pointer"
                >
                  Voir les membres →
                </button>
              </div>
            </motion.div>
          )}

          {/* Alerte: Forfaits déjà expirés non clôturés */}
          {expiredCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl"
            >
              <div className="h-9 w-9 shrink-0 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-800">Forfaits expirés détectés</p>
                <p className="text-[11px] text-rose-700 font-medium leading-snug mt-0.5">
                  <span className="font-mono font-black text-sm text-rose-900">{expiredCount}</span> forfait{expiredCount > 1 ? 's' : ''} dépassé{expiredCount > 1 ? 's' : ''} la limite de 45 jours — séances bloquées.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenTab('clients')}
                  className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline mt-1 cursor-pointer"
                >
                  Régulariser →
                </button>
              </div>
            </motion.div>
          )}

          {/* Alerte: Clients sans forfait valide */}
          {negativeBalanceCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl"
            >
              <div className="h-9 w-9 shrink-0 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700">Membres sans crédit valide</p>
                <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5">
                  <span className="font-mono font-black text-sm text-slate-900">{negativeBalanceCount}</span> membre{negativeBalanceCount > 1 ? 's' : ''} sans forfait actif — à régulariser en cabine.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenTab('clients')}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline mt-1 cursor-pointer"
                >
                  Voir les membres →
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Résumé journalier en haut du tableau de bord */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-[#ff5757]/10 rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-[#ff5757]" />
            </div>
            <div>
              <h3 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Résumé de la Journée</h3>
              <p className="text-[10px] text-slate-400 font-medium">Suivi des séances en temps réel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenTab('schedule')}
            className="self-start sm:self-auto text-xs text-[#ff5757] font-semibold hover:underline cursor-pointer"
          >
            Ouvrir le planning →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total aujourd'hui */}
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Planifiées</span>
            <span className="text-2xl font-black font-mono text-slate-800">{todayTotal}</span>
            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">séances</span>
          </div>

          {/* Effectuées */}
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">Effectuées</span>
            <span className="text-2xl font-black font-mono text-emerald-700">{todayCompleted}</span>
            <span className="text-[10px] font-semibold text-emerald-500 block mt-0.5">confirmées</span>
          </div>

          {/* À valider */}
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">À Valider</span>
            <span className="text-2xl font-black font-mono text-amber-700">{todayBooked}</span>
            <span className="text-[10px] font-semibold text-amber-500 block mt-0.5">en attente</span>
          </div>

          {/* Taux d'avancement */}
          <div className="bg-[#ff5757]/5 rounded-xl p-3 text-center border border-[#ff5757]/15 relative overflow-hidden">
            <span className="text-[9px] font-bold text-[#ff5757] uppercase tracking-wider block mb-1">Avancement</span>
            <span className="text-2xl font-black font-mono text-[#ff5757]">{todayCompletionRate}%</span>
            <span className="text-[10px] font-semibold text-[#ff5757]/70 block mt-0.5">taux du jour</span>
            {/* Thin progress underline */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff5757]/10">
              <div
                className="h-full bg-[#ff5757] transition-all duration-700"
                style={{ width: `${todayCompletionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytique breakdown rows (Gender + Technologies) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Gender Breakdown Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Venus className="h-4 w-4 text-rose-500" />
            <Mars className="h-4 w-4 text-blue-500" />
            <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Répartition Homme / Femme</h4>
          </div>

          <div className="space-y-4 pt-1">
            {/* Split Progress bar */}
            <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${womenPercent}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Femmes: ${womenPercent}%`}
              ></div>
              <div
                style={{ width: `${menPercent}%` }}
                className="bg-blue-600 transition-all duration-500"
                title={`Hommes: ${menPercent}%`}
              ></div>
            </div>

            {/* Labels and values */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50">
                <Venus className="h-4 w-4 text-rose-500 animate-pulse" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Femmes</span>
                  <span className="text-rose-700 font-bold font-display text-sm">{womenCount}</span>
                  <span className="text-slate-400 text-[10px] ml-1">({womenPercent}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                <Mars className="h-4 w-4 text-blue-600 animate-pulse" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Hommes</span>
                  <span className="text-blue-700 font-bold font-display text-sm">{menCount}</span>
                  <span className="text-slate-400 text-[10px] ml-1">({menPercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: AQ8 vs Wonder Breakdown Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#ff5757]" />
            <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Séances par Technologie</h4>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="space-y-2">
              {/* AQ8 Progress */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">AQ8 Électrostimulation</span>
                  <span className="font-mono text-slate-800">{aq8SessionsCount} séances ({aq8SubPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${aq8SubPercent}%` }} className="h-full bg-[#ff5757] rounded-full transition-all duration-500"></div>
                </div>
              </div>

              {/* Wonder Progress */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Wonder Muscle Sculpt</span>
                  <span className="font-mono text-slate-800">{wonderSessionsCount} séances ({wonderSubPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${wonderSubPercent}%` }} className="h-full bg-[#353535] rounded-full transition-all duration-500"></div>
                </div>
              </div>

              {/* Mixed Cure Progress */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Autres / non classées</span>
                  <span className="font-mono text-slate-800">{mixSessionsCount} séances ({mixSubPercent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${mixSubPercent}%` }} className="h-full bg-slate-400 rounded-full transition-all duration-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Occupancy Gauge Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Taux d'Occupation Créneaux</h4>
          </div>

          {(() => {
            const centerCapacities: Record<string, { men: number; women: number }> = {
              'center-1': { men: 40, women: 56 },
              'center-2': { men: 0, women: 80 },
              'center-3': { men: 0, women: 60 },
              'center-4': { men: 50, women: 50 },
              'center-5': { men: 48, women: 48 }
            };

            const caps = centerCapacities[centerId] || { men: 40, women: 40 };

            const menBookings = filteredAppointments.filter(a => {
              const cl = clients.find(c => c.id === a.clientId);
              return cl && cl.gender === 'H' && a.status !== 'cancelled';
            }).length;

            const womenBookings = filteredAppointments.filter(a => {
              const cl = clients.find(c => c.id === a.clientId);
              return cl && (cl.gender === 'F' || !cl.gender) && a.status !== 'cancelled';
            }).length;

            const menRate = caps.men > 0 ? Math.min(100, Math.round((menBookings / caps.men) * 100)) : 0;
            const womenRate = caps.women > 0 ? Math.min(100, Math.round((womenBookings / caps.women) * 100)) : 0;

            const radius = 18;
            const circ = 2 * Math.PI * radius; // ~113

            return (
              <div className="grid grid-cols-2 gap-2 pt-1 flex-1 items-center">
                {/* Women occupancy */}
                <div className="flex flex-col items-center bg-rose-50/20 border border-rose-100/30 p-2.5 rounded-xl text-center space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Femmes</span>
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                      <motion.circle
                        cx="22"
                        cy="22"
                        r={radius}
                        fill="none"
                        stroke="#ff5757"
                        strokeWidth="3"
                        strokeDasharray={circ}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ - (womenRate / 100) * circ }}
                        transition={{ duration: 1.0, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono">
                      <span className="text-[10px] font-bold text-slate-800">{womenRate}%</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">{womenBookings}/{caps.women} RDV</span>
                </div>

                {/* Men occupancy */}
                <div className="flex flex-col items-center bg-blue-50/20 border border-blue-100/30 p-2.5 rounded-xl text-center space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Hommes</span>
                  {caps.men > 0 ? (
                    <>
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                          <motion.circle
                            cx="22"
                            cy="22"
                            r={radius}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeDasharray={circ}
                            initial={{ strokeDashoffset: circ }}
                            animate={{ strokeDashoffset: circ - (menRate / 100) * circ }}
                            transition={{ duration: 1.0, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-mono">
                          <span className="text-[10px] font-bold text-slate-800">{menRate}%</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold">{menBookings}/{caps.men} RDV</span>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-3 text-[9px] text-slate-400 italic font-semibold">
                      <Venus className="h-5 w-5 text-rose-400 opacity-60 mb-0.5" />
                      <span>Femmes Uniq.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Visual Chart for Attendance / Affluence */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <h3 className="font-bold font-display text-slate-800 text-sm">Analyses d'Activité & Finances</h3>
            <p className="text-[10px] text-slate-400">Suivi d'affluence et chiffre d'affaires ({genderFilter === 'All' ? 'Tous les genres' : genderFilter === 'F' ? 'Femmes' : 'Hommes'})</p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50 flex-wrap gap-1">
            <button
              onClick={() => setAffluenceTab('weekday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                affluenceTab === 'weekday' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Par Jour
            </button>
            <button
              onClick={() => setAffluenceTab('hourly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                affluenceTab === 'hourly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Par Créneau
            </button>
            <button
              onClick={() => setAffluenceTab('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                affluenceTab === 'monthly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Par Mois
            </button>
            <button
              onClick={() => setAffluenceTab('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                affluenceTab === 'revenue' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chiffre d'Affaires
            </button>
          </div>
        </div>

        {/* Dynamic Affluence Graphs using clean SVG-styled components */}
        <div className="pt-4">
          {affluenceTab === 'weekday' && (
            <div className="space-y-4">
              <div className="flex items-end justify-between h-48 pt-6 border-b border-slate-100 px-4 gap-3 sm:gap-6">
                {weekDaysFr.map((day, i) => {
                  const count = weekdayCounts[i];
                  const heightPct = (count / maxWeekdayVal) * 85;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="w-full bg-slate-50 rounded-t-lg relative flex items-end h-32 border border-slate-100/50">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${count > 0 ? heightPct : 4}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`w-full rounded-t-md ${
                            count > 0 ? 'bg-gradient-to-t from-[#353535] to-[#ff5757] group-hover:to-rose-400' : 'bg-slate-200/50'
                          }`}
                        ></motion.div>
                        {/* Hover Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-xs">
                          {count} séance{count > 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center items-center gap-4 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#ff5757] rounded-sm"></div>
                  <span>Densité d'affluence active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-slate-200" rounded-sm></div>
                  <span>Journée calme / Aucun RDV</span>
                </div>
              </div>
            </div>
          )}

          {affluenceTab === 'hourly' && (
            <div className="space-y-3">
              {hourlyLabels.map((label, i) => {
                const count = hourlyCounts[i];
                const pct = (count / maxHourlyVal) * 100;
                return (
                  <div key={label} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700">{label}</span>
                      <span className="font-mono text-slate-500">{count} séance{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${count > 0 ? pct : 1}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-slate-700 to-[#ff5757]"
                      ></motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {affluenceTab === 'monthly' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 text-xs">
              {monthsFr.map((month, i) => {
                const count = monthlyCounts[i];
                const pct = (count / maxMonthlyVal) * 100;
                return (
                  <div key={month} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 block">{month}</span>
                    <div className="h-16 w-3 bg-slate-100 rounded-full relative flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${count > 0 ? pct : 4}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full bg-[#ff5757] rounded-full"
                      ></motion.div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {affluenceTab === 'revenue' && (
            <div className="space-y-4">
              {(() => {
                const trendData = getLocalRevenueTrendData();
                const maxVal = Math.max(...trendData.map(d => d.value), 20000);
                const width = 500;
                const height = 150;
                const paddingLeft = 60;
                const paddingRight = 40;
                const chartWidth = width - paddingLeft - paddingRight;
                const stepX = chartWidth / (trendData.length - 1);

                // Compute points
                const points = trendData.map((d, idx) => {
                  const x = paddingLeft + idx * stepX;
                  const y = height - 20 - (d.value / maxVal) * (height - 40);
                  return { x, y, ...d };
                });

                // Build path using smooth cubic Bézier curves
                let linePath = `M ${points[0].x} ${points[0].y} `;
                let areaPath = `M ${points[0].x} ${height - 20} L ${points[0].x} ${points[0].y} `;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[i];
                  const p1 = points[i + 1];
                  const cp1x = p0.x + (p1.x - p0.x) / 3;
                  const cp1y = p0.y;
                  const cp2x = p1.x - (p1.x - p0.x) / 3;
                  const cp2y = p1.y;
                  linePath += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} `;
                  areaPath += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} `;
                }
                areaPath += `L ${points[points.length - 1].x} ${height - 20} Z`;

                return (
                  <div className="w-full h-full flex flex-col justify-between">
                    <div className="relative flex-1 h-36">
                      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="localAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff5757" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ff5757" stopOpacity="0.0" />
                          </linearGradient>
                          {/* Glowing effect filter */}
                          <filter id="localGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Horizontal grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                          const y = height - 20 - pct * (height - 40);
                          const labelVal = Math.round(pct * maxVal);
                          return (
                            <g key={i} className="opacity-40">
                              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" strokeWidth="1" />
                              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[9px] font-semibold fill-slate-400 font-mono">
                                {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}
                              </text>
                            </g>
                          );
                        })}

                        {/* Gradient Area under curve */}
                        <motion.path
                          d={areaPath}
                          fill="url(#localAreaGrad)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8, delay: 0.5 }}
                        />

                        {/* Line path with Glow filter */}
                        <motion.path
                          d={linePath}
                          fill="none"
                          stroke="#ff5757"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#localGlow)"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                        />

                        {/* Interactive dots and hover hitboxes */}
                        {points.map((p, i) => (
                          <g key={i} className="group/dot cursor-pointer">
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredManagerRevenuePoint === i ? "6" : "4"}
                              fill={hoveredManagerRevenuePoint === i ? "#ff5757" : "white"}
                              stroke="#ff5757"
                              strokeWidth="2"
                              style={{ transition: "all 0.15s ease" }}
                            />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="16"
                              fill="transparent"
                              onMouseEnter={() => setHoveredManagerRevenuePoint(i)}
                              onMouseLeave={() => setHoveredManagerRevenuePoint(null)}
                            />
                          </g>
                        ))}
                      </svg>

                      {/* Interactive Tooltip popup */}
                      {hoveredManagerRevenuePoint !== null && (
                        <div
                          className="absolute chart-tooltip text-white p-2 rounded-xl shadow-lg border border-slate-700/50 pointer-events-none z-30 font-mono text-[10px]"
                          style={{
                            left: `${(points[hoveredManagerRevenuePoint].x / width) * 100}%`,
                            top: `${(points[hoveredManagerRevenuePoint].y / height) * 100 - 35}%`,
                            transform: "translateX(-50%)"
                          }}
                        >
                          <span className="text-[8px] text-slate-400 font-sans block uppercase font-bold">{trendData[hoveredManagerRevenuePoint].label}</span>
                          <span className="text-xs font-bold text-[#ff5757]">{trendData[hoveredManagerRevenuePoint].value.toLocaleString()} DZD</span>
                        </div>
                      )}
                    </div>

                    {/* X-axis Labels */}
                    <div className="flex justify-between pl-[60px] pr-[40px] text-[10px] font-bold text-slate-400 font-sans pt-1">
                      {trendData.map(d => (
                        <span key={d.label}>{d.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Grid content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bookings panel today */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Séances d'Aujourd'hui</h3>
              {todayBooked > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {todayBooked} à valider
                </span>
              )}
            </div>
            <button
              onClick={() => onOpenTab('schedule')}
              className="text-xs text-[#ff5757] font-semibold hover:underline cursor-pointer"
            >
              Planning →
            </button>
          </div>

          {todayBookings.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {todayBookings.map(apt => {
                const cl = centerClients.find(c => c.id === apt.clientId);
                const srv = services.find(s => s.id === apt.serviceId);
                // Check if client has valid credit
                const clientPkgs = centerClientPackages.filter(cp => cp.clientId === apt.clientId);
                const hasCredit = clientPkgs.some(cp =>
                  cp.status === 'active' && cp.sessionsRemaining > 0 && !isPackageExpired(cp)
                );
                return (
                  <div key={apt.id} className="py-3 flex justify-between items-center text-xs gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">
                          {cl ? `${cl.firstName} ${cl.lastName}` : 'Client Inconnu'}
                        </span>
                        {!hasCredit && apt.status === 'booked' && (
                          <span className="shrink-0 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                            ⚠ Sans crédit
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{apt.dateTime.split('T')[1]}</span>
                        <span>•</span>
                        <span>{srv?.name || 'Prestation'}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {apt.status === 'booked' ? (
                        <>
                          <button
                            onClick={() => onCompleteAppointment(apt.id)}
                            className="px-2 py-1 bg-green-50 text-green-600 rounded-md font-bold text-[10px] hover:bg-green-100 transition cursor-pointer"
                          >
                            Effectuée
                          </button>
                          <button
                            onClick={() => onCancelAppointment(apt.id)}
                            className="px-2 py-1 bg-slate-50 text-slate-500 rounded-md font-bold text-[10px] hover:bg-slate-100 transition cursor-pointer"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {apt.status === 'completed' ? 'Effectuée' : 'Annulée'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <p>Aucune séance planifiée pour aujourd'hui.</p>
              <button
                onClick={onBookAppointmentClick}
                className="text-[#ff5757] font-semibold hover:underline cursor-pointer"
              >
                Planifier un rendez-vous maintenant
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <QuickActionsCard
          onRegisterClient={onRegisterClientClick}
          onBookAppointment={onBookAppointmentClick}
          onLogPayment={onLogPaymentClick}
          onLogMeasurements={onLogMeasurementsClick}
        />
      </div>
    </div>
  );
}
