/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Calendar, Users, DollarSign, Layers, Settings } from 'lucide-react';

export type SubTabId = 'dashboard' | 'schedule' | 'clients' | 'bookings' | 'payments' | 'services' | 'settings';

interface TabItem {
  id: SubTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ManagerTabsProps {
  activeTab: SubTabId;
  onTabChange: (tabId: SubTabId) => void;
  onClearSelectedClient: () => void;
}

export function ManagerTabs({
  activeTab,
  onTabChange,
  onClearSelectedClient
}: ManagerTabsProps) {
  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Activity },
    { id: 'schedule', label: 'Planning du Jour', icon: Calendar },
    { id: 'clients', label: 'Gestion Clients', icon: Users },
    { id: 'bookings', label: 'Réservations', icon: Calendar },
    { id: 'payments', label: 'Paiements Encaissés', icon: DollarSign },
    { id: 'services', label: 'Prestations & Forfaits', icon: Layers },
    { id: 'settings', label: 'Parametres', icon: Settings }
  ];

  return (
    <div id="manager-navigation-tabs" className="flex border-b border-slate-200 overflow-x-auto gap-1 pb-px scrollbar-thin">
      {tabs.map(tab => (
        <button
          key={tab.id}
          id={`tab-btn-${tab.id}`}
          onClick={() => {
            onClearSelectedClient();
            onTabChange(tab.id);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-premium border-b-2 -mb-px cursor-pointer ${
            activeTab === tab.id
              ? 'border-[#ff5757] text-[#ff5757]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <tab.icon className="h-4 w-4" /> {tab.label}
        </button>
      ))}
    </div>
  );
}
