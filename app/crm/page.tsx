"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import {
  Activity,
  Calendar,
  Building,
  Users,
  DollarSign,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Phone,
  MapPin,
  Sun,
  Moon,
  Layers,
  BarChart3
} from "lucide-react";

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
} from "@/src/types";

import {
  AQ8Database,
  INITIAL_CENTERS,
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_SETTINGS
} from "@/src/mockData";
import { auth, db } from "@/src/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useData } from "@/components/context/DataProvider";

import { saveDocument, syncCollection as syncFirestoreCollection } from "@/src/lib/firestoreRepository";
import { getPublicCenters } from "@/src/lib/centerVisibility";

import { CrmPortal } from "@/src/components/CrmPortal";
import { SuperAdminViews } from "@/src/components/SuperAdminViews";
import { CenterManagerViews } from "@/src/components/CenterManagerViews";
import { SuperAdminTabId } from "@/src/components/super-admin/SuperAdminTabs";

type CrmRole = "super_admin" | "center_manager";

type CrmProfile = {
  role?: string;
  centerId?: string | null;
  name?: string;
  displayName?: string;
  active?: boolean;
};

function CrmLoadingState() {
  return (
    <div className="py-16 text-center text-sm font-semibold text-slate-500">
      Chargement du CRM...
    </div>
  );
}

