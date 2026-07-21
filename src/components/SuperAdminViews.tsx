/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  List,
  Search,
  ShieldCheck
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logCrmAction } from '../lib/auditLogger';
import { Center, CenterManager, Service, Package, GeneralSettings, Client, ClientPackage, Payment, Appointment } from '../types';
import { isCenterSuspended } from '../lib/centerVisibility';
import { CentersManagement } from './super-admin/CentersManagement';
import { ManagersManagement } from './super-admin/ManagersManagement';
import { SettingsPanel } from './super-admin/SettingsPanel';
import { StatsPanel } from './super-admin/StatsPanel';
import { SuperAdminDashboard } from './super-admin/SuperAdminDashboard';
import { SuperAdminTabs, SuperAdminTabId } from './super-admin/SuperAdminTabs';
import { AuditLogPanel } from './super-admin/AuditLogPanel';

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
  onTabChange,
  userId,
  userName
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
  activeTab?: SuperAdminTabId;
  onTabChange?: (tab: SuperAdminTabId) => void;
  userId: string;
  userName: string;
}) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<SuperAdminTabId>('dashboard');
  const activeSubTab = activeTab || localActiveSubTab;
  const setActiveSubTab = onTabChange || setLocalActiveSubTab;

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (activeSubTab === 'audit') {
      const q = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs: any[] = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setAuditLogs(logs);
        setLoadingLogs(false);
      }, (error) => {
        console.error("Failed to load audit logs:", error);
        setLoadingLogs(false);
      });
      return unsubscribe;
    }
  }, [activeSubTab]);

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

  // Array temp input states
  const [newMenHour, setNewMenHour] = useState('');
  const [newWomenHour, setNewWomenHour] = useState('');
  const [newEquip, setNewEquip] = useState('');
  const [newNote, setNewNote] = useState('');

  // Modal active tab state
  const [centerModalTab, setCenterModalTab] = useState<'general' | 'hours' | 'equipment' | 'notes'>('general');

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
      logCrmAction(userId, userName, 'super_admin', {
        action: 'UPDATE_CENTER',
        details: `Modification des paramètres du centre : ${centerName} (${centerCity})`,
        targetId: editingCenter.id,
        targetType: 'center'
      });

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
        customActivePackages: centerCustomActivePackages
      } : c);
      onUpdateCenters(updated);
    } else {
      logCrmAction(userId, userName, 'super_admin', {
        action: 'CREATE_CENTER',
        details: `Création du nouveau centre : ${centerName} (${centerCity})`,
        targetId: centerIdToUse,
        targetType: 'center'
      });

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
        customActivePackages: centerCustomActivePackages
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
    const c = centers.find(center => center.id === id);
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce centre ? Tous les clients et réservations associés seront orphelins.')) {
      logCrmAction(userId, userName, 'super_admin', {
        action: 'DELETE_CENTER',
        details: `Suppression du centre : ${c?.name || id}`,
        targetId: id,
        targetType: 'center'
      });
      onUpdateCenters(centers.filter(c => c.id !== id));
    }
  };

  const handleToggleCenterStatus = (id: string) => {
    const c = centers.find(center => center.id === id);
    const wasSuspended = c ? isCenterSuspended(c) : false;
    const action = wasSuspended ? 'ACTIVATE_CENTER' : 'SUSPEND_CENTER';
    const details = wasSuspended 
      ? `Réactivation du centre : ${c?.name || id}` 
      : `Suspension temporaire du centre : ${c?.name || id}`;

    logCrmAction(userId, userName, 'super_admin', {
      action,
      details,
      targetId: id,
      targetType: 'center'
    });

    const updated = centers.map(center => {
      if (center.id !== id) return center;

      return {
        ...center,
        status: isCenterSuspended(center) ? 'active' : 'suspended'
      };
    });

    onUpdateCenters(updated);
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
      logCrmAction(userId, userName, 'super_admin', {
        action: 'UPDATE_MANAGER',
        details: `Mise à jour du manager : ${mgrName} (${mgrEmail})`,
        targetId: editingManager.id,
        targetType: 'manager'
      });

      const targetEmail = editingManager.email.toLowerCase().trim();
      const updated = managers.map(m => m.email.toLowerCase().trim() === targetEmail ? {
        ...m,
        name: mgrName.trim(),
        email: mgrEmail.trim(),
        active: mgrActive
      } : m);
      onUpdateManagers(updated);
    } else {
      const newMgrId = `mgr-${Date.now()}`;
      logCrmAction(userId, userName, 'super_admin', {
        action: 'CREATE_MANAGER',
        details: `Création du nouveau manager : ${mgrName} (${mgrEmail})`,
        targetId: newMgrId,
        targetType: 'manager'
      });

      const newMgr: CenterManager = {
        id: newMgrId,
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
      const m = managers.find(mgr => mgr.email.toLowerCase().trim() === targetEmail);
      logCrmAction(userId, userName, 'super_admin', {
        action: 'DELETE_MANAGER',
        details: `Suppression définitive du gérant : ${m?.name || email}`,
        targetId: m?.id || null,
        targetType: 'manager'
      });
      onUpdateManagers(managers.filter(m => m.email.toLowerCase().trim() !== targetEmail));
    }
  };

  const toggleManagerActive = (email: string, currentActive: boolean) => {
    const targetEmail = email.toLowerCase().trim();
    const m = managers.find(mgr => mgr.email.toLowerCase().trim() === targetEmail);
    const action = currentActive ? 'DEACTIVATE_MANAGER' : 'ACTIVATE_MANAGER';
    const details = currentActive 
      ? `Désactivation de l'accès du gérant : ${m?.name || email}` 
      : `Réactivation de l'accès du gérant : ${m?.name || email}`;

    logCrmAction(userId, userName, 'super_admin', {
      action,
      details,
      targetId: m?.id || null,
      targetType: 'manager'
    });

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
      logCrmAction(userId, userName, 'super_admin', {
        action: 'UPDATE_SERVICE',
        details: `Modification de la prestation : ${srvName} (Prix : ${srvPrice} DZD)`,
        targetId: editingService.id,
        targetType: 'service'
      });

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
      const newSrvId = `srv-${Date.now()}`;
      logCrmAction(userId, userName, 'super_admin', {
        action: 'CREATE_SERVICE',
        details: `Création d'une nouvelle prestation : ${srvName} (Prix : ${srvPrice} DZD)`,
        targetId: newSrvId,
        targetType: 'service'
      });

      const newSrv: Service = {
        id: newSrvId,
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
      const s = services.find(srv => srv.id === id);
      logCrmAction(userId, userName, 'super_admin', {
        action: 'DELETE_SERVICE',
        details: `Suppression de la prestation : ${s?.name || id}`,
        targetId: id,
        targetType: 'service'
      });
      onUpdateServices(services.filter(s => s.id !== id));
    }
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

  return (
    <div className="space-y-6">
      {/* Superadmin Internal Sub-Navigation bar */}
      {!activeTab && (
        <SuperAdminTabs
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
        />
      )}

      {/* RENDER ACTIVE TAB */}

      {/* A. Vue Globale (Dashboard) */}
      {activeSubTab === 'dashboard' && (
        <SuperAdminDashboard
          centers={centers}
          clients={clients}
          payments={payments}
          avgClientsPerCenter={avgClientsPerCenter}
          aq8ClientsCount={aq8ClientsCount}
          wonderClientsCount={wonderClientsCount}
          onAddCenter={() => openCenterModal(null)}
          onAddManager={() => openManagerModal(null)}
          onAddService={() => openServiceModal(null)}
        />
      )}
      {/* B. Gestion Centres */}
      {activeSubTab === 'centers' && (
        <CentersManagement
          centers={centers}
          clients={clients}
          onAddCenter={() => openCenterModal(null)}
          onEditCenter={openCenterModal}
          onDeleteCenter={handleDeleteCenter}
          onToggleCenterStatus={handleToggleCenterStatus}
        />
      )}
      {/* C. Gestion Managers */}
      {/* C. Gestion Managers */}
      {activeSubTab === 'managers' && (
        <ManagersManagement
          centers={centers}
          managers={managers}
          onAddManager={() => openManagerModal(null)}
          onEditManager={openManagerModal}
          onDeleteManager={handleDeleteManager}
          onToggleManagerActive={toggleManagerActive}
        />
      )}
      {/* E. Analyses / Stats */}
      {/* E. Analyses / Stats */}
      {activeSubTab === 'stats' && (
        <StatsPanel
          centers={centers}
          clients={clients}
          appointments={appointments}
          payments={payments}
          aq8ClientsCount={aq8ClientsCount}
          wonderClientsCount={wonderClientsCount}
        />
      )}
      {/* F. Settings */}
      {/* F. Settings */}
      {activeSubTab === 'settings' && (
        <SettingsPanel
          settings={settings}
          onSave={(newSettings) => {
            logCrmAction(userId, userName, 'super_admin', {
              action: 'UPDATE_SETTINGS',
              details: `Modification des paramètres généraux du réseau CRM`,
              targetType: 'settings'
            });
            onUpdateSettings(newSettings);
          }}
        />
      )}

      {/* G. Journal d'Audit */}
      {activeSubTab === 'audit' && (
        <AuditLogPanel
          centers={centers}
          logs={auditLogs}
          loading={loadingLogs}
        />
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
                { id: 'notes', label: '4. Règles & Consignes', icon: AlertCircle }
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
                      {centerStatus && !['active', 'suspended', 'maintenance', 'construction'].includes(centerStatus.trim().toLowerCase()) && (
                        <option value={centerStatus}>{centerStatus} / visible actuellement</option>
                      )}
                      <option value="active">Actif / visible sur le site public</option>
                      <option value="suspended">Suspendu / masqué du site public</option>
                      <option value="maintenance">En maintenance / masqué</option>
                      <option value="construction">En construction / masqué</option>
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