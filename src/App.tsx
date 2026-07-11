/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Building,
  Users,
  Award,
  DollarSign,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Map,
  Zap,
  Flame,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  BarChart3,
  Scale,
  Sun,
  Moon,
  Layers
} from 'lucide-react';

import {
  Center,
  CenterManager,
  Service,
  Package,
  Client,
  Appointment,
  ClientPackage,
  Payment,
  Measurement,
  GeneralSettings
} from './types';

import { AQ8Database } from './mockData';
import {
  seedDatabaseIfNeeded,
  subscribeToCenters,
  subscribeToManagers,
  subscribeToServices,
  subscribeToPackages,
  subscribeToClients,
  subscribeToAppointments,
  subscribeToClientPackages,
  subscribeToPayments,
  subscribeToMeasurements,
  subscribeToSettings,
  dbSaveCenter,
  dbDeleteCenter,
  dbSaveManager,
  dbDeleteManager,
  dbSaveService,
  dbDeleteService,
  dbSavePackage,
  dbDeletePackage,
  dbSaveClient,
  dbDeleteClient,
  dbSaveAppointment,
  dbDeleteAppointment,
  dbSaveClientPackage,
  dbSavePayment,
  dbDeletePayment,
  dbSaveMeasurement,
  dbSaveSettings,
  dbResetToDefaults
} from './lib/db';

// Import our modular subcomponents
import {
  PublicHome,
  PublicAQ8,
  PublicWonder,
  PublicCenters,
  PublicCenterDetail,
  PublicFAQ,
  PublicContact
} from './components/PublicViews';

import { CrmPortal } from './components/CrmPortal';
import { SuperAdminViews } from './components/SuperAdminViews';
import { CenterManagerViews } from './components/CenterManagerViews';

