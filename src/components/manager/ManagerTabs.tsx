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
  /** Optional badge counts per tab — only non-zero values render a badge */
  badges?: Partial<Record<SubTabId, number>>;
}

export function ManagerTabs({
  activeTab,
  onTabChange,
  onClearSelectedClient,
  badges = {}
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
      {tabs.map(tab => {
        const badgeCount = badges[tab.id] || 0;
        return (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            onClick={() => {
              onClearSelectedClient();
              onTabChange(tab.id);
            }}
            className={`relative flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-premium border-b-2 -mb-px cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#ff5757] text-[#ff5757]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
            {badgeCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-[#ff5757] text-white text-[9px] font-black leading-none animate-pulse">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
