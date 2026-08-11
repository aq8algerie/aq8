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
    { id: 'schedule', label: 'Planning du jour', icon: Calendar },
    { id: 'clients', label: 'Gestion clients', icon: Users },
    { id: 'bookings', label: 'Réservations', icon: Calendar },
    { id: 'payments', label: 'Paiements Encaissés', icon: DollarSign },
    { id: 'services', label: 'Prestations & Forfaits', icon: Layers },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  const mobileTabs: TabItem[] = [
    { id: 'dashboard', label: 'Bord', icon: Activity },
    { id: 'schedule', label: 'Planning', icon: Calendar },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'payments', label: 'Caisses', icon: DollarSign },
    { id: 'settings', label: 'Plus', icon: Settings }
  ];

  return (
    <>
      {/* Desktop & Tablet Top Scrollable Tabs */}
      <div id="manager-navigation-tabs" role="tablist" aria-label="Navigation du centre" className="hidden md:flex border-b border-slate-200 overflow-x-auto gap-1 pb-px scrollbar-thin">
        {tabs.map(tab => {
          const badgeCount = badges[tab.id] || 0;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                onClearSelectedClient();
                onTabChange(tab.id);
              }}
              className={`relative flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-premium border-b-2 -mb-px cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#0284c7] text-[#0284c7]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
              {badgeCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-[#0284c7] text-white text-[9px] font-black leading-none animate-pulse">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Top Horizontal Compact Bar */}
      <div className="flex md:hidden border-b border-slate-200 overflow-x-auto gap-1 pb-px scrollbar-none px-1">
        {tabs.map(tab => {
          const badgeCount = badges[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onClearSelectedClient();
                onTabChange(tab.id);
              }}
              className={`relative flex items-center gap-1 px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded-lg cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0284c7] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
              {badgeCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-3.5 min-w-[0.875rem] px-1 rounded-full bg-rose-500 text-white text-[8px] font-black">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fixed Bottom Navigation Bar for Mobile Smartphones (Native App Style) */}
      <nav aria-label="Navigation mobile rapide" className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1.5 md:hidden flex justify-around items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {mobileTabs.map(tab => {
          const isActive = activeTab === tab.id || (tab.id === 'settings' && ['services', 'bookings'].includes(activeTab));
          const badgeCount = badges[tab.id] || 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onClearSelectedClient();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative min-w-[56px] ${
                isActive
                  ? 'text-[#0284c7] font-black'
                  : 'text-slate-500 font-semibold hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <tab.icon className={`h-5 w-5 ${isActive ? 'scale-110 text-[#0284c7]' : ''}`} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-[#0284c7] absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