export default function App() {
  // 1. SYSTEM STATES (PERSISTED IN LOCALSTORAGE)
  const [centers, setCenters] = useState<Center[]>([]);
  const [managers, setManagers] = useState<CenterManager[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aq8_theme') === 'dark';
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('aq8_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  const allowDemoTools = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true';

  // Initialize public data on mount. CRM collections subscribe only after authentication.
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_FIREBASE_SEED === 'true') {
      seedDatabaseIfNeeded();
    }

    const unsubCenters = subscribeToCenters(setCenters);
    const unsubServices = subscribeToServices(setServices);
    const unsubPackages = subscribeToPackages(setPackages);
    const unsubSettings = subscribeToSettings(setSettings);

    return () => {
      unsubCenters();
      unsubServices();
      unsubPackages();
      unsubSettings();
    };
  }, []);

  // 2. ROUTING & NAVIGATION STATE
  // 'home' | 'aq8' | 'wonder' | 'centers' | 'center-detail' | 'faq' | 'contact' | 'login' | 'crm'
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [selectedCenterId, setSelectedCenterId] = useState<string>('center-1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Path-based routing using HTML5 History API (popstate)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      
      const centerMatch = path.match(/^\/centres\/([a-zA-Z0-9_-]+)/);
      if (centerMatch) {
        const slug = centerMatch[1];
        const allCenters = AQ8Database.getCenters();
        const found = allCenters.find(c => c.slug === slug);
        if (found) {
          setSelectedCenterId(found.id);
          setCurrentRoute('center-detail');
        } else {
          setCurrentRoute('home');
        }
      } else {
        const cleanPath = path === '/' ? 'home' : path.replace(/^\//, '');
        const validRoutes: Record<string, string> = {
          'home': 'home',
          'aq8': 'aq8',
          'wonder': 'wonder',
          'centres': 'centers',
          'centers': 'centers',
          'faq': 'faq',
          'contact': 'contact',
          'login': 'login',
          'crm': 'crm'
        };
        const resolved = validRoutes[cleanPath] || 'home';
        setCurrentRoute(resolved);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    // Call immediately on mount
    handleLocationChange();

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Programmatic navigation helper
  const navigate = (route: string, centerSlug?: string) => {
    let targetPath = '/';
    if (route === 'center-detail' && centerSlug) {
      targetPath = `/centres/${centerSlug}`;
    } else if (route === 'centers' || route === 'centres') {
      targetPath = '/centres';
    } else if (route === 'aq8') {
      targetPath = '/aq8';
    } else if (route === 'wonder') {
      targetPath = '/wonder';
    } else if (route === 'faq') {
      targetPath = '/faq';
    } else if (route === 'contact') {
      targetPath = '/contact';
    } else if (route === 'login') {
      targetPath = '/login';
    } else if (route === 'crm') {
      targetPath = '/crm';
    } else if (route === 'home') {
      targetPath = '/';
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
      // Manually dispatch popstate so our local React state updates
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }
  };

  // 3. INTERNAL CRM STATE
  const [crmRole, setCrmRole] = useState<'super_admin' | 'center_manager' | null>(null);
  const [crmCenterId, setCrmCenterId] = useState<string | null>(null); // Null if super admin, center ID if manager
  const [loggedManagerName, setLoggedManagerName] = useState<string>('');
  const [crmSuperAdminTab, setCrmSuperAdminTab] = useState<'dashboard' | 'centers' | 'managers' | 'stats' | 'settings'>('dashboard');
  const [crmCenterManagerTab, setCrmCenterManagerTab] = useState<'dashboard' | 'schedule' | 'clients' | 'bookings' | 'payments' | 'services'>('dashboard');
  const [crmSidebarOpen, setCrmSidebarOpen] = useState(false);

  useEffect(() => {
    if (!crmRole) {
      return;
    }

    const scopedCenterId = crmRole === 'center_manager' ? crmCenterId || undefined : undefined;
    const unsubManagers = crmRole === 'super_admin' ? subscribeToManagers(setManagers) : () => {};
    const unsubClients = subscribeToClients(setClients, scopedCenterId);
    const unsubAppointments = subscribeToAppointments(setAppointments, scopedCenterId);
    const unsubClientPackages = subscribeToClientPackages(setClientPackages, scopedCenterId);
    const unsubPayments = subscribeToPayments(setPayments, scopedCenterId);
    const unsubMeasurements = subscribeToMeasurements(setMeasurements, scopedCenterId);

    return () => {
      unsubManagers();
      unsubClients();
      unsubAppointments();
      unsubClientPackages();
      unsubPayments();
      unsubMeasurements();
    };
  }, [crmRole, crmCenterId]);

  // 4. DATABASE SYNC WRAPPERS
  const updateCenters = async (newCenters: Center[]) => {
    const deleted = centers.filter(c => !newCenters.some(nc => nc.id === c.id));
    for (const d of deleted) {
      await dbDeleteCenter(d.id);
    }
    const updatedOrAdded = newCenters.filter(nc => {
      const old = centers.find(c => c.id === nc.id);
      return !old || JSON.stringify(old) !== JSON.stringify(nc);
    });
    for (const u of updatedOrAdded) {
      await dbSaveCenter(u);
    }
  };

  const updateManagers = async (newManagers: CenterManager[]) => {
    const deleted = managers.filter(m => !newManagers.some(nm => nm.email.toLowerCase().trim() === m.email.toLowerCase().trim()));
    for (const d of deleted) {
      await dbDeleteManager(d.email);
    }
    const updatedOrAdded = newManagers.filter(nm => {
      const old = managers.find(m => m.email.toLowerCase().trim() === nm.email.toLowerCase().trim());
      return !old || JSON.stringify(old) !== JSON.stringify(nm);
    });
    for (const u of updatedOrAdded) {
      await dbSaveManager(u);
    }
  };

  const updateServices = async (newServices: Service[]) => {
    const deleted = services.filter(s => !newServices.some(ns => ns.id === s.id));
    for (const d of deleted) {
      await dbDeleteService(d.id);
    }
    const updatedOrAdded = newServices.filter(ns => {
      const old = services.find(s => s.id === ns.id);
      return !old || JSON.stringify(old) !== JSON.stringify(ns);
    });
    for (const u of updatedOrAdded) {
      await dbSaveService(u);
    }
  };

  const updatePackages = async (newPackages: Package[]) => {
    const deleted = packages.filter(p => !newPackages.some(np => np.id === p.id));
    for (const d of deleted) {
      await dbDeletePackage(d.id);
    }
    const updatedOrAdded = newPackages.filter(np => {
      const old = packages.find(p => p.id === np.id);
      return !old || JSON.stringify(old) !== JSON.stringify(np);
    });
    for (const u of updatedOrAdded) {
      await dbSavePackage(u);
    }
  };

  const updateClients = async (newClients: Client[]) => {
    const deleted = clients.filter(c => !newClients.some(nc => nc.id === c.id));
    for (const d of deleted) {
      await dbDeleteClient(d.id);
    }
    const updatedOrAdded = newClients.filter(nc => {
      const old = clients.find(c => c.id === nc.id);
      return !old || JSON.stringify(old) !== JSON.stringify(nc);
    });
    for (const u of updatedOrAdded) {
      await dbSaveClient(u);
    }
  };

  const updateAppointments = async (newApts: Appointment[]) => {
    const deleted = appointments.filter(a => !newApts.some(na => na.id === a.id));
    for (const d of deleted) {
      await dbDeleteAppointment(d.id);
    }
    const updatedOrAdded = newApts.filter(na => {
      const old = appointments.find(a => a.id === na.id);
      return !old || JSON.stringify(old) !== JSON.stringify(na);
    });
    for (const u of updatedOrAdded) {
      await dbSaveAppointment(u);
    }
  };

  const updateClientPackages = async (newClientPkgs: ClientPackage[]) => {
    const updatedOrAdded = newClientPkgs.filter(ncp => {
      const old = clientPackages.find(cp => cp.id === ncp.id);
      return !old || JSON.stringify(old) !== JSON.stringify(ncp);
    });
    for (const u of updatedOrAdded) {
      await dbSaveClientPackage(u);
    }
  };

  const updatePayments = async (newPayments: Payment[]) => {
    const deleted = payments.filter(p => !newPayments.some(np => np.id === p.id));
    for (const d of deleted) {
      await dbDeletePayment(d.id);
    }
    const updatedOrAdded = newPayments.filter(np => {
      const old = payments.find(p => p.id === np.id);
      return !old || JSON.stringify(old) !== JSON.stringify(np);
    });
    for (const u of updatedOrAdded) {
      await dbSavePayment(u);
    }
  };

  const updateMeasurements = async (newMeas: Measurement[]) => {
    const updatedOrAdded = newMeas.filter(nm => {
      const old = measurements.find(m => m.id === nm.id);
      return !old || JSON.stringify(old) !== JSON.stringify(nm);
    });
    for (const u of updatedOrAdded) {
      await dbSaveMeasurement(u);
    }
  };

  const updateSettings = async (newSettings: GeneralSettings) => {
    await dbSaveSettings(newSettings);
  };

  const handleResetDatabase = async () => {
    if (!allowDemoTools) return;

    if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs d\'origine ? Vos modifications locales seront effacées.')) {
      await dbResetToDefaults();
      window.location.reload();
    }
  };

  // 5. AUTHENTICATION PORTAL ACTIONS
  const handleLoginSuccess = (role: 'super_admin' | 'center_manager', centerId: string | null, managerName: string) => {
    setCrmRole(role);
    setCrmCenterId(centerId);
    setLoggedManagerName(managerName);
    navigate('crm');
  };

  const handleLogout = () => {
    setCrmRole(null);
    setCrmCenterId(null);
    setLoggedManagerName('');
    setManagers([]);
    setClients([]);
    setAppointments([]);
    setClientPackages([]);
    setPayments([]);
    setMeasurements([]);
    navigate('home');
  };

  // Calculate high-level stats for Super Admin
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const activeCenter = centers.find(c => c.id === crmCenterId);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] selection:bg-[#ff5757]/30 selection:text-[#353535]">
      
      {/* --- SITE PUBLIC HEADER / NAVIGATION BAR --- */}
      {currentRoute !== 'crm' && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-150 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <div
              onClick={() => navigate('home')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="h-9 w-9 bg-[#353535] rounded-xl flex items-center justify-center text-white font-bold transition-premium group-hover:scale-105 border border-[#ff5757]/30">
                <span className="text-[#ff5757] text-lg">8</span>
              </div>
              <div className="leading-none">
                <span className="text-sm font-bold tracking-wider text-[#353535] uppercase font-display block">AQ8 Algérie</span>
                <span className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase block">Next-Gen Fitness</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600">
              {[
                { id: 'home', label: 'Accueil' },
                { id: 'aq8', label: 'Technologie AQ8' },
                { id: 'wonder', label: 'Technologie Wonder' },
                { id: 'centers', label: 'Nos Centres' },
                { id: 'faq', label: 'FAQ' },
                { id: 'contact', label: 'Contact' }
              ].map(link => (
                <button
                  key={link.id}
                  onClick={() => {
                    navigate(link.id);
                  }}
                  className={`px-3 py-2 rounded-lg transition-premium ${currentRoute === link.id ? 'text-[#ff5757] bg-rose-50/50' : 'hover:text-[#353535] hover:bg-slate-50'}`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* CRM Portal Entry trigger */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => handleResetDatabase()}
                title="Réinitialiser la base de démonstration"
                className={`${allowDemoTools ? '' : 'hidden'} p-2 text-slate-400 hover:text-[#ff5757] hover:bg-rose-50 rounded-xl transition-premium`}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('login')}
                className="px-4 py-2 bg-[#353535] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-premium shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-[#ff5757]" /> Accès CRM AQ8
              </button>
            </div>

            {/* Mobile menu toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => handleResetDatabase()}
                className={`${allowDemoTools ? '' : 'hidden'} p-2 text-slate-400 hover:text-[#ff5757] rounded-xl`}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile responsive drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 text-xs font-bold">
              {[
                { id: 'home', label: 'Accueil' },
                { id: 'aq8', label: 'Technologie AQ8' },
                { id: 'wonder', label: 'Technologie Wonder' },
                { id: 'centers', label: 'Nos Centres' },
                { id: 'faq', label: 'FAQ' },
                { id: 'contact', label: 'Contact' },
                { id: 'login', label: 'Accéder au CRM AQ8' }
              ].map(link => (
                <button
                  key={link.id}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(link.id);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${currentRoute === link.id ? 'bg-rose-50 text-[#ff5757]' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {link.id === 'login' && <ShieldCheck className="h-4 w-4 text-[#ff5757]" />}
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </header>
      )}

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="flex-1">
        {currentRoute !== 'crm' ? (
          /* PUBLIC PAGES WRAPPER */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {currentRoute === 'home' && (
              <PublicHome
                onNavigate={navigate}
                onSelectCenter={(id) => {
                  const center = centers.find(c => c.id === id);
                  if (center && center.slug) {
                    navigate('center-detail', center.slug);
                  }
                }}
                centers={centers}
              />
            )}

            {currentRoute === 'aq8' && <PublicAQ8 />}

            {currentRoute === 'wonder' && <PublicWonder />}

            {currentRoute === 'centers' && <PublicCenters />}

            {currentRoute === 'center-detail' && (
              <PublicCenterDetail
                centerId={selectedCenterId}
                centers={centers}
                services={services}
                onNavigate={navigate}
              />
            )}

            {currentRoute === 'faq' && <PublicFAQ />}

            {currentRoute === 'contact' && <PublicContact centers={centers} />}

            {currentRoute === 'login' && (
              <CrmPortal
                centers={centers}
                managers={managers}
                onLoginSuccess={handleLoginSuccess}
              />
            )}

          </div>
        ) : (
          /* --- INTERNAL CRM AREA --- */
          <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${isDarkMode ? 'dark bg-[#0b0b0f] text-slate-100' : 'bg-[#f8f9fa] text-slate-800'}`}>
            {/* Elegant Simulation Bar at the top to toggle superadmin/manager instantly */}
            <div className="w-full bg-[#1e1e24] text-white py-2.5 px-4 flex items-center justify-between gap-2 border-b border-slate-800 text-xs md:fixed md:top-0 md:left-0 md:right-0 md:z-50 h-12">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCrmSidebarOpen(!crmSidebarOpen)}
                  className="p-1.5 hover:bg-white/10 rounded-lg md:hidden text-white cursor-pointer"
                  title="Menu de navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider animate-pulse-subtle">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Session Active
                </span>
                <span className="text-slate-300 hidden sm:inline">Connecté en tant que: <strong>{loggedManagerName}</strong></span>
              </div>

              {/* Instant Switching Panel */}
              <div className="flex items-center gap-2 font-semibold">
                {allowDemoTools && (<>
                <span className="text-slate-400 text-[11px] hidden lg:inline">Simulateur de rôle:</span>
                
                {/* Switch to Superadmin */}
                <button
                  onClick={() => {
                    setCrmRole('super_admin');
                    setCrmCenterId(null);
                    setLoggedManagerName('Karim Benchikh (Super Admin)');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] transition ${crmRole === 'super_admin' ? 'bg-[#ff5757] text-white font-bold shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
                >
                  Super Admin
                </button>

                {/* Switch to Center Manager selector */}
                <select
                  value={crmCenterId || ''}
                  onChange={(e) => {
                    const centerId = e.target.value;
                    const c = centers.find(center => center.id === centerId);
                    const matchedMgr = managers.find(m => m.centerId === centerId) || managers[0];
                    setCrmRole('center_manager');
                    setCrmCenterId(centerId);
                    setLoggedManagerName(`${matchedMgr.name} (${c?.name || 'Manager'})`);
                  }}
                  className="bg-white/10 text-white rounded-md text-[10px] px-2 py-1 focus:outline-none border border-white/10"
                >
                  <option value="" disabled className="text-slate-800">-- Choisir un centre --</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-800">{c.name} ({c.city})</option>
                  ))}
                </select>
                </>)}

                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  title={isDarkMode ? "Activer le mode clair" : "Activer le mode sombre"}
                >
                  {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  onClick={handleLogout}
                  className="ml-2 p-1 text-slate-400 hover:text-white transition"
                  title="Retourner au site public"
                >
                  <LogOut className="h-4 w-4 text-[#ff5757]" />
                </button>
              </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {crmSidebarOpen && (
              <div
                onClick={() => setCrmSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-35 md:hidden transition-opacity"
              />
            )}

            {/* Refined, Professional Lateral Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111115] text-white border-r border-slate-800/80 p-5 pt-16 flex flex-col justify-between shrink-0 transform md:transform-none transition-transform duration-300 md:fixed md:top-12 md:bottom-0 md:left-0 shadow-xl ${crmSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
              <div className="space-y-6 text-xs">
                {/* Brand / Role display */}
                <div className="space-y-1 py-2 border-b border-white/5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">AQ8 WORKSPACE</span>
                  <span className="text-sm font-bold text-white font-display block">
                    {crmRole === 'super_admin' ? 'Super Admin' : 'Manager de Centre'}
                  </span>
                  {crmRole === 'center_manager' && (
                    <span className="inline-block bg-[#ff5757]/15 text-[#ff5757] px-2 py-0.5 mt-1 rounded-sm font-bold uppercase text-[9px]">
                      {centers.find(c => c.id === crmCenterId)?.name || 'AQ8 Centre'}
                    </span>
                  )}
                </div>

                {/* Direct Navigation Controls */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1">Menu Principal</p>
                  
                  {crmRole === 'super_admin' ? (
                    <nav className="space-y-1">
                      {[
                        { id: 'dashboard' as const, label: 'Tableau de bord', icon: Activity },
                        { id: 'centers' as const, label: 'Gestion Centres', icon: Building },
                        { id: 'managers' as const, label: 'Managers & Accès', icon: Users },
                        { id: 'stats' as const, label: 'Analyses Réseau', icon: BarChart3 },
                        { id: 'settings' as const, label: 'Paramètres Généraux', icon: Settings }
                      ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = crmSuperAdminTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setCrmSuperAdminTab(tab.id);
                              setCrmSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-premium text-xs font-bold cursor-pointer text-left ${
                              isActive
                                ? 'bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20 font-extrabold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  ) : (
                    <nav className="space-y-1">
                      {[
                        { id: 'dashboard' as const, label: 'Tableau de bord', icon: Activity },
                        { id: 'schedule' as const, label: 'Planning du Jour', icon: Calendar },
                        { id: 'clients' as const, label: 'Gestion Clients', icon: Users },
                        { id: 'bookings' as const, label: 'Réservations', icon: Calendar },
                        { id: 'payments' as const, label: 'Paiements Encaissés', icon: DollarSign },
                        { id: 'services' as const, label: 'Prestations & Forfaits', icon: Layers }
                      ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = crmCenterManagerTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setCrmCenterManagerTab(tab.id);
                              setCrmSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-premium text-xs font-bold cursor-pointer text-left ${
                              isActive
                                ? 'bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20 font-extrabold'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  )}
                </div>
              </div>

              {/* Reset simulator & Logout */}
              <div className="space-y-2 pt-6 border-t border-white/5 text-xs font-semibold">
                <button
                  onClick={() => handleResetDatabase()}
                  className={`${allowDemoTools ? 'flex' : 'hidden'} w-full py-2 px-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl transition items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Réinitialiser Démo
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 bg-[#ff5757] hover:bg-[#ff4444] text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#ff5757]/10"
                >
                  <LogOut className="h-3.5 w-3.5" /> Quitter le CRM
                </button>
              </div>
            </aside>

            {/* CRM Workspace Body */}
            <section className="flex-1 p-4 md:p-8 md:pl-72 pt-16 md:pt-20 min-h-screen">
              {crmRole === 'super_admin' ? (
                /* RENDER SUPER ADMIN VIEW BLOCK */
                <SuperAdminViews
                  centers={centers}
                  managers={managers}
                  services={services}
                  packages={packages}
                  settings={settings || { appName: 'AQ8 Algérie', contactEmail: 'contact@aq8algerie.com', contactPhone: '+213 (0) 23 48 50 60', addressAlgérie: 'Hydra, Alger', currency: 'DZD', enableVoucherPromo: true }}
                  appointmentsCount={appointments.length}
                  paymentsCount={payments.length}
                  totalRevenue={totalRevenue}
                  clients={clients}
                  clientPackages={clientPackages}
                  payments={payments}
                  appointments={appointments}
                  onUpdateCenters={updateCenters}
                  onUpdateManagers={updateManagers}
                  onUpdateServices={updateServices}
                  onUpdatePackages={updatePackages}
                  onUpdateSettings={updateSettings}
                  activeTab={crmSuperAdminTab}
                  onTabChange={setCrmSuperAdminTab}
                />
              ) : activeCenter && (activeCenter.subscriptionStatus === 'suspended' || (activeCenter.subscriptionExpiryDate && new Date(activeCenter.subscriptionExpiryDate) < new Date())) ? (
                /* PREMIUM SaaS SUBSCRIPTION BLOCKING PAGE */
                <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95">
                  <div className="mx-auto h-16 w-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-[#ff5757]" />
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block bg-[#ff5757]/10 text-[#ff5757] px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-wider">
                      Accès CRM Restreint
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-800 font-display">Abonnement Club Suspendu</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      L'accès au CRM pour l'établissement <strong>{activeCenter.name}</strong> a été bloqué par la direction. Cela se produit généralement suite à un défaut de paiement de l'abonnement du club ou à l'expiration de la période d'essai.
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-left text-xs text-slate-600 space-y-2">
                    <p><strong>Club :</strong> {activeCenter.name} ({activeCenter.city})</p>
                    <p><strong>Formule :</strong> {activeCenter.subscriptionPlan === 'premium' ? 'Formule Premium' : activeCenter.subscriptionPlan === 'basic' ? 'Formule Standard' : 'Essai Gratuit'}</p>
                    <p><strong>Date d'expiration :</strong> {activeCenter.subscriptionExpiryDate || 'Non spécifiée'}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Veuillez contacter le Super Administrateur <strong>Karim Benchikh</strong> au <strong>{settings?.contactPhone || '+213 (0) 23 48 50 60'}</strong> ou par e-mail à <strong>{settings?.contactEmail || 'contact@aq8algerie.com'}</strong> pour régulariser votre abonnement.
                  </p>
                </div>
              ) : (
                /* RENDER CENTER MANAGER VIEW BLOCK (STRICT ISOLATION VIA CURRENT CENTERID) */
                <CenterManagerViews
                  centerId={crmCenterId || 'center-1'}
                  centers={centers}
                  clients={clients}
                  appointments={appointments}
                  packages={packages}
                  clientPackages={clientPackages}
                  payments={payments}
                  measurements={measurements}
                  services={services}
                  onUpdateClients={updateClients}
                  onUpdateAppointments={updateAppointments}
                  onUpdateClientPackages={updateClientPackages}
                  onUpdatePayments={updatePayments}
                  onUpdateMeasurements={updateMeasurements}
                  activeTab={crmCenterManagerTab}
                  onTabChange={setCrmCenterManagerTab}
                />
              )}
            </section>
          </div>
        )}
      </main>

      {/* --- SITE PUBLIC FOOTER --- */}
      {currentRoute !== 'crm' && (
        <footer className="bg-[#353535] text-white border-t border-slate-800 pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center border border-[#ff5757]/30">
                  <span className="text-[#ff5757] font-bold text-base">8</span>
                </div>
                <span className="font-bold text-lg font-display uppercase tracking-wider text-white">AQ8 Algérie</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Leader de l'électrostimulation sans fil et de la remise en forme technologique en Algérie. Prestations haut de gamme adaptées à tous les profils.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[#ff5757] font-display">Nos Technologies</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => navigate('aq8')} className="hover:text-white transition">AQ8 Électrostimulation (EMS)</button></li>
                <li><button onClick={() => navigate('wonder')} className="hover:text-white transition">Wonder Muscle Sculpting</button></li>
                <li><button onClick={() => navigate('faq')} className="hover:text-white transition">Questions Fréquentes</button></li>
              </ul>
            </div>

            <div className="space-y-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-white font-display">Réseau d'Établissements</h4>
              <ul className="space-y-2 text-slate-400">
                {centers.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        navigate('center-detail', c.slug);
                      }}
                      className="hover:text-white transition"
                    >
                      {c.name} ({c.city})
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-white font-display">Contact & Siège</h4>
              <p className="text-slate-400 leading-relaxed flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-[#ff5757] shrink-0 mt-0.5" />
                {settings?.addressAlgérie || '12 Rue des Glycines, Hydra, Alger'}
              </p>
              <p className="text-slate-400 flex items-center gap-1.5 font-bold text-[#ff5757]">
                <Phone className="h-4 w-4 shrink-0" /> {settings?.contactPhone || '+213 (0) 23 48 50 60'}
              </p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/5 text-center text-xs text-slate-500">
            <p>© 2026 AQ8 Algérie. Tous droits réservés. Refonte modernisée et optimisée.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
