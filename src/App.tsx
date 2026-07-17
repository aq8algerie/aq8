/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState, useEffect, useRef } from 'react';
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
  GeneralSettings,
  BookingRequest
} from './types';

import {
  AQ8Database,
  INITIAL_CENTERS,
  INITIAL_MANAGERS,
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_CLIENTS,
  INITIAL_CLIENT_PACKAGES,
  INITIAL_PAYMENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_MEASUREMENTS,
  INITIAL_SETTINGS
} from './mockData';
import { auth, db } from './lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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

import { saveDocument, syncCollection as syncFirestoreCollection } from './lib/firestoreRepository';

const CrmPortal = React.lazy(() =>
  import('./components/CrmPortal').then(module => ({ default: module.CrmPortal }))
);

const SuperAdminViews = React.lazy(() =>
  import('./components/SuperAdminViews').then(module => ({ default: module.SuperAdminViews }))
);

const CenterManagerViews = React.lazy(() =>
  import('./components/CenterManagerViews').then(module => ({ default: module.CenterManagerViews }))
);

function CrmLoadingState() {
  return (
    <div className="py-16 text-center text-sm font-semibold text-slate-500">
      Chargement de l’espace CRM...
    </div>
  );
}

type CrmRole = 'super_admin' | 'center_manager';

type CrmProfile = {
  role: CrmRole;
  centerId?: string | null;
  name?: string;
  displayName?: string;
  active?: boolean;
};

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
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aq8_theme') === 'dark';
  });

  const [authReady, setAuthReady] = useState(false);
  const [crmRole, setCrmRole] = useState<CrmRole | null>(null);
  const [crmCenterId, setCrmCenterId] = useState<string | null>(null);
  const [loggedManagerName, setLoggedManagerName] = useState<string>('');
  const [crmSuperAdminTab, setCrmSuperAdminTab] = useState<'dashboard' | 'centers' | 'managers' | 'stats' | 'settings'>('dashboard');
  const [crmCenterManagerTab, setCrmCenterManagerTab] = useState<'dashboard' | 'schedule' | 'clients' | 'bookings' | 'payments' | 'services' | 'settings'>('dashboard');
  const [crmSidebarOpen, setCrmSidebarOpen] = useState(false);
  const isDevToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('aq8_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  const isSeeding = useRef(false);

  const seedDatabase = async () => {
    console.log("Seeding database to Firestore...");
    try {
      const batch = writeBatch(db);

      INITIAL_CENTERS.forEach(c => batch.set(doc(db, 'centers', c.id), c));
      INITIAL_MANAGERS.forEach(m => batch.set(doc(db, 'managers', m.id), m));
      INITIAL_SERVICES.forEach(s => batch.set(doc(db, 'services', s.id), s));
      INITIAL_PACKAGES.forEach(p => batch.set(doc(db, 'packages', p.id), p));
      INITIAL_CLIENTS.forEach(c => batch.set(doc(db, 'clients', c.id), c));
      INITIAL_CLIENT_PACKAGES.forEach(cp => batch.set(doc(db, 'client_packages', cp.id), cp));
      INITIAL_PAYMENTS.forEach(p => batch.set(doc(db, 'payments', p.id), p));
      INITIAL_APPOINTMENTS.forEach(a => batch.set(doc(db, 'appointments', a.id), a));
      INITIAL_MEASUREMENTS.forEach(m => batch.set(doc(db, 'measurements', m.id), m));
      batch.set(doc(db, 'settings', 'general'), INITIAL_SETTINGS);

      await batch.commit();
      console.log("Database seeded successfully!");
    } catch (error) {
      console.error("Failed to seed database:", error);
    }
  };

  const syncCollection = async <T extends { id: string }>(
    colName: string,
    newList: T[],
    oldList: T[]
  ) => {
    try {
      await syncFirestoreCollection(db, colName, newList, oldList);
    } catch (error) {
      console.error(`Error syncing collection ${colName}:`, error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCrmRole(null);
        setCrmCenterId(null);
        setLoggedManagerName('');
        setAuthReady(true);
        return;
      }

      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
        if (!profileSnapshot.exists()) {
          await signOut(auth);
          setAuthReady(true);
          return;
        }

        const profile = profileSnapshot.data() as CrmProfile;
        if (profile.active === false || (profile.role !== 'super_admin' && profile.role !== 'center_manager')) {
          await signOut(auth);
          setAuthReady(true);
          return;
        }

        setCrmRole(profile.role);
        setCrmCenterId(profile.role === 'center_manager' ? profile.centerId || null : null);
        setLoggedManagerName(profile.displayName || profile.name || user.displayName || user.email || 'Utilisateur CRM');
      } catch (error) {
        console.error('Failed to restore CRM session:', error);
        await signOut(auth).catch(() => undefined);
        setCrmRole(null);
        setCrmCenterId(null);
        setLoggedManagerName('');
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  // Public data is available to the website without opening CRM collections.
  useEffect(() => {
    const unsubscribeCenters = onSnapshot(collection(db, 'centers'), (snapshot) => {
      const list: Center[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Center));
      const resolvedCenters = list.length > 0 ? list : INITIAL_CENTERS;
      setCenters(resolvedCenters);
      AQ8Database.saveCenters(resolvedCenters);
    }, (error) => {
      console.error('Error listening to public centers:', error);
      setCenters(INITIAL_CENTERS);
    });

    const unsubscribeServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const list: Service[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Service));
      const resolvedServices = list.length > 0 ? list : INITIAL_SERVICES;
      setServices(resolvedServices);
      AQ8Database.saveServices(resolvedServices);
    }, (error) => {
      console.error('Error listening to public services:', error);
      setServices(INITIAL_SERVICES);
    });

    const unsubscribePackages = onSnapshot(collection(db, 'packages'), (snapshot) => {
      const list: Package[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Package));
      const resolvedPackages = list.length > 0 ? list : INITIAL_PACKAGES;
      setPackages(resolvedPackages);
      AQ8Database.savePackages(resolvedPackages);
    }, (error) => {
      console.error('Error listening to public packages:', error);
      setPackages(INITIAL_PACKAGES);
    });

    const unsubscribeSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      let resolvedSettings: GeneralSettings | null = null;
      snapshot.forEach(doc => {
        if (doc.id === 'general') {
          resolvedSettings = doc.data() as GeneralSettings;
        }
      });
      const settingsToUse = resolvedSettings || INITIAL_SETTINGS;
      setSettings(settingsToUse);
      AQ8Database.saveSettings(settingsToUse);
    }, (error) => {
      console.error('Error listening to public settings:', error);
      setSettings(INITIAL_SETTINGS);
    });

    return () => {
      unsubscribeCenters();
      unsubscribeServices();
      unsubscribePackages();
      unsubscribeSettings();
    };
  }, []);

  // CRM data is loaded only after a CRM role has been established.
  useEffect(() => {
    if (!crmRole || (crmRole === 'center_manager' && !crmCenterId)) {
      setManagers([]);
      setClients([]);
      setAppointments([]);
      setClientPackages([]);
      setPayments([]);
      setMeasurements([]);
      setBookingRequests([]);
      return;
    }

    const managersRef = crmRole === 'super_admin' ? collection(db, 'managers') : query(collection(db, 'managers'), where('centerId', '==', crmCenterId));
    const clientsRef = crmRole === 'super_admin' ? collection(db, 'clients') : query(collection(db, 'clients'), where('centerId', '==', crmCenterId));
    const appointmentsRef = crmRole === 'super_admin' ? collection(db, 'appointments') : query(collection(db, 'appointments'), where('centerId', '==', crmCenterId));
    const clientPackagesRef = crmRole === 'super_admin' ? collection(db, 'client_packages') : query(collection(db, 'client_packages'), where('centerId', '==', crmCenterId));
    const paymentsRef = crmRole === 'super_admin' ? collection(db, 'payments') : query(collection(db, 'payments'), where('centerId', '==', crmCenterId));
    const measurementsRef = crmRole === 'super_admin' ? collection(db, 'measurements') : query(collection(db, 'measurements'), where('centerId', '==', crmCenterId));
    const bookingRequestsRef = crmRole === 'super_admin' ? collection(db, 'booking_requests') : query(collection(db, 'booking_requests'), where('centerId', '==', crmCenterId));

    const unsubscribeManagers = onSnapshot(managersRef, (snapshot) => {
      const list: CenterManager[] = [];
      snapshot.forEach(doc => list.push(doc.data() as CenterManager));
      setManagers(list);
      AQ8Database.saveManagers(list);
    });

    const unsubscribeClients = onSnapshot(clientsRef, (snapshot) => {
      const list: Client[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Client));
      setClients(list);
      AQ8Database.saveClients(list);
    });

    const unsubscribeAppointments = onSnapshot(appointmentsRef, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Appointment));
      setAppointments(list);
      AQ8Database.saveAppointments(list);
    });

    const unsubscribeClientPackages = onSnapshot(clientPackagesRef, (snapshot) => {
      const list: ClientPackage[] = [];
      snapshot.forEach(doc => list.push(doc.data() as ClientPackage));
      setClientPackages(list);
      AQ8Database.saveClientPackages(list);
    });

    const unsubscribePayments = onSnapshot(paymentsRef, (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Payment));
      setPayments(list);
      AQ8Database.savePayments(list);
    });

    const unsubscribeMeasurements = onSnapshot(measurementsRef, (snapshot) => {
      const list: Measurement[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Measurement));
      setMeasurements(list);
      AQ8Database.saveMeasurements(list);
    });

    const unsubscribeBookingRequests = onSnapshot(bookingRequestsRef, (snapshot) => {
      const list: BookingRequest[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as BookingRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookingRequests(list);
    });

    return () => {
      unsubscribeManagers();
      unsubscribeClients();
      unsubscribeAppointments();
      unsubscribeClientPackages();
      unsubscribePayments();
      unsubscribeMeasurements();
      unsubscribeBookingRequests();
    };
  }, [crmRole, crmCenterId]);

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


  // 4. DATABASE SYNC WRAPPERS
  const updateCenters = (newCenters: Center[]) => {
    setCenters(newCenters);
    AQ8Database.saveCenters(newCenters);
    syncCollection('centers', newCenters, centers);
  };

  const updateManagers = (newManagers: CenterManager[]) => {
    setManagers(newManagers);
    AQ8Database.saveManagers(newManagers);
    syncCollection('managers', newManagers, managers);
  };

  const updateServices = (newServices: Service[]) => {
    setServices(newServices);
    AQ8Database.saveServices(newServices);
    syncCollection('services', newServices, services);
  };

  const updatePackages = (newPackages: Package[]) => {
    setPackages(newPackages);
    AQ8Database.savePackages(newPackages);
    syncCollection('packages', newPackages, packages);
  };

  const updateClients = (newClients: Client[]) => {
    setClients(newClients);
    AQ8Database.saveClients(newClients);
    syncCollection('clients', newClients, clients);
  };

  const updateAppointments = (newApts: Appointment[]) => {
    setAppointments(newApts);
    AQ8Database.saveAppointments(newApts);
    syncCollection('appointments', newApts, appointments);
  };

  const updateClientPackages = (newClientPkgs: ClientPackage[]) => {
    setClientPackages(newClientPkgs);
    AQ8Database.saveClientPackages(newClientPkgs);
    syncCollection('client_packages', newClientPkgs, clientPackages);
  };

  const updatePayments = (newPayments: Payment[]) => {
    setPayments(newPayments);
    AQ8Database.savePayments(newPayments);
    syncCollection('payments', newPayments, payments);
  };

  const updateMeasurements = (newMeas: Measurement[]) => {
    setMeasurements(newMeas);
    AQ8Database.saveMeasurements(newMeas);
    syncCollection('measurements', newMeas, measurements);
  };

  const updateSettings = (newSettings: GeneralSettings) => {
    setSettings(newSettings);
    AQ8Database.saveSettings(newSettings);
    saveDocument(db, 'settings', 'general', newSettings).catch(error => {
      console.error("Failed to update settings in Firestore:", error);
    });
  };

  const handleResetDatabase = async () => {
    if (!isDevToolsEnabled) {
      console.warn('Database reset is disabled outside development.');
      return;
    }

    if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs d\'origine ? Les données sur Firestore et vos modifications locales seront effacées.')) {
      try {
        AQ8Database.clearAndReset();

        // Clear collections in Firestore
        const collectionsToClear = [
          'centers', 'managers', 'services', 'packages', 'clients',
          'appointments', 'client_packages', 'payments', 'measurements'
        ];

        const batch = writeBatch(db);
        for (const colName of collectionsToClear) {
          const snapshot = await getDocs(collection(db, colName));
          snapshot.forEach(document => {
            batch.delete(doc(db, colName, document.id));
          });
        }
        // Also delete settings
        batch.delete(doc(db, 'settings', 'general'));

        await batch.commit();
        window.location.reload();
      } catch (error) {
        console.error("Failed to reset Firestore database:", error);
        window.location.reload();
      }
    }
  };

  // 5. AUTHENTICATION PORTAL ACTIONS
  const handleLoginSuccess = (role: CrmRole, centerId: string | null, managerName: string) => {
    setCrmRole(role);
    setCrmCenterId(centerId);
    setLoggedManagerName(managerName);
    navigate('crm');
  };

  const handleLogout = async () => {
    await signOut(auth).catch(() => undefined);
    setCrmRole(null);
    setCrmCenterId(null);
    setLoggedManagerName('');
    navigate('home');
  };

  const handlePublicReservationClick = () => {
    setMobileMenuOpen(false);

    if (currentRoute === 'center-detail') {
      document.getElementById('booking-form-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      return;
    }

    navigate('centers');
  };

  // Calculate high-level stats for Super Admin
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const currentCrmCenter = crmCenterId ? centers.find(center => center.id === crmCenterId) : null;
  const canUseCrmRoleSwitcher = isDevToolsEnabled && crmRole === 'super_admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] selection:bg-[#ff5757]/30 selection:text-[#353535]">

      {/* --- SITE PUBLIC HEADER / NAVIGATION BAR --- */}
      {currentRoute !== 'crm' && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-150 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <button
              type="button"
              onClick={() => navigate('home')}
              className="flex items-center cursor-pointer group"
              aria-label="Retour a l'accueil AQ8 Algerie"
            >
              <img
                src="/images/logo.png"
                alt="AQ8 Algerie"
                className="h-10 w-auto max-w-[145px] object-contain transition-premium group-hover:scale-[1.02] lg:h-11 lg:max-w-[170px]"
              />
            </button>

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

            {/* Primary actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handlePublicReservationClick}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff5757] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-[#ff5757]/20 transition-premium hover:bg-[#e94949] cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                R&eacute;server
              </button>
              <button
                onClick={() => handleResetDatabase()}
                title="Réinitialiser la base de démonstration"
                className="p-2 text-slate-400 hover:text-[#ff5757] hover:bg-rose-50 rounded-xl transition-premium"
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
                className="p-2 text-slate-400 hover:text-[#ff5757] rounded-xl"
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
              <button
                onClick={handlePublicReservationClick}
                className="mb-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5757] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-[#ff5757]/20 transition-premium hover:bg-[#e94949]"
              >
                <Calendar className="h-4 w-4" />
                R&eacute;server une s&eacute;ance
              </button>
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
        {(currentRoute !== 'crm' || !crmRole) ? (
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
              <Suspense fallback={<CrmLoadingState />}>
                <CrmPortal
                centers={centers}
                managers={managers}
                onLoginSuccess={handleLoginSuccess}
                />
              </Suspense>
            )}

            {currentRoute === 'crm' && !crmRole && (
              authReady ? (
                <Suspense fallback={<CrmLoadingState />}>
                  <CrmPortal
                  centers={centers}
                  managers={managers}
                  onLoginSuccess={handleLoginSuccess}
                  />
                </Suspense>
              ) : (
                <div className="py-20 text-center text-sm font-semibold text-slate-500">
                  Vérification de la session CRM...
                </div>
              )
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

              {/* CRM controls */}
              <div className="flex items-center gap-2 font-semibold">
                {canUseCrmRoleSwitcher && (
                  <>
                    <span className="text-slate-400 text-[11px] hidden lg:inline">Simulateur de role:</span>

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

                    <select
                      value={crmCenterId || ''}
                      onChange={(e) => {
                        const centerId = e.target.value;
                        const c = centers.find(center => center.id === centerId);
                        const matchedMgr = managers.find(m => m.centerId === centerId);
                        setCrmRole('center_manager');
                        setCrmCenterId(centerId);
                        setLoggedManagerName(`${matchedMgr?.name || 'Manager'} (${c?.name || 'Centre'})`);
                      }}
                      className="bg-white/10 text-white rounded-md text-[10px] px-2 py-1 focus:outline-none border border-white/10"
                    >
                      <option value="" disabled className="text-slate-800">-- Choisir un centre --</option>
                      {centers.map(c => (
                        <option key={c.id} value={c.id} className="text-slate-800">{c.name} ({c.city})</option>
                      ))}
                    </select>
                  </>
                )}

                {crmRole === 'center_manager' && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                    <Building className="h-3.5 w-3.5 text-[#ff5757]" />
                    {currentCrmCenter?.name || 'Centre assigne'}
                  </span>
                )}

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
                        { id: 'settings' as const, label: 'Parametres Généraux', icon: Settings }
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
                        { id: 'services' as const, label: 'Prestations & Forfaits', icon: Layers },
                        { id: 'settings' as const, label: 'Parametres', icon: Settings }
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
                  className="w-full py-2 px-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                <Suspense fallback={<CrmLoadingState />}>
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
                </Suspense>
              ) : (
                /* RENDER CENTER MANAGER VIEW BLOCK (STRICT ISOLATION VIA CURRENT CENTERID) */
                <Suspense fallback={<CrmLoadingState />}>
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
                  bookingRequests={bookingRequests}
                  onUpdateClients={updateClients}
                  onUpdatePayments={updatePayments}
                  onUpdateMeasurements={updateMeasurements}
                  activeTab={crmCenterManagerTab}
                  onTabChange={setCrmCenterManagerTab}
                />
                </Suspense>
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
              <button
                type="button"
                onClick={() => navigate('home')}
                className="inline-flex rounded-xl bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                aria-label="Retour a l'accueil AQ8 Algerie"
              >
                <img
                  src="/images/logo.png"
                  alt="AQ8 Algerie"
                  className="h-10 w-auto max-w-[165px] object-contain"
                />
              </button>
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