export default function CrmPage() {
  const { centers, services, packages, settings } = useData();

  // Authentication & session states
  const [authReady, setAuthReady] = useState(false);
  const [crmRole, setCrmRole] = useState<CrmRole | null>(null);
  const [crmCenterId, setCrmCenterId] = useState<string | null>(null);
  const [loggedManagerName, setLoggedManagerName] = useState("");

  // CRM collections states (loaded after login)
  const [managers, setManagers] = useState<CenterManager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);

  // Navigation and UI state within the CRM
  const [crmSuperAdminTab, setCrmSuperAdminTab] = useState<SuperAdminTabId>("dashboard");
  const [crmCenterManagerTab, setCrmCenterManagerTab] = useState<"dashboard" | "schedule" | "clients" | "bookings" | "payments" | "services" | "settings">("dashboard");
  const [crmSidebarOpen, setCrmSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isDevToolsEnabled = process.env.NODE_ENV === "development" || typeof window !== "undefined" && window.location.hostname === "localhost";
  const canUseCrmRoleSwitcher = isDevToolsEnabled && crmRole === "super_admin";
  const publicCenters = useMemo(() => getPublicCenters(centers), [centers]);

  // Sync helpers
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

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCrmRole(null);
        setCrmCenterId(null);
        setLoggedManagerName("");
        setAuthReady(true);
        return;
      }

      try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!profileSnapshot.exists()) {
          await signOut(auth);
          setAuthReady(true);
          return;
        }

        const profile = profileSnapshot.data() as CrmProfile;
        if (profile.active === false || (profile.role !== "super_admin" && profile.role !== "center_manager")) {
          await signOut(auth);
          setAuthReady(true);
          return;
        }

        setCrmRole(profile.role as CrmRole);
        setCrmCenterId(profile.role === "center_manager" ? profile.centerId || null : null);
        setLoggedManagerName(profile.displayName || profile.name || user.displayName || user.email || "Utilisateur CRM");
      } catch (error) {
        console.error("Failed to restore CRM session:", error);
        await signOut(auth).catch(() => undefined);
        setCrmRole(null);
        setCrmCenterId(null);
        setLoggedManagerName("");
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  // Sync real-time Firestore listeners once authenticated
  useEffect(() => {
    if (!crmRole || (crmRole === "center_manager" && !crmCenterId)) {
      setManagers([]);
      setClients([]);
      setAppointments([]);
      setClientPackages([]);
      setPayments([]);
      setMeasurements([]);
      setBookingRequests([]);
      return;
    }

    const managersRef = crmRole === "super_admin" ? collection(db, "managers") : query(collection(db, "managers"), where("centerId", "==", crmCenterId));
    const clientsRef = crmRole === "super_admin" ? collection(db, "clients") : query(collection(db, "clients"), where("centerId", "==", crmCenterId));
    const appointmentsRef = crmRole === "super_admin" ? collection(db, "appointments") : query(collection(db, "appointments"), where("centerId", "==", crmCenterId));
    const clientPackagesRef = crmRole === "super_admin" ? collection(db, "client_packages") : query(collection(db, "client_packages"), where("centerId", "==", crmCenterId));
    const paymentsRef = crmRole === "super_admin" ? collection(db, "payments") : query(collection(db, "payments"), where("centerId", "==", crmCenterId));
    const measurementsRef = crmRole === "super_admin" ? collection(db, "measurements") : query(collection(db, "measurements"), where("centerId", "==", crmCenterId));
    const bookingRequestsRef = crmRole === "super_admin" ? collection(db, "booking_requests") : query(collection(db, "booking_requests"), where("centerId", "==", crmCenterId));

    const unsubManagers = onSnapshot(managersRef, (snapshot) => {
      const list: CenterManager[] = [];
      snapshot.forEach(doc => list.push(doc.data() as CenterManager));
      setManagers(list);
      AQ8Database.saveManagers(list);
    });

    const unsubClients = onSnapshot(clientsRef, (snapshot) => {
      const list: Client[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Client));
      setClients(list);
      AQ8Database.saveClients(list);
    });

    const unsubAppointments = onSnapshot(appointmentsRef, (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Appointment));
      setAppointments(list);
      AQ8Database.saveAppointments(list);
    });

    const unsubClientPackages = onSnapshot(clientPackagesRef, (snapshot) => {
      const list: ClientPackage[] = [];
      snapshot.forEach(doc => list.push(doc.data() as ClientPackage));
      setClientPackages(list);
      AQ8Database.saveClientPackages(list);
    });

    const unsubPayments = onSnapshot(paymentsRef, (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Payment));
      setPayments(list);
      AQ8Database.savePayments(list);
    });

    const unsubMeasurements = onSnapshot(measurementsRef, (snapshot) => {
      const list: Measurement[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Measurement));
      setMeasurements(list);
      AQ8Database.saveMeasurements(list);
    });

    const unsubBookingRequests = onSnapshot(bookingRequestsRef, (snapshot) => {
      const list: BookingRequest[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as BookingRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookingRequests(list);
    });

    return () => {
      unsubManagers();
      unsubClients();
      unsubAppointments();
      unsubClientPackages();
      unsubPayments();
      unsubMeasurements();
      unsubBookingRequests();
    };
  }, [crmRole, crmCenterId]);

  // Set up theme settings
  useEffect(() => {
    const savedTheme = localStorage.getItem("aq8_theme");
    setIsDarkMode(savedTheme === "dark");
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem("aq8_theme", newVal ? "dark" : "light");
      return newVal;
    });
  };

  const handleLoginSuccess = (role: CrmRole, centerId: string | null, managerName: string) => {
    setCrmRole(role);
    setCrmCenterId(centerId);
    setLoggedManagerName(managerName);
  };

  const handleLogout = async () => {
    await signOut(auth).catch(() => undefined);
    setCrmRole(null);
    setCrmCenterId(null);
    setLoggedManagerName("");
  };

  const handleResetDatabase = async () => {
    try {
      const { resetDatabase } = await import("@/src/lib/devTools");
      await resetDatabase(db, isDevToolsEnabled);
    } catch (error) {
      console.error("Failed to reset database:", error);
    }
  };

  const updateCenters = (newCenters: Center[]) => {
    syncCollection("centers", newCenters, centers);
  };
  const updateManagers = (newManagers: CenterManager[]) => {
    syncCollection("managers", newManagers, managers);
  };
  const updateServices = (newServices: Service[]) => {
    syncCollection("services", newServices, services);
  };
  const updatePackages = (newPackages: Package[]) => {
    syncCollection("packages", newPackages, packages);
  };
  const updateClients = (newClients: Client[]) => {
    syncCollection("clients", newClients, clients);
  };
  const updatePayments = (newPayments: Payment[]) => {
    syncCollection("payments", newPayments, payments);
  };
  const updateMeasurements = (newMeas: Measurement[]) => {
    syncCollection("measurements", newMeas, measurements);
  };
  const updateSettings = (newSettings: GeneralSettings) => {
    saveDocument(db, "settings", "general", newSettings).catch(error => {
      console.error("Failed to update settings in Firestore:", error);
    });
  };

  const totalRevenue = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const currentCrmCenter = crmCenterId ? centers.find(center => center.id === crmCenterId) : null;

  if (!authReady) {
    return <CrmLoadingState />;
  }

  // RENDER AUTHENTICATION FORM IF NOT LOGGED IN
  if (!crmRole) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <CrmPortal
          centers={centers}
          managers={managers}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${isDarkMode ? "dark bg-[#0b0b0f] text-slate-100" : "bg-[#f8f9fa] text-slate-800"}`}>
      {/* Simulation Bar at the top */}
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

        <div className="flex items-center gap-2 font-semibold">
          {canUseCrmRoleSwitcher && (
            <>
              <span className="text-slate-400 text-[11px] hidden lg:inline">Simulateur de role:</span>
              <button
                onClick={() => {
                  setCrmRole("super_admin");
                  setCrmCenterId(null);
                  setLoggedManagerName("Karim Benchikh (Super Admin)");
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] transition ${crmRole === "super_admin" ? "bg-[#ff5757] text-white font-bold shadow-sm" : "bg-white/10 text-slate-300 hover:bg-white/15"}`}
              >
                Super Admin
              </button>

              <select
                value={crmCenterId || ""}
                onChange={(e) => {
                  const centerId = e.target.value;
                  const c = centers.find(center => center.id === centerId);
                  const matchedMgr = managers.find(m => m.centerId === centerId);
                  setCrmRole("center_manager");
                  setCrmCenterId(centerId);
                  setLoggedManagerName(`${matchedMgr?.name || "Manager"} (${c?.name || "Centre"})`);
                }}
                className="bg-white/10 text-white rounded-md text-[10px] px-2 py-1 focus:outline-none border border-white/10"
              >
                <option value="" disabled className="text-slate-800">-- Choisir un centre --</option>
                {publicCenters.map(c => (
                  <option key={c.id} value={c.id} className="text-slate-800">{c.name} ({c.city})</option>
                ))}
              </select>
            </>
          )}

          {crmRole === "center_manager" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
              <Building className="h-3.5 w-3.5 text-[#ff5757]" />
              {currentCrmCenter?.name || "Centre assigné"}
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
            className="ml-2 p-1 text-slate-400 hover:text-white transition cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4 text-[#ff5757]" />
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {crmSidebarOpen && (
        <div
          onClick={() => setCrmSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-35 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Layout */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111115] text-white border-r border-slate-800/80 p-5 pt-16 flex flex-col justify-between shrink-0 transform md:transform-none transition-transform duration-300 md:fixed md:top-12 md:bottom-0 md:left-0 shadow-xl ${crmSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="space-y-6 text-xs">
          <div className="space-y-1 py-2 border-b border-white/5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">AQ8 WORKSPACE</span>
            <span className="text-sm font-bold text-white block">
              {crmRole === "super_admin" ? "Super Admin" : "Manager de Centre"}
            </span>
            {crmRole === "center_manager" && (
              <span className="inline-block bg-[#ff5757]/15 text-[#ff5757] px-2 py-0.5 mt-1 rounded-sm font-bold uppercase text-[9px]">
                {centers.find(c => c.id === crmCenterId)?.name || "AQ8 Centre"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-1">Menu Principal</p>

            {crmRole === "super_admin" ? (
              <nav className="space-y-1">
                {[
                  { id: "dashboard" as const, label: "Tableau de bord", icon: Activity },
                  { id: "centers" as const, label: "Gestion Centres", icon: Building },
                  { id: "managers" as const, label: "Managers & Accès", icon: Users },
                  { id: "stats" as const, label: "Analyses Réseau", icon: BarChart3 },
                  { id: "settings" as const, label: "Paramètres Généraux", icon: Settings },
                  { id: "audit" as const, label: "Journal d'Audit", icon: ShieldCheck }
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
                          ? "bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20 font-extrabold"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            ) : (
              <nav className="space-y-1">
                {[
                  { id: "dashboard" as const, label: "Tableau de bord", icon: Activity },
                  { id: "schedule" as const, label: "Planning du Jour", icon: Calendar },
                  { id: "clients" as const, label: "Gestion Clients", icon: Users },
                  { id: "bookings" as const, label: "Réservations", icon: Calendar },
                  { id: "payments" as const, label: "Paiements Encaissés", icon: DollarSign },
                  { id: "services" as const, label: "Prestations & Forfaits", icon: Layers },
                  { id: "settings" as const, label: "Paramètres", icon: Settings }
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
                          ? "bg-[#ff5757] text-white shadow-md shadow-[#ff5757]/20 font-extrabold"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-6 border-t border-white/5 text-xs font-semibold">
          <button
            onClick={() => handleResetDatabase()}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer text-left"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Réinitialiser démo</span>
          </button>
        </div>
      </aside>

      {/* CRM Workspace Body */}
      <section className="flex-1 p-4 md:p-8 md:pl-72 pt-16 md:pt-20 min-h-screen">
        {crmRole === "super_admin" ? (
          <Suspense fallback={<CrmLoadingState />}>
            <SuperAdminViews
              centers={centers}
              managers={managers}
              services={services}
              packages={packages}
              settings={settings || { appName: "AQ8 Algérie", contactEmail: "contact@aq8algerie.com", contactPhone: "+213 (0) 23 48 50 60", addressAlgérie: "Hydra, Alger", currency: "DZD", enableVoucherPromo: true }}
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
              userId={auth.currentUser?.uid || ""}
              userName={loggedManagerName}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<CrmLoadingState />}>
            <CenterManagerViews
              centerId={crmCenterId || "center-1"}
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
              userId={auth.currentUser?.uid || ""}
              userName={loggedManagerName}
            />
          </Suspense>
        )}
      </section>
    </div>
  );
}
