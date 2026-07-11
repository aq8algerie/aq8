/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building,
  Users,
  Award,
  BarChart3,
  Settings,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Clock,
  Sliders,
  DollarSign,
  Briefcase,
  AlertCircle,
  Venus,
  Mars,
  Activity,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';
import { Center, CenterManager, Service, Package, GeneralSettings, Client, ClientPackage, Payment, Appointment } from '../types';

export function SuperAdminViews({
  centers,
  managers,
  services,
  packages,
  settings,
  appointmentsCount,
  paymentsCount,
  totalRevenue,
  clients = [],
  clientPackages = [],
  payments = [],
  appointments = [],
  onUpdateCenters,
  onUpdateManagers,
  onUpdateServices,
  onUpdatePackages,
  onUpdateSettings,
  activeTab,
  onTabChange
}: {
  centers: Center[];
  managers: CenterManager[];
  services: Service[];
  packages: Package[];
  settings: GeneralSettings;
  appointmentsCount: number;
  paymentsCount: number;
  totalRevenue: number;
  clients?: Client[];
  clientPackages?: ClientPackage[];
  payments?: Payment[];
  appointments?: Appointment[];
  onUpdateCenters: (centers: Center[]) => void;
  onUpdateManagers: (managers: CenterManager[]) => void;
  onUpdateServices: (services: Service[]) => void;
  onUpdatePackages: (packages: Package[]) => void;
  onUpdateSettings: (settings: GeneralSettings) => void;
  activeTab?: 'dashboard' | 'centers' | 'managers' | 'stats' | 'settings';
  onTabChange?: (tab: 'dashboard' | 'centers' | 'managers' | 'stats' | 'settings') => void;
}) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<'dashboard' | 'centers' | 'managers' | 'stats' | 'settings'>('dashboard');
  const activeSubTab = activeTab || localActiveSubTab;
  const setActiveSubTab = onTabChange || setLocalActiveSubTab;

  // Selected Center for occupancy statistics, hovered point for revenue and dashboard chart selector
  const [occupancyCenterId, setOccupancyCenterId] = useState<string>('center-1');
  const [hoveredRevenuePoint, setHoveredRevenuePoint] = useState<number | null>(null);
  const [dashboardChartTab, setDashboardChartTab] = useState<'revenue' | 'clients'>('revenue');

  // Centers view states (Grid with "Voir Plus" / List with Pagination)
  const [centersViewMode, setCentersViewMode] = useState<'grid' | 'list'>('grid');
  const [gridLimit, setGridLimit] = useState<number>(3);
  const [listPage, setListPage] = useState<number>(1);

  // Managers view states (Grid with "Voir Plus" / List with Pagination)
  const [managersViewMode, setManagersViewMode] = useState<'grid' | 'list'>('grid');
  const [managersGridLimit, setManagersGridLimit] = useState<number>(3);
  const [managersListPage, setManagersListPage] = useState<number>(1);


  // Helper to calculate monthly revenue trend
  const getRevenueTrendData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = [];
    for (let i = 2; i <= 6; i++) {
      const mName = months[i];
      const mPayments = payments.filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === 2026 && d.getMonth() === i;
      });
      const total = mPayments.reduce((sum, p) => sum + p.amount, 0);
      data.push({ label: mName, value: total });
    }
    return data;
  };

  // Modal States
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);

  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editingManager, setEditingManager] = useState<CenterManager | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form States - Center
  const [centerName, setCenterName] = useState('');
  const [centerCity, setCenterCity] = useState('Alger');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerEmail, setCenterEmail] = useState('');
  const [centerSchedule, setCenterSchedule] = useState('');
  const [centerDesc, setCenterDesc] = useState('');
  const [centerHasAq8, setCenterHasAq8] = useState(true);
  const [centerHasWonder, setCenterHasWonder] = useState(true);
  const [centerImg, setCenterImg] = useState('');

  // Customizable advanced Center States
  const [centerStatus, setCenterStatus] = useState('active');
  const [centerMenHours, setCenterMenHours] = useState<string[]>([]);
  const [centerWomenHours, setCenterWomenHours] = useState<string[]>([]);
  const [centerCustomServicePrices, setCenterCustomServicePrices] = useState<Record<string, number>>({});
  const [centerCustomPackagePrices, setCenterCustomPackagePrices] = useState<Record<string, number>>({});
  const [centerCustomActiveServices, setCenterCustomActiveServices] = useState<string[]>([]);
  const [centerCustomActivePackages, setCenterCustomActivePackages] = useState<string[]>([]);
  const [centerEquipment, setCenterEquipment] = useState<string[]>([]);
  const [centerCancellationRule, setCenterCancellationRule] = useState('');
  const [centerImportantNotes, setCenterImportantNotes] = useState<string[]>([]);

  // Subscription States
  const [centerSubscriptionStatus, setCenterSubscriptionStatus] = useState<'active' | 'suspended' | 'trial'>('active');
  const [centerSubscriptionExpiryDate, setCenterSubscriptionExpiryDate] = useState('2026-12-31');
  const [centerSubscriptionPlan, setCenterSubscriptionPlan] = useState<'basic' | 'premium' | 'trial'>('basic');

  // Array temp input states
  const [newMenHour, setNewMenHour] = useState('');
  const [newWomenHour, setNewWomenHour] = useState('');
  const [newEquip, setNewEquip] = useState('');
  const [newNote, setNewNote] = useState('');

  // Modal active tab state
  const [centerModalTab, setCenterModalTab] = useState<'general' | 'hours' | 'equipment' | 'notes' | 'subscription'>('general');

  // Form States - Manager
  const [mgrName, setMgrName] = useState('');
  const [mgrEmail, setMgrEmail] = useState('');
  const [mgrCenterId, setMgrCenterId] = useState('');
  const [mgrActive, setMgrActive] = useState(true);

  // Form States - Service
  const [srvName, setSrvName] = useState('');
  const [srvType, setSrvType] = useState<'aq8' | 'wonder'>('aq8');
  const [srvDuration, setSrvDuration] = useState(20);
  const [srvPrice, setSrvPrice] = useState(3000);
  const [srvDesc, setSrvDesc] = useState('');

  // Form States - Settings
  const [settEmail, setSettEmail] = useState(settings.contactEmail);
  const [settPhone, setSettPhone] = useState(settings.contactPhone);
  const [settAddress, setSettAddress] = useState(settings.addressAlgérie);
  const [settPromo, setSettPromo] = useState(settings.enableVoucherPromo);

  // Open Center Modal
  const openCenterModal = (center: Center | null) => {
    setCenterModalTab('general');
    setNewMenHour('');
    setNewWomenHour('');
    setNewEquip('');
    setNewNote('');
    if (center) {
      setEditingCenter(center);
      setCenterName(center.name);
      setCenterCity(center.city);
      setCenterAddress(center.address);
      setCenterPhone(center.phone);
      setCenterEmail(center.email);
      setCenterSchedule(center.schedule);
      setCenterDesc(center.description);
      setCenterHasAq8(center.services.includes('aq8'));
      setCenterHasWonder(center.services.includes('wonder'));
      setCenterImg(center.imageUrl);
      setCenterStatus(center.status || 'active');
      setCenterMenHours(center.menHours || []);
      setCenterWomenHours(center.womenHours || []);
      setCenterEquipment(center.equipment || []);
      setCenterCancellationRule(center.cancellationRule || 'Annulation gratuite jusqu\'à 24h avant la séance.');
      setCenterImportantNotes(center.importantNotes || []);
      setCenterSubscriptionStatus(center.subscriptionStatus || 'active');
      setCenterSubscriptionExpiryDate(center.subscriptionExpiryDate || '2026-12-31');
      setCenterSubscriptionPlan(center.subscriptionPlan || 'premium');

      setCenterCustomServicePrices(center.customServicePrices || {});
      setCenterCustomPackagePrices(center.customPackagePrices || {});
      setCenterCustomActiveServices(center.customActiveServices || services.map(s => s.id));
      setCenterCustomActivePackages(center.customActivePackages || packages.map(p => p.id));

      // Pre-fill associated manager access info
      const associatedMgr = managers.find(m => m.centerId === center.id);
      if (associatedMgr) {
        setMgrName(associatedMgr.name);
        setMgrEmail(associatedMgr.email);
        setMgrActive(associatedMgr.active);
      } else {
        setMgrName('');
        setMgrEmail('');
        setMgrActive(true);
      }
    } else {
      setEditingCenter(null);
      setCenterName('');
      setCenterCity('Alger');
      setCenterAddress('');
      setCenterPhone('');
      setCenterEmail('');
      setCenterSchedule('Samedi - Jeudi: 08:00 - 20:00 | Vendredi: Fermé');
      setCenterDesc('');
      setCenterHasAq8(true);
      setCenterHasWonder(true);
      setCenterImg('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop');
      setCenterStatus('active');
      setCenterMenHours(['08:00 - 12:00', '16:00 - 20:00']);
      setCenterWomenHours(['12:00 - 16:00']);
      setCenterEquipment(['Combinaisons EMS AQ8', 'Appareils Wonder Muscle Sculptor']);
      setCenterCancellationRule('Toute annulation de séance doit être effectuée 24 heures à l\'avance.');
      setCenterImportantNotes([
        'Veuillez arriver 10 minutes avant votre séance pour enfiler la combinaison.',
        'Pensez à bien vous hydrater avant et après l\'effort.'
      ]);
      setCenterSubscriptionStatus('trial');
      setCenterSubscriptionExpiryDate('2026-08-10');
      setCenterSubscriptionPlan('trial');

      const defaultSrvPrices: Record<string, number> = {};
      services.forEach(s => { defaultSrvPrices[s.id] = s.price; });
      const defaultPkgPrices: Record<string, number> = {};
      packages.forEach(p => { defaultPkgPrices[p.id] = p.price; });

      setCenterCustomServicePrices(defaultSrvPrices);
      setCenterCustomPackagePrices(defaultPkgPrices);
      setCenterCustomActiveServices(services.map(s => s.id));
      setCenterCustomActivePackages(packages.map(p => p.id));

      // Defaults for new manager
      setMgrName('');
      setMgrEmail('');
      setMgrActive(true);
    }
    setShowCenterModal(true);
  };

  const handleCenterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const servicesList: ('aq8' | 'wonder')[] = [];
    if (centerHasAq8) servicesList.push('aq8');
    if (centerHasWonder) servicesList.push('wonder');

    const calculatedSlug = centerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const centerIdToUse = editingCenter ? editingCenter.id : `center-${Date.now()}`;

    // 1. Create or update center
    if (editingCenter) {
      const updated = centers.map(c => c.id === editingCenter.id ? {
        ...c,
        name: centerName,
        city: centerCity,
        address: centerAddress,
        phone: centerPhone,
        email: centerEmail,
        schedule: centerSchedule,
        description: centerDesc,
        services: servicesList,
        imageUrl: centerImg,
        status: centerStatus,
        slug: calculatedSlug,
        menHours: centerMenHours,
        womenHours: centerWomenHours,
        equipment: centerEquipment,
        cancellationRule: centerCancellationRule,
        importantNotes: centerImportantNotes,
        customServicePrices: centerCustomServicePrices,
        customPackagePrices: centerCustomPackagePrices,
        customActiveServices: centerCustomActiveServices,
        customActivePackages: centerCustomActivePackages,
        subscriptionStatus: centerSubscriptionStatus,
        subscriptionExpiryDate: centerSubscriptionExpiryDate,
        subscriptionPlan: centerSubscriptionPlan
      } : c);
      onUpdateCenters(updated);
    } else {
      const newCenter: Center = {
        id: centerIdToUse,
        name: centerName,
        city: centerCity,
        address: centerAddress,
        phone: centerPhone,
        email: centerEmail,
        schedule: centerSchedule,
        description: centerDesc,
        services: servicesList,
        imageUrl: centerImg,
        status: centerStatus,
        slug: calculatedSlug,
        menHours: centerMenHours,
        womenHours: centerWomenHours,
        equipment: centerEquipment,
        cancellationRule: centerCancellationRule,
        importantNotes: centerImportantNotes,
        customServicePrices: centerCustomServicePrices,
        customPackagePrices: centerCustomPackagePrices,
        customActiveServices: centerCustomActiveServices,
        customActivePackages: centerCustomActivePackages,
        subscriptionStatus: centerSubscriptionStatus,
        subscriptionExpiryDate: centerSubscriptionExpiryDate,
        subscriptionPlan: centerSubscriptionPlan
      };
      onUpdateCenters([...centers, newCenter]);
    }

    // 2. Create or update associated manager
    if (mgrName.trim() && mgrEmail.trim()) {
      const associatedMgr = managers.find(m => m.centerId === centerIdToUse);
      if (associatedMgr) {
        // Update manager
        const updatedManagers = managers.map(m => m.id === associatedMgr.id ? {
          ...m,
          name: mgrName.trim(),
          email: mgrEmail.trim(),
          active: mgrActive
        } : m);
        onUpdateManagers(updatedManagers);
      } else {
        // Create manager
        const newMgr: CenterManager = {
          id: `mgr-${Date.now()}`,
          name: mgrName.trim(),
          email: mgrEmail.trim(),
          centerId: centerIdToUse,
          active: mgrActive
        };
        onUpdateManagers([...managers, newMgr]);
      }
    }

    setShowCenterModal(false);
  };

  const handleDeleteCenter = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce centre ? Tous les clients et réservations associés seront orphelins.')) {
      onUpdateCenters(centers.filter(c => c.id !== id));
    }
  };

  // Open Manager Modal
  const openManagerModal = (mgr: CenterManager | null) => {
    if (mgr) {
      setEditingManager(mgr);
      setMgrName(mgr.name);
      setMgrEmail(mgr.email);
      setMgrCenterId(mgr.centerId);
      setMgrActive(mgr.active);
    } else {
      setEditingManager(null);
      setMgrName('');
      setMgrEmail('');
      setMgrCenterId(centers[0]?.id || '');
      setMgrActive(true);
    }
    setShowManagerModal(true);
  };

  const handleManagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingManager) {
      const targetEmail = editingManager.email.toLowerCase().trim();
      const updated = managers.map(m => m.email.toLowerCase().trim() === targetEmail ? {
        ...m,
        name: mgrName.trim(),
        email: mgrEmail.trim(),
        active: mgrActive
      } : m);
      onUpdateManagers(updated);
    } else {
      const newMgr: CenterManager = {
        id: `mgr-${Date.now()}`,
        name: mgrName.trim(),
        email: mgrEmail.trim(),
        centerId: mgrCenterId,
        active: mgrActive
      };
      onUpdateManagers([...managers, newMgr]);
    }
    setShowManagerModal(false);
  };

  const handleDeleteManager = (email: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce gérant ainsi que tous ses accès ?')) {
      const targetEmail = email.toLowerCase().trim();
      onUpdateManagers(managers.filter(m => m.email.toLowerCase().trim() !== targetEmail));
    }
  };

  const toggleManagerActive = (email: string, currentActive: boolean) => {
    const targetEmail = email.toLowerCase().trim();
    const updated = managers.map(m => m.email.toLowerCase().trim() === targetEmail ? { ...m, active: !currentActive } : m);
    onUpdateManagers(updated);
  };

  // Open Service Modal
  const openServiceModal = (srv: Service | null) => {
    if (srv) {
      setEditingService(srv);
      setSrvName(srv.name);
      setSrvType(srv.type);
      setSrvDuration(srv.duration);
      setSrvPrice(srv.price);
      setSrvDesc(srv.description);
    } else {
      setEditingService(null);
      setSrvName('');
      setSrvType('aq8');
      setSrvDuration(20);
      setSrvPrice(3000);
      setSrvDesc('');
    }
    setShowServiceModal(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      const updated = services.map(s => s.id === editingService.id ? {
        ...s,
        name: srvName,
        type: srvType,
        duration: srvDuration,
        price: srvPrice,
        description: srvDesc
      } : s);
      onUpdateServices(updated);
    } else {
      const newSrv: Service = {
        id: `srv-${Date.now()}`,
        name: srvName,
        type: srvType,
        duration: srvDuration,
        price: srvPrice,
        description: srvDesc
      };
      onUpdateServices([...services, newSrv]);
    }
    setShowServiceModal(false);
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette prestation ?')) {
      onUpdateServices(services.filter(s => s.id !== id));
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      contactEmail: settEmail,
      contactPhone: settPhone,
      addressAlgérie: settAddress,
      enableVoucherPromo: settPromo
    });
    alert('Paramètres enregistrés avec succès !');
  };

  // Calculations for Super Admin KPIs (Nombre de centres, adhérents par centre, adhérents AQ8 & Wonder)
  const aq8ClientsCount = clients.filter(c => {
    const clientPkgs = clientPackages.filter(cp => cp.clientId === c.id);
    return clientPkgs.some(cp => {
      const pkg = packages.find(p => p.id === cp.packageId);
      return pkg && (pkg.type === 'aq8' || pkg.type === 'mix');
    });
  }).length;

  const wonderClientsCount = clients.filter(c => {
    const clientPkgs = clientPackages.filter(cp => cp.clientId === c.id);
    return clientPkgs.some(cp => {
      const pkg = packages.find(p => p.id === cp.packageId);
      return pkg && (pkg.type === 'wonder' || pkg.type === 'mix');
    });
  }).length;

  const avgClientsPerCenter = centers.length ? (clients.length / centers.length).toFixed(1) : '0';

  // Find max clients in a single center for bar chart scale
  const centerClientCounts = centers.map(c => clients.filter(cli => cli.centerId === c.id).length);
  const maxCenterClients = Math.max(...centerClientCounts, 1);

  return (
    <div className="space-y-6">
      {/* Superadmin Internal Sub-Navigation bar */}
      {!activeTab && (
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-px scrollbar-thin">
          {[
            { id: 'dashboard', label: 'Vue Globale', icon: BarChart3 },
            { id: 'centers', label: 'Gestion Centres', icon: Building },
            { id: 'managers', label: 'Managers & Accès', icon: Users },
            { id: 'services', label: 'Prestations & Tarifs', icon: Award },
            { id: 'stats', label: 'Analyses', icon: BarChart3 },
            { id: 'settings', label: 'Paramètres généraux', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-premium border-b-2 -mb-px ${activeSubTab === tab.id ? 'border-[#ff5757] text-[#ff5757]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* RENDER ACTIVE TAB */}

      {/* A. Vue Globale (Dashboard) */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-blue-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Centres Actifs</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{centers.length}</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg"><Building className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>+1</span>
                <span className="text-slate-400 font-medium">ce mois-ci</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-emerald-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne d'Adhérents</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{avgClientsPerCenter}</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg"><Users className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 8.2%</span>
                <span className="text-slate-400 font-medium">vs mai</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-rose-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adhérents AQ8 (EMS)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{aq8ClientsCount}</span>
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-[#ff5757] rounded-lg"><Award className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 15.3%</span>
                <span className="text-slate-400 font-medium">ce mois</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adhérents Wonder</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{wonderClientsCount}</span>
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg"><CheckCircle className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 12.0%</span>
                <span className="text-slate-400 font-medium">ce mois</span>
              </div>
            </div>
          </div>

          {/* Quick lists and chart */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Tabbed Premium SVG Chart representing center contribution or revenue trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold font-display text-slate-800 text-sm">
                    {dashboardChartTab === 'revenue' ? "Tendance du Chiffre d'Affaires Global" : "Nombre d'Adhérents par Centre"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {dashboardChartTab === 'revenue' ? "Revenus consolidés sur l'ensemble du réseau (DZD)" : "Total d'adhérents inscrits par établissement"}
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 text-[11px] font-bold text-slate-600">
                  <button
                    onClick={() => setDashboardChartTab('revenue')}
                    className={`px-3 py-1 rounded-lg transition ${dashboardChartTab === 'revenue' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    Chiffre d'Affaires
                  </button>
                  <button
                    onClick={() => setDashboardChartTab('clients')}
                    className={`px-3 py-1 rounded-lg transition ${dashboardChartTab === 'clients' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    Adhérents / Centre
                  </button>
                </div>
              </div>

              {dashboardChartTab === 'revenue' ? (
                /* LINE CHART SVG */
                <div className="h-60 pt-6 relative">
                  {(() => {
                    const trendData = getRevenueTrendData();
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
                        <div className="relative flex-1">
                          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff5757" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#ff5757" stopOpacity="0.0" />
                              </linearGradient>
                              {/* Glowing effect filter */}
                              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
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
                            <path d={areaPath} fill="url(#areaGrad)" />

                            {/* Line path with Glow filter */}
                            <path d={linePath} fill="none" stroke="#ff5757" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

                            {/* Interactive dots and hover hitboxes */}
                            {points.map((p, i) => (
                              <g key={i} className="group/dot cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={hoveredRevenuePoint === i ? "6" : "4"}
                                  fill={hoveredRevenuePoint === i ? "#ff5757" : "white"}
                                  stroke="#ff5757"
                                  strokeWidth="2"
                                  style={{ transition: "all 0.15s ease" }}
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="16"
                                  fill="transparent"
                                  onMouseEnter={() => setHoveredRevenuePoint(i)}
                                  onMouseLeave={() => setHoveredRevenuePoint(null)}
                                />
                              </g>
                            ))}
                          </svg>

                          {/* Interactive Tooltip popup */}
                          {hoveredRevenuePoint !== null && (
                            <div
                              className="absolute chart-tooltip text-white p-2 rounded-xl shadow-lg border border-slate-700/50 pointer-events-none z-30 font-mono text-[10px]"
                              style={{
                                left: `${(points[hoveredRevenuePoint].x / width) * 100}%`,
                                top: `${(points[hoveredRevenuePoint].y / height) * 100 - 35}%`,
                                transform: "translateX(-50%)"
                              }}
                            >
                              <span className="text-[8px] text-slate-400 font-sans block uppercase font-bold">{trendData[hoveredRevenuePoint].label} 2026</span>
                              <span className="text-xs font-bold text-[#ff5757]">{trendData[hoveredRevenuePoint].value.toLocaleString()} DZD</span>
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
              ) : (
                /* Custom SVG Bar Chart (Existing count of clients per center) */
                <div className="h-60 flex items-end justify-between gap-4 pt-6 px-4">
                  {centers.map((c) => {
                    const count = clients.filter(cli => cli.centerId === c.id).length;
                    const pct = (count / maxCenterClients) * 85; // Max 85% height
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-40">
                          <div
                            style={{ height: `${pct || 4}%` }}
                            className="w-full bg-gradient-to-t from-[#353535] to-[#ff5757] rounded-t-lg transition-all duration-500 group-hover:to-rose-400"
                          ></div>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono z-10 font-bold">
                            {count} Adhérent{count > 1 ? 's' : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Quick Action Board & summary info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold font-display text-slate-800 text-sm">Raccourcis Administrateur</h3>
                <p className="text-xs text-slate-500">Gérez l'infrastructure globale AQ8 Algérie d'un simple clic.</p>

                <div className="space-y-2">
                  <button
                    onClick={() => openCenterModal(null)}
                    className="w-full py-2.5 px-3 bg-[#353535] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un nouveau centre
                  </button>
                  <button
                    onClick={() => openManagerModal(null)}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Créer un compte manager
                  </button>
                  <button
                    onClick={() => openServiceModal(null)}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter une prestation
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  En tant que <strong>Super Admin</strong>, vos modifications sur les tarifs, centres et services s'appliquent immédiatement sur le site public et sur le planning des managers de chaque centre.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. Gestion Centres */}
      {activeSubTab === 'centers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold font-display text-slate-800 text-base">Réseau des Centres AQ8 ({centers.length})</h3>
              <p className="text-[10px] text-slate-400">Gérez les implantations géographiques et le statut des établissements.</p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setCentersViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    centersViewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCentersViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    centersViewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Liste"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Nouveau Centre Button */}
              <button
                type="button"
                onClick={() => openCenterModal(null)}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Nouveau Centre
              </button>
            </div>
          </div>

          {/* VIEW: GRID MODE (Default) */}
          {centersViewMode === 'grid' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {centers.slice(0, gridLimit).map(center => {
                  const clientCount = clients.filter(c => c.centerId === center.id).length;
                  const statusColors: Record<string, string> = {
                    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
                    construction: 'bg-blue-50 text-blue-700 border-blue-100'
                  };
                  const statusLabel: Record<string, string> = {
                    active: 'Opérationnel',
                    maintenance: 'En Maintenance',
                    construction: 'En Construction'
                  };

                  return (
                    <div key={center.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col group">
                      {/* Image Header with Badge */}
                      <div className="h-40 relative bg-slate-100 overflow-hidden">
                        <img
                          src={center.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'}
                          alt={center.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'; }}
                        />
                        <span className={`absolute top-3 left-3 border text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[center.status || 'active']}`}>
                          {statusLabel[center.status || 'active']}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-[#353535]">{center.name}</h4>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px]">{center.city}</span>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 line-clamp-2">{center.description || 'Aucune description disponible.'}</p>
                          
                          <div className="space-y-1.5 text-[11px] text-slate-600 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{center.address}</span></div>
                            <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {center.phone}</div>
                            <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {center.email}</div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-50">
                          {/* Services */}
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Services</span>
                            <div className="flex gap-1">
                              {center.services.map(s => (
                                <span key={s} className={`px-1.5 py-0.5 rounded-sm uppercase ${s === 'aq8' ? 'bg-[#ff5757]/10 text-[#ff5757]' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Member count */}
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Membres</span>
                            <span className="font-mono text-slate-700">{clientCount} adhérents</span>
                          </div>

                          {/* Subscription info */}
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Abonnement</span>
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className={`px-1.5 py-0.5 rounded-sm uppercase ${
                                center.subscriptionStatus === 'suspended' ? 'bg-red-500/10 text-red-600' :
                                center.subscriptionStatus === 'trial' ? 'bg-blue-500/10 text-blue-600' :
                                'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {center.subscriptionStatus === 'suspended' ? 'Suspendu' :
                                 center.subscriptionStatus === 'trial' ? 'Essai' :
                                 'Actif'}
                              </span>
                              {center.subscriptionExpiryDate && (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  ({center.subscriptionExpiryDate})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => openCenterModal(center)}
                              className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-[10px] border border-slate-150 transition-premium cursor-pointer text-center"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCenter(center.id)}
                              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-[10px] border border-red-100 transition-premium cursor-pointer text-center"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid "Voir Plus" Button */}
              {centers.length > gridLimit && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setGridLimit(gridLimit + 3)}
                    className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
                  >
                    Afficher plus de centres ({centers.length - gridLimit} restants)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: LIST/TABLE MODE WITH PAGINATION */}
          {centersViewMode === 'list' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                      <tr>
                        <th className="p-4">Centre</th>
                        <th className="p-4">Ville</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Prestations</th>
                        <th className="p-4">Abonnement</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(() => {
                        const pageSize = 4;
                        const startIndex = (listPage - 1) * pageSize;
                        const pageData = centers.slice(startIndex, startIndex + pageSize);

                        return (
                          <>
                            {pageData.map(center => {
                              const statusLabel: Record<string, string> = {
                                active: 'Opérationnel',
                                maintenance: 'Maintenance',
                                construction: 'En Construction'
                              };
                              const statusClass: Record<string, string> = {
                                active: 'bg-emerald-50 text-emerald-700',
                                maintenance: 'bg-amber-50 text-amber-700',
                                construction: 'bg-blue-50 text-blue-700'
                              };

                              return (
                                <tr key={center.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-bold text-[#353535]">{center.name}</td>
                                  <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px]">{center.city}</span>
                                  </td>
                                  <td className="p-4 space-y-0.5 text-[11px]">
                                    <div className="flex items-center gap-1 text-slate-500"><Phone className="h-3 w-3 shrink-0" /> {center.phone}</div>
                                    <div className="flex items-center gap-1 text-slate-500"><Mail className="h-3 w-3 shrink-0" /> {center.email}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-1">
                                      {center.services.map(s => (
                                        <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${s === 'aq8' ? 'bg-[#ff5757]/15 text-[#ff5757]' : 'bg-amber-500/15 text-amber-600'}`}>
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      center.subscriptionStatus === 'suspended' ? 'bg-red-100 text-red-700' :
                                      center.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {center.subscriptionStatus === 'suspended' ? 'Suspendu' :
                                       center.subscriptionStatus === 'trial' ? 'Essai' :
                                       'Actif'}
                                    </span>
                                    {center.subscriptionExpiryDate && (
                                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                        Exp: {center.subscriptionExpiryDate}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusClass[center.status || 'active']}`}>
                                      {statusLabel[center.status || 'active']}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openCenterModal(center)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-premium cursor-pointer"
                                        title="Modifier"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCenter(center.id)}
                                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-premium cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* List Pagination Controls */}
              {(() => {
                const pageSize = 4;
                const totalPages = Math.ceil(centers.length / pageSize);
                if (totalPages <= 1) return null;

                return (
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
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* C. Gestion Managers */}
      {activeSubTab === 'managers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold font-display text-slate-800 text-base">Gérants de Centres & Accès CRM ({
                (() => {
                  const map: Record<string, boolean> = {};
                  managers.forEach(m => { map[m.email.toLowerCase().trim()] = true; });
                  return Object.keys(map).length;
                })()
              })</h3>
              <p className="text-[10px] text-slate-400 font-medium">Visualisez et configurez les droits d'accès des gérants de vos centres.</p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setManagersViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    managersViewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setManagersViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    managersViewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Vue Liste"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Nouveau Manager Button */}
              <button
                type="button"
                onClick={() => openManagerModal(null)}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-xs text-white rounded-xl transition-premium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Nouveau Manager
              </button>
            </div>
          </div>

          {/* Grouped Unique Managers list */}
          {(() => {
            const map: Record<string, {
              id: string;
              name: string;
              email: string;
              centersList: Array<{ id: string; name: string; city: string }>;
              active: boolean;
              rawManager: CenterManager;
            }> = {};

            managers.forEach(mgr => {
              const emailKey = mgr.email.toLowerCase().trim();
              const matchedCenter = centers.find(c => c.id === mgr.centerId);
              if (!map[emailKey]) {
                map[emailKey] = {
                  id: mgr.id,
                  name: mgr.name,
                  email: mgr.email,
                  centersList: [],
                  active: mgr.active,
                  rawManager: mgr
                };
              }
              if (matchedCenter) {
                map[emailKey].centersList.push({
                  id: matchedCenter.id,
                  name: matchedCenter.name,
                  city: matchedCenter.city
                });
              }
              // If at least one center assignment is active, keep active
              map[emailKey].active = map[emailKey].active || mgr.active;
            });

            const uniqueMgrs = Object.values(map);

            return (
              <>
                {/* GRID VIEW (Default) */}
                {managersViewMode === 'grid' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {uniqueMgrs.slice(0, managersGridLimit).map(mgr => {
                        const initial = mgr.name.trim().charAt(0).toUpperCase() || 'M';
                        return (
                          <div key={mgr.email} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden">
                            {/* Accent line on hover */}
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#ff5757] to-amber-500 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>

                            <div className="space-y-3">
                              {/* Profile Header */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#353535] to-[#454545] text-white flex items-center justify-center font-bold font-display shadow-xs uppercase">
                                  {initial}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-[#353535]">{mgr.name}</h4>
                                  <span className="text-[10px] font-mono text-slate-400">{mgr.email}</span>
                                </div>
                              </div>

                              {/* Managed Centers List */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Centres Gérés</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {mgr.centersList.map(c => (
                                    <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-150">
                                      <Building className="h-3 w-3 text-[#ff5757]" />
                                      {c.name} ({c.city})
                                    </span>
                                  ))}
                                  {mgr.centersList.length === 0 && (
                                    <span className="text-slate-400 text-[10px] italic">Aucun centre affecté</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Footer Status & Actions */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                              <button
                                type="button"
                                onClick={() => toggleManagerActive(mgr.email, mgr.active)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition border cursor-pointer ${
                                  mgr.active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${mgr.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {mgr.active ? 'Accès Actif' : 'Bloqué'}
                              </button>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openManagerModal(mgr.rawManager)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteManager(mgr.email)}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-red-50 transition cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Voir Plus Button */}
                    {uniqueMgrs.length > managersGridLimit && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setManagersGridLimit(managersGridLimit + 3)}
                          className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-premium cursor-pointer"
                        >
                          Afficher plus de gérants ({uniqueMgrs.length - managersGridLimit} restants)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* LIST VIEW (Table with pagination) */}
                {managersViewMode === 'list' && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100 uppercase text-[10px]">
                            <tr>
                              <th className="p-4">Manager</th>
                              <th className="p-4">E-mail de Connexion</th>
                              <th className="p-4">Centres Affectés</th>
                              <th className="p-4">Statut d'Accès</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {(() => {
                              const pageSize = 4;
                              const startIndex = (managersListPage - 1) * pageSize;
                              const pageData = uniqueMgrs.slice(startIndex, startIndex + pageSize);

                              return (
                                <>
                                  {pageData.map(mgr => (
                                    <tr key={mgr.email} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="p-4 font-bold text-[#353535]">{mgr.name}</td>
                                      <td className="p-4 font-mono text-[11px] text-slate-500">{mgr.email}</td>
                                      <td className="p-4">
                                        <div className="flex gap-1 flex-wrap">
                                          {mgr.centersList.map(c => (
                                            <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-slate-150">
                                              {c.name}
                                            </span>
                                          ))}
                                          {mgr.centersList.length === 0 && (
                                            <span className="text-slate-400 text-[10px] italic">Non affecté</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <button
                                          type="button"
                                          onClick={() => toggleManagerActive(mgr.email, mgr.active)}
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                                            mgr.active ? 'bg-green-50 text-green-600 border-green-150' : 'bg-slate-100 text-slate-400 border-slate-200'
                                          }`}
                                        >
                                          {mgr.active ? 'Actif' : 'Désactivé'}
                                        </button>
                                      </td>
                                      <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openManagerModal(mgr.rawManager)}
                                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-premium cursor-pointer"
                                            title="Modifier"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteManager(mgr.email)}
                                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-premium cursor-pointer"
                                            title="Supprimer"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {(() => {
                      const pageSize = 4;
                      const totalPages = Math.ceil(uniqueMgrs.length / pageSize);
                      if (totalPages <= 1) return null;

                      return (
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150 text-xs font-bold text-slate-600">
                          <button
                            type="button"
                            disabled={managersListPage === 1}
                            onClick={() => setManagersListPage(managersListPage - 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          >
                            Précédent
                          </button>
                          <span>Page {managersListPage} sur {totalPages}</span>
                          <button
                            type="button"
                            disabled={managersListPage === totalPages}
                            onClick={() => setManagersListPage(managersListPage + 1)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          >
                            Suivant
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* E. Analyses / Stats */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Donut Chart: Adhérents par technologie */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Répartition des Adhérents par Technologie</h4>
              
              <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-4">
                {(() => {
                  const totalTechs = aq8ClientsCount + wonderClientsCount || 1;
                  const aq8Percent = Math.round((aq8ClientsCount / totalTechs) * 100);
                  const wonderPercent = 100 - aq8Percent;
                  return (
                    <>
                      <div className="relative w-36 h-36">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ff5757" strokeWidth="3.5" strokeDasharray={`${aq8Percent} ${wonderPercent}`} strokeDashoffset="25" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#353535" strokeWidth="3.5" strokeDasharray={`${wonderPercent} ${aq8Percent}`} strokeDashoffset={`${25 + aq8Percent}`} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold font-display text-slate-800">{clients.length}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Membres</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="w-3 h-3 bg-[#ff5757] rounded-sm shrink-0"></div>
                          <div>
                            <span className="text-slate-600 font-medium block">AQ8 Électrostimulation (EMS)</span>
                            <span className="font-bold font-mono text-slate-800 text-xs">{aq8ClientsCount} membres ({aq8Percent}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="w-3 h-3 bg-[#353535] rounded-sm shrink-0"></div>
                          <div>
                            <span className="text-slate-600 font-medium block">Wonder Muscle Sculpt</span>
                            <span className="font-bold font-mono text-slate-800 text-xs">{wonderClientsCount} membres ({wonderPercent}%)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Radial Gauges: Taux de Remplissage des Créneaux Hommes vs Femmes */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Remplissage des Créneaux</h4>
                
                {/* Center Selector Dropdown */}
                <select
                  value={occupancyCenterId}
                  onChange={(e) => setOccupancyCenterId(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 text-[#353535] rounded-xl text-[11px] font-bold px-3 py-1.5 focus:outline-none border border-slate-200"
                >
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const centerCapacities: Record<string, { men: number; women: number }> = {
                  'center-1': { men: 40, women: 56 },
                  'center-2': { men: 0, women: 80 },
                  'center-3': { men: 0, women: 60 },
                  'center-4': { men: 50, women: 50 },
                  'center-5': { men: 48, women: 48 }
                };

                const getCenterOccupancy = (cId: string) => {
                  const centerApts = appointments.filter(a => a.centerId === cId && a.status !== 'cancelled');
                  const caps = centerCapacities[cId] || { men: 40, women: 40 };

                  const menBookings = centerApts.filter(a => {
                    const cl = clients.find(c => c.id === a.clientId);
                    return cl && cl.gender === 'H';
                  }).length;

                  const womenBookings = centerApts.filter(a => {
                    const cl = clients.find(c => c.id === a.clientId);
                    return cl && (cl.gender === 'F' || !cl.gender);
                  }).length;

                  const menRate = caps.men > 0 ? Math.min(100, Math.round((menBookings / caps.men) * 100)) : 0;
                  const womenRate = caps.women > 0 ? Math.min(100, Math.round((womenBookings / caps.women) * 100)) : 0;

                  return { menBookings, menCapacity: caps.men, menRate, womenBookings, womenCapacity: caps.women, womenRate };
                };

                const occ = getCenterOccupancy(occupancyCenterId);
                const radius = 22;
                const circ = 2 * Math.PI * radius; // ~138.2

                return (
                  <div className="grid grid-cols-2 gap-4 py-2">
                    {/* Women Gauge */}
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-50/20 border border-rose-100/30 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Créneaux Femmes</span>
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
                          <circle
                            cx="25"
                            cy="25"
                            r={radius}
                            fill="none"
                            stroke="#ff5757"
                            strokeWidth="3.5"
                            strokeDasharray={circ}
                            strokeDashoffset={circ - (occ.womenRate / 100) * circ}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                          <span className="text-sm font-bold text-slate-800">{occ.womenRate}%</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {occ.womenBookings} / {occ.womenCapacity} RDVs actifs
                      </div>
                    </div>

                    {/* Men Gauge */}
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-blue-50/20 border border-blue-100/30 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Créneaux Hommes</span>
                      {occ.menCapacity > 0 ? (
                        <>
                          <div className="relative w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                              <circle cx="25" cy="25" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
                              <circle
                                cx="25"
                                cy="25"
                                r={radius}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3.5"
                                strokeDasharray={circ}
                                strokeDashoffset={circ - (occ.menRate / 100) * circ}
                                strokeLinecap="round"
                                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                              <span className="text-sm font-bold text-slate-800">{occ.menRate}%</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {occ.menBookings} / {occ.menCapacity} RDVs actifs
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400 text-[10px] italic">
                          <Venus className="h-8 w-8 text-rose-400 opacity-60 mb-2" />
                          <span>Centre réservé aux femmes uniquement</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bar Chart: Chiffre d'Affaires par Centre */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Chiffre d'Affaires Consolidé par Centre</h4>
            
            {(() => {
              const getCenterRevenues = () => {
                return centers.map(c => {
                  const cPayments = payments.filter(p => p.centerId === c.id);
                  const total = cPayments.reduce((sum, p) => sum + p.amount, 0);
                  return { name: c.name, revenue: total };
                });
              };

              const data = getCenterRevenues();
              const maxRev = Math.max(...data.map(d => d.revenue), 10000);

              return (
                <div className="space-y-4 pt-2">
                  {data.map(d => {
                    const widthPct = (d.revenue / maxRev) * 100;
                    return (
                      <div key={d.name} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#353535]">{d.name}</span>
                          <span className="font-mono text-[#ff5757]">{d.revenue.toLocaleString()} DZD</span>
                        </div>
                        <div className="h-4 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50">
                          <div
                            style={{ width: `${d.revenue > 0 ? widthPct : 2}%` }}
                            className="h-full bg-gradient-to-r from-slate-700 to-[#ff5757] rounded-lg transition-all duration-500"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* F. Settings */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs max-w-xl">
          <h3 className="font-bold font-display text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">Configuration Générale AQ8</h3>
          
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">E-mail Général de contact</label>
                <input
                  type="email"
                  value={settEmail}
                  onChange={(e) => setSettEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Téléphone Siège</label>
                <input
                  type="text"
                  value={settPhone}
                  onChange={(e) => setSettPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 block">Adresse Centrale (Siège)</label>
              <input
                type="text"
                value={settAddress}
                onChange={(e) => setSettAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">Activer l'offre découverte sur le site</span>
                <span className="text-[10px] text-slate-500">Affiche l'appel à l'action pour réserver la séance découverte d'essai.</span>
              </div>
              <input
                type="checkbox"
                checked={settPromo}
                onChange={(e) => setSettPromo(e.target.checked)}
                className="h-4 w-4 accent-[#ff5757]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#353535] hover:bg-slate-800 font-semibold text-white rounded-xl transition-premium cursor-pointer"
            >
              Enregistrer les Paramètres
            </button>
          </form>
        </div>
      )}

      {/* --- ALL MODALS --- */}

      {/* 1. Center Modal */}
      {showCenterModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h4 className="font-bold text-slate-800 text-sm font-display">
                  {editingCenter ? `Modifier le centre : ${centerName}` : 'Ajouter un nouveau centre'}
                </h4>
                <p className="text-[10px] text-slate-400">Configurez l'infrastructure, les horaires et les services de l'établissement.</p>
              </div>
              <button onClick={() => setShowCenterModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1 overflow-x-auto scrollbar-none shrink-0">
              {[
                { id: 'general', label: '1. Général', icon: Building },
                { id: 'hours', label: '2. Horaires & Genres', icon: Clock },
                { id: 'equipment', label: '3. Équipements', icon: Layers },
                { id: 'notes', label: '4. Règles & Consignes', icon: AlertCircle },
                { id: 'subscription', label: '5. Abonnement CRM', icon: ShieldCheck }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCenterModalTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      centerModalTab === tab.id
                        ? 'bg-white text-[#ff5757] shadow-xs border border-slate-100'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <form onSubmit={handleCenterSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* TAB 1: GENERAL */}
              {centerModalTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Nom du Centre *</label>
                      <input
                        type="text" required value={centerName} onChange={(e) => setCenterName(e.target.value)}
                        placeholder="AQ8 Sidi Yahia" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Wilaya / Ville *</label>
                      <select
                        value={centerCity} onChange={(e) => setCenterCity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                      >
                        <option value="Alger">Alger</option>
                        <option value="Oran">Oran</option>
                        <option value="Constantine">Constantine</option>
                        <option value="Blida">Blida</option>
                        <option value="Tlemcen">Tlemcen</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Adresse Complète *</label>
                    <input
                      type="text" required value={centerAddress} onChange={(e) => setCenterAddress(e.target.value)}
                      placeholder="Avenue Sidi Yahia, Hydra, Alger" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Téléphone Direct *</label>
                      <input
                        type="text" required value={centerPhone} onChange={(e) => setCenterPhone(e.target.value)}
                        placeholder="+213 (0) 23 48 90 91" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">E-mail Professionnel *</label>
                      <input
                        type="email" required value={centerEmail} onChange={(e) => setCenterEmail(e.target.value)}
                        placeholder="sidiyahia@aq8algerie.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                      />
                    </div>
                  </div>

                  {/* Image Select with Presets & Live Preview */}
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 block">Photo du Centre</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2 space-y-1.5">
                        <input
                          type="text" value={centerImg} onChange={(e) => setCenterImg(e.target.value)}
                          placeholder="URL de l'image ou choisissez un modèle" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                        />
                        {/* Image Presets Selector */}
                        <div className="flex gap-2">
                          {[
                            { name: 'Fitness Moderne', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop' },
                            { name: 'Studio EMS', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop' },
                            { name: 'Premium Gym', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop' }
                          ].map(preset => (
                            <button
                              key={preset.name} type="button"
                              onClick={() => setCenterImg(preset.url)}
                              className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md cursor-pointer"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/50 flex items-center justify-center relative group">
                        {centerImg ? (
                          <img src={centerImg} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop'; }} />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Pas d'image</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Description marketing courte</label>
                    <textarea
                      rows={3} value={centerDesc} onChange={(e) => setCenterDesc(e.target.value)}
                      placeholder="Le studio premium AQ8 d'Alger..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                    ></textarea>
                  </div>

                  {/* Manager & Access Credentials Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                      <Users className="h-4 w-4 text-[#ff5757]" />
                      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Gérant & Accès CRM du Centre</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">Nom complet du Gérant *</label>
                        <input
                          type="text" required value={mgrName} onChange={(e) => setMgrName(e.target.value)}
                          placeholder="Amel Mansouri" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#ff5757]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600 block">E-mail d'Accès (Login) *</label>
                        <input
                          type="email" required value={mgrEmail} onChange={(e) => setMgrEmail(e.target.value)}
                          placeholder="amel@aq8algerie.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#ff5757]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">Autoriser la connexion immédiate au CRM</span>
                      <input
                        type="checkbox" checked={mgrActive} onChange={(e) => setMgrActive(e.target.checked)}
                        className="h-4 w-4 accent-green-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HOURS */}
              {centerModalTab === 'hours' && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Horaires d'Ouverture Généraux *</label>
                    <input
                      type="text" required value={centerSchedule} onChange={(e) => setCenterSchedule(e.target.value)}
                      placeholder="Samedi - Jeudi: 08:00 - 20:00 | Vendredi: Fermé" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                    />
                  </div>

                  {/* Men Hours Tag Editor */}
                  <div className="space-y-2 p-4 bg-blue-50/20 border border-blue-100/30 rounded-2xl">
                    <div className="flex items-center gap-1 text-blue-600 font-bold mb-1">
                      <Mars className="h-4 w-4" />
                      <span>Créneaux Horaires Hommes</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {centerMenHours.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          {h}
                          <button type="button" onClick={() => setCenterMenHours(centerMenHours.filter((_, idx) => idx !== i))} className="hover:text-blue-900 font-bold ml-1 text-[9px] cursor-pointer">✕</button>
                        </span>
                      ))}
                      {centerMenHours.length === 0 && <span className="text-slate-400 text-[10px] italic">Aucun créneau homme configuré</span>}
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <input
                        type="text" placeholder="Ajouter créneau (ex: 08:00 - 12:00)" value={newMenHour} onChange={(e) => setNewMenHour(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-[11px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newMenHour.trim()) {
                              setCenterMenHours([...centerMenHours, newMenHour.trim()]);
                              setNewMenHour('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newMenHour.trim()) {
                            setCenterMenHours([...centerMenHours, newMenHour.trim()]);
                            setNewMenHour('');
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Women Hours Tag Editor */}
                  <div className="space-y-2 p-4 bg-rose-50/20 border border-rose-100/30 rounded-2xl">
                    <div className="flex items-center gap-1 text-rose-500 font-bold mb-1">
                      <Venus className="h-4 w-4" />
                      <span>Créneaux Horaires Femmes</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {centerWomenHours.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          {h}
                          <button type="button" onClick={() => setCenterWomenHours(centerWomenHours.filter((_, idx) => idx !== i))} className="hover:text-rose-900 font-bold ml-1 text-[9px] cursor-pointer">✕</button>
                        </span>
                      ))}
                      {centerWomenHours.length === 0 && <span className="text-slate-400 text-[10px] italic">Aucun créneau femme configuré</span>}
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <input
                        type="text" placeholder="Ajouter créneau (ex: 12:00 - 16:00)" value={newWomenHour} onChange={(e) => setNewWomenHour(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none text-[11px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newWomenHour.trim()) {
                              setCenterWomenHours([...centerWomenHours, newWomenHour.trim()]);
                              setNewWomenHour('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newWomenHour.trim()) {
                            setCenterWomenHours([...centerWomenHours, newWomenHour.trim()]);
                            setNewWomenHour('');
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EQUIPMENT */}
              {centerModalTab === 'equipment' && (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                    <span className="font-bold text-slate-700 block">Prestations Offertes</span>
                    <div className="flex gap-6 font-semibold text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={centerHasAq8} onChange={(e) => setCenterHasAq8(e.target.checked)} className="accent-[#ff5757] h-4 w-4" />
                        <span>AQ8 EMS (Électrostimulation)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={centerHasWonder} onChange={(e) => setCenterHasWonder(e.target.checked)} className="accent-amber-500 h-4 w-4" />
                        <span>Wonder Muscle Sculpt</span>
                      </label>
                    </div>
                  </div>

                  {/* Equipment Tag Editor */}
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 block">Équipements du Centre</label>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {centerEquipment.map((eq, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                          {eq}
                          <button type="button" onClick={() => setCenterEquipment(centerEquipment.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer">✕</button>
                        </span>
                      ))}
                      {centerEquipment.length === 0 && <span className="text-slate-400 text-[10px] italic">Aucun équipement renseigné</span>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text" placeholder="Ajouter équipement (ex: 4 consoles AQ8 sans fil)" value={newEquip} onChange={(e) => setNewEquip(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none text-[11px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newEquip.trim()) {
                              setCenterEquipment([...centerEquipment, newEquip.trim()]);
                              setNewEquip('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newEquip.trim()) {
                            setCenterEquipment([...centerEquipment, newEquip.trim()]);
                            setNewEquip('');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#353535] hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Tarification locale des Prestations */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">Tarification & Habilitation des Prestations</span>
                      <p className="text-[10px] text-slate-400">Sélectionnez les prestations actives dans ce centre et indiquez leur tarif local.</p>
                    </div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {services.map(srv => {
                        const isActive = centerCustomActiveServices.includes(srv.id);
                        const price = centerCustomServicePrices[srv.id] !== undefined ? centerCustomServicePrices[srv.id] : srv.price;
                        return (
                          <div key={srv.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCenterCustomActiveServices([...centerCustomActiveServices, srv.id]);
                                  } else {
                                    setCenterCustomActiveServices(centerCustomActiveServices.filter(id => id !== srv.id));
                                  }
                                }}
                                className="accent-[#ff5757] h-3.5 w-3.5"
                              />
                              <span className={`font-semibold text-slate-700 truncate text-[11px] ${!isActive && 'line-through text-slate-400'}`}>
                                {srv.name} ({srv.duration} min)
                              </span>
                            </label>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                disabled={!isActive}
                                value={price}
                                onChange={(e) => {
                                  setCenterCustomServicePrices({
                                    ...centerCustomServicePrices,
                                    [srv.id]: Number(e.target.value)
                                  });
                                }}
                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 text-[10px]"
                                placeholder="Tarif DZD"
                              />
                              <span className="text-[9px] font-bold text-slate-400">DZD</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarification locale des Forfaits */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">Tarification & Habilitation des Forfaits</span>
                      <p className="text-[10px] text-slate-400">Configurez les abonnements disponibles pour ce centre et leurs prix de vente.</p>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {packages.map(pkg => {
                        const isActive = centerCustomActivePackages.includes(pkg.id);
                        const price = centerCustomPackagePrices[pkg.id] !== undefined ? centerCustomPackagePrices[pkg.id] : pkg.price;
                        return (
                          <div key={pkg.id} className="flex items-center justify-between gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCenterCustomActivePackages([...centerCustomActivePackages, pkg.id]);
                                  } else {
                                    setCenterCustomActivePackages(centerCustomActivePackages.filter(id => id !== pkg.id));
                                  }
                                }}
                                className="accent-[#ff5757] h-3.5 w-3.5"
                              />
                              <span className={`font-semibold text-slate-700 truncate text-[11px] ${!isActive && 'line-through text-slate-400'}`}>
                                {pkg.name} ({pkg.sessionsCount} s.)
                              </span>
                            </label>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                disabled={!isActive}
                                value={price}
                                onChange={(e) => {
                                  setCenterCustomPackagePrices({
                                    ...centerCustomPackagePrices,
                                    [pkg.id]: Number(e.target.value)
                                  });
                                }}
                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 text-[10px]"
                                placeholder="Tarif DZD"
                              />
                              <span className="text-[9px] font-bold text-slate-400">DZD</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RULES & NOTES */}
              {centerModalTab === 'notes' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Statut du Centre *</label>
                    <select
                      value={centerStatus} onChange={(e) => setCenterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                    >
                      <option value="active">Actif / Opérationnel</option>
                      <option value="maintenance">En Maintenance</option>
                      <option value="construction">En Construction</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Règle d'Annulation de Séance</label>
                    <textarea
                      rows={2} value={centerCancellationRule} onChange={(e) => setCenterCancellationRule(e.target.value)}
                      placeholder="Ex: Les séances doivent être annulées 24 heures à l'avance."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:border-[#ff5757]"
                    ></textarea>
                  </div>

                  {/* Client Important Notes Editor */}
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 block">Consignes Importantes clients</label>
                    <ul className="space-y-2 mb-2">
                      {centerImportantNotes.map((note, i) => (
                        <li key={i} className="flex justify-between items-start gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50 text-[11px] text-amber-800">
                          <span className="flex-1">{note}</span>
                          <button type="button" onClick={() => setCenterImportantNotes(centerImportantNotes.filter((_, idx) => idx !== i))} className="text-amber-500 hover:text-amber-700 font-bold cursor-pointer">✕</button>
                        </li>
                      ))}
                      {centerImportantNotes.length === 0 && <li className="text-slate-400 text-[10px] italic">Aucune consigne ajoutée</li>}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        type="text" placeholder="Ajouter une consigne importante" value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none text-[11px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newNote.trim()) {
                              setCenterImportantNotes([...centerImportantNotes, newNote.trim()]);
                              setNewNote('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newNote.trim()) {
                            setCenterImportantNotes([...centerImportantNotes, newNote.trim()]);
                            setNewNote('');
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#353535] hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SUBSCRIPTION */}
              {centerModalTab === 'subscription' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Formule d'Abonnement du Club *</label>
                    <select
                      value={centerSubscriptionPlan} onChange={(e) => setCenterSubscriptionPlan(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                    >
                      <option value="trial">Essai Gratuit (Trial)</option>
                      <option value="basic">Formule Standard (Basic)</option>
                      <option value="premium">Formule Premium</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Statut de Facturation du CRM *</label>
                    <select
                      value={centerSubscriptionStatus} onChange={(e) => setCenterSubscriptionStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                    >
                      <option value="active">Actif (Paiement à jour)</option>
                      <option value="suspended">Suspendu (Impayé / CRM Bloqué)</option>
                      <option value="trial">En période d'essai</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600 block">Date d'Expiration de l'Abonnement *</label>
                    <input
                      type="date"
                      value={centerSubscriptionExpiryDate} onChange={(e) => setCenterSubscriptionExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button" onClick={() => setShowCenterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manager Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm font-display">{editingManager ? 'Modifier le gérant' : 'Créer un gérant de centre'}</h4>
              <button onClick={() => setShowManagerModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleManagerSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Nom complet *</label>
                <input
                  type="text" required value={mgrName} onChange={(e) => setMgrName(e.target.value)}
                  placeholder="Amel Mansouri" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Adresse E-mail (Professionnel) *</label>
                <input
                  type="email" required value={mgrEmail} onChange={(e) => setMgrEmail(e.target.value)}
                  placeholder="amel@aq8algerie.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Affectation à un Centre *</label>
                <select
                  disabled={!!editingManager}
                  value={mgrCenterId} onChange={(e) => setMgrCenterId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none disabled:opacity-60"
                >
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
                  ))}
                </select>
                {editingManager && (
                  <span className="text-[9px] text-slate-400 block pt-0.5">
                    L'affectation aux centres est gérée directement au niveau de la configuration des centres.
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Statut Actif</span>
                  <span className="text-[10px] text-slate-400">Permet au gérant d'accéder au CRM.</span>
                </div>
                <input
                  type="checkbox" checked={mgrActive} onChange={(e) => setMgrActive(e.target.checked)}
                  className="h-4 w-4 accent-green-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowManagerModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm font-display">{editingService ? 'Modifier la prestation' : 'Créer une prestation'}</h4>
              <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleServiceSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Nom de la prestation *</label>
                <input
                  type="text" required value={srvName} onChange={(e) => setSrvName(e.target.value)}
                  placeholder="Coaching EMS Privé" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Type de technologie</label>
                  <select
                    value={srvType} onChange={(e) => setSrvType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                  >
                    <option value="aq8">AQ8 EMS (Électrostimulation)</option>
                    <option value="wonder">Wonder Body Sculpt</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Durée de la séance (min) *</label>
                  <input
                    type="number" required value={srvDuration} onChange={(e) => setSrvDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                ℹ️ Les tarifs de cette prestation sont configurés individuellement au niveau de chaque centre.
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Description détaillée</label>
                <textarea
                  rows={3} value={srvDesc} onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="Séance d'une intensité incroyable..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowServiceModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-[#ff5757] hover:bg-[#e04646] font-semibold text-white rounded-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
