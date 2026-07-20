"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Center, Service, Package, GeneralSettings } from "@/src/types";
import { db } from "@/src/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { INITIAL_CENTERS, INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_SETTINGS } from "@/src/mockData";

interface DataContextType {
  centers: Center[];
  services: Service[];
  packages: Package[];
  settings: GeneralSettings | null;
  loading: boolean;
}

const DataContext = createContext<DataContextType>({
  centers: INITIAL_CENTERS,
  services: INITIAL_SERVICES,
  packages: INITIAL_PACKAGES,
  settings: INITIAL_SETTINGS,
  loading: true,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [centers, setCenters] = useState<Center[]>(INITIAL_CENTERS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [packages, setPackages] = useState<Package[]>(INITIAL_PACKAGES);
  const [settings, setSettings] = useState<GeneralSettings | null>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCenters = onSnapshot(collection(db, "centers"), (snapshot) => {
      const list: Center[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Center));
      setCenters(list.length > 0 ? list : INITIAL_CENTERS);
    }, (error) => {
      console.error("Error loading centers:", error);
    });

    const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const list: Service[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Service));
      setServices(list.length > 0 ? list : INITIAL_SERVICES);
    }, (error) => {
      console.error("Error loading services:", error);
    });

    const unsubPackages = onSnapshot(collection(db, "packages"), (snapshot) => {
      const list: Package[] = [];
      snapshot.forEach(doc => list.push(doc.data() as Package));
      setPackages(list.length > 0 ? list : INITIAL_PACKAGES);
    }, (error) => {
      console.error("Error loading packages:", error);
    });

    const unsubSettings = onSnapshot(collection(db, "settings"), (snapshot) => {
      let resolved: GeneralSettings | null = null;
      snapshot.forEach(doc => {
        if (doc.id === "general") resolved = doc.data() as GeneralSettings;
      });
      setSettings(resolved || INITIAL_SETTINGS);
      setLoading(false);
    }, (error) => {
      console.error("Error loading settings:", error);
    });

    return () => {
      unsubCenters();
      unsubServices();
      unsubPackages();
      unsubSettings();
    };
  }, []);

  return (
    <DataContext.Provider value={{ centers, services, packages, settings, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
