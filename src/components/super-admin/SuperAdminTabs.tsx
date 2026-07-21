import { Award, BarChart3, Building, Settings, Users, ShieldCheck } from 'lucide-react';

export type SuperAdminTabId = 'dashboard' | 'centers' | 'managers' | 'services' | 'stats' | 'settings' | 'audit';

type SuperAdminTabsProps = {
  activeTab: SuperAdminTabId;
  onTabChange: (tab: SuperAdminTabId) => void;
};

const tabs: Array<{ id: SuperAdminTabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Vue Globale', icon: BarChart3 },
  { id: 'centers', label: 'Gestion Centres', icon: Building },
  { id: 'managers', label: 'Managers & Accès', icon: Users },
  { id: 'services', label: 'Prestations & Tarifs', icon: Award },
  { id: 'stats', label: 'Analyses', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres généraux', icon: Settings },
  { id: 'audit', label: "Journal d'Audit", icon: ShieldCheck }
];

export function SuperAdminTabs({ activeTab, onTabChange }: SuperAdminTabsProps) {
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-px scrollbar-thin">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-premium border-b-2 -mb-px ${activeTab === tab.id ? 'border-[#ff5757] text-[#ff5757]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon className="h-4 w-4" /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}