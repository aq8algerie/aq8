import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckSquare,
  Edit3,
  Eye,
  LayoutGrid,
  List,
  Mars,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Square,
  Trash2,
  User,
  Users,
  Venus,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Appointment, Client, ClientPackage, ClientStatus } from '../../types';
import { analyzeClientRetention } from '../../lib/crmRetention';

interface ManagerClientsViewProps {
  centerId: string;
  clients: Client[];
  clientPackages: ClientPackage[];
  appointments?: Appointment[];
  onSelectClient: (clientId: string) => void;
  onEditClient: (clientId: string) => void;
  onUpdateClientStatus: (clientIds: string[], status: ClientStatus) => void;
  onDeleteClients: (clientIds: string[]) => void;
  onRegisterClientClick: () => void;
}

type StatusFilter = 'all' | ClientStatus;
type SubFilterType = 'all' | 'has_active' | 'no_active' | 'inactive_30d' | 'renewal_needed';

export function ManagerClientsView({
  centerId,
  clients,
  clientPackages,
  appointments = [],
  onSelectClient,
  onEditClient,
  onUpdateClientStatus,
  onDeleteClients,
  onRegisterClientClick,
}: ManagerClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridLimit, setGridLimit] = useState(12);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState<20 | 50 | 100 | 200>(20);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const [genderFilter, setGenderFilter] = useState<'all' | 'H' | 'F'>('all');
  const [subFilter, setSubFilter] = useState<SubFilterType>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'this_year'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const clientPageSizes = [20, 50, 100, 200] as const;
  const centerClients = useMemo(() => clients.filter(client => client.centerId === centerId), [centerId, clients]);

  // Retention Map analysis
  const retentionMap = useMemo(() => {
    const analysis = analyzeClientRetention(clients, appointments, clientPackages, centerId);
    const map = new Map<string, ReturnType<typeof analyzeClientRetention>[0]>();
    analysis.forEach(item => map.set(item.client.id, item));
    return map;
  }, [clients, appointments, clientPackages, centerId]);

  const safeText = (value: unknown) => String(value ?? '').trim();
  const getClientStatus = (client: Client): ClientStatus => client.status === 'suspended' ? 'suspended' : 'active';
  const isSuspended = (client: Client) => getClientStatus(client) === 'suspended';
  const hasActivePackage = (client: Client) => clientPackages.some(
    cp => cp.clientId === client.id && cp.status === 'active' && cp.centerId === centerId
  );

  const getClientDisplayName = (client: Client) => {
    const fullName = [safeText(client.firstName), safeText(client.lastName)].filter(Boolean).join(' ');
    return fullName || safeText(client.phone) || safeText(client.email) || 'Client sans nom';
  };

  const getClientInitials = (client: Client) => {
    const first = safeText(client.firstName).charAt(0);
    const last = safeText(client.lastName).charAt(0);
    const fallback = getClientDisplayName(client).charAt(0);
    return `${first}${last || (!first ? fallback : '')}`.toUpperCase() || 'C';
  };

  const filteredClients = useMemo(() => centerClients.filter(client => {
    const fullName = getClientDisplayName(client).toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const phone = safeText(client.phone).toLowerCase();
    const email = safeText(client.email).toLowerCase();
    const matchesSearch = !query || fullName.includes(query) || phone.includes(query) || email.includes(query);
    if (!matchesSearch) return false;

    if (genderFilter !== 'all' && client.gender !== genderFilter) return false;

    if (statusFilter !== 'all' && getClientStatus(client) !== statusFilter) return false;

    const retention = retentionMap.get(client.id);

    if (subFilter !== 'all') {
      const activePackage = hasActivePackage(client);
      if (subFilter === 'has_active' && !activePackage) return false;
      if (subFilter === 'no_active' && activePackage) return false;
      if (subFilter === 'inactive_30d' && (!retention || !retention.isInactive30Days)) return false;
      if (subFilter === 'renewal_needed' && (!retention || !retention.needsPackageRenewal)) return false;
    }

    if (periodFilter !== 'all') {
      const createdDate = new Date(client.createdAt);
      const now = new Date();
      if (Number.isNaN(createdDate.getTime())) return false;
      if (periodFilter === 'this_month') {
        const isThisMonth = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return false;
      }
      if (periodFilter === 'this_year' && createdDate.getFullYear() !== now.getFullYear()) return false;
    }

    return true;
  }), [centerClients, clientPackages, genderFilter, periodFilter, searchQuery, statusFilter, subFilter, retentionMap]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / listPageSize));
  const paginatedClients = filteredClients.slice((listPage - 1) * listPageSize, listPage * listPageSize);
  const gridClients = filteredClients.slice(0, gridLimit);
  const visibleClients = viewMode === 'list' ? paginatedClients : gridClients;
  const visibleClientIds = visibleClients.map(client => client.id);
  const selectedSet = new Set(selectedClientIds);
  const allVisibleSelected = visibleClientIds.length > 0 && visibleClientIds.every(id => selectedSet.has(id));
  const selectedClients = selectedClientIds
    .map(id => centerClients.find(client => client.id === id))
    .filter((client): client is Client => Boolean(client));
  const selectedSuspendedCount = selectedClients.filter(isSuspended).length;
  const selectedActiveCount = selectedClients.length - selectedSuspendedCount;
  const activeCount = centerClients.filter(client => !isSuspended(client)).length;
  const suspendedCount = centerClients.length - activeCount;

  useEffect(() => {
    setListPage(1);
    setGridLimit(12);
  }, [searchQuery, genderFilter, subFilter, periodFilter, statusFilter, listPageSize]);

  useEffect(() => {
    const validIds = new Set(centerClients.map(client => client.id));
    setSelectedClientIds(prev => prev.filter(id => validIds.has(id)));
  }, [centerClients]);

  useEffect(() => {
    if (listPage > totalPages) {
      setListPage(totalPages);
    }
  }, [listPage, totalPages]);

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => prev.includes(clientId)
      ? prev.filter(id => id !== clientId)
      : [...prev, clientId]
    );
  };

  const toggleAllVisible = () => {
    if (visibleClientIds.length === 0) return;
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleClientIds.forEach(id => next.delete(id));
      } else {
        visibleClientIds.forEach(id => next.add(id));
      }
      return Array.from(next);
    });
  };

  const requestBulkStatus = (status: ClientStatus) => {
    if (selectedClientIds.length === 0) return;
    onUpdateClientStatus(selectedClientIds, status);
  };

  const requestBulkDelete = () => {
    if (selectedClientIds.length === 0) return;
    onDeleteClients(selectedClientIds);
  };

  const renderStatusBadge = (client: Client) => {
    const suspended = isSuspended(client);
    const retention = retentionMap.get(client.id);

    return (
      <div className="flex flex-wrap gap-1 items-center">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
          suspended
            ? 'border border-amber-100 bg-amber-50 text-amber-700'
            : 'border border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {suspended ? 'Suspendu' : 'Actif'}
        </span>

        {retention?.isInactive30Days && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border border-rose-200 bg-rose-50 text-rose-700 animate-pulse">
            <Clock className="h-2.5 w-2.5" /> Inactif ({retention.daysInactive}j)
          </span>
        )}

        {retention?.needsPackageRenewal && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border border-amber-200 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-2.5 w-2.5" />
            {retention.renewalReason === 'expired'
              ? 'Forfait expiré'
              : retention.renewalReason === 'low_credit'
              ? `Solde bas (${retention.sessionsRemaining} séa.)`
              : 'Sans forfait'}
          </span>
        )}
      </div>
    );
  };

  const renderSelectionButton = (client: Client, compact = false) => {
    const selected = selectedSet.has(client.id);
    return (
      <button
        type="button"
        onClick={() => toggleClientSelection(client.id)}
        className={`inline-flex items-center justify-center rounded-lg transition cursor-pointer ${
          compact ? 'h-8 w-8' : 'h-9 w-9'
        } ${selected ? 'bg-[#ff5757] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
        aria-label={selected ? 'Retirer de la selection' : 'Selectionner le client'}
      >
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
    );
  };

  const renderClientActions = (client: Client, layout: 'grid' | 'list') => {
    const suspended = isSuspended(client);
    const buttonBase = layout === 'grid'
      ? 'min-w-0 rounded-xl px-2 py-2 text-[10px] font-extrabold transition cursor-pointer inline-flex items-center justify-center gap-1'
      : 'rounded-lg px-2 py-1.5 text-[10px] font-extrabold transition cursor-pointer inline-flex items-center justify-center gap-1';

    const phone = client.phone ? client.phone.replace(/\s+/g, '') : '';
    const whatsappUrl = phone ? `https://wa.me/${phone.startsWith('0') ? '213' + phone.slice(1) : phone}` : '';

    return (
      <div className={layout === 'grid' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-wrap justify-end gap-1 border-t sm:border-0 pt-2 sm:pt-0'}>
        <button type="button" onClick={() => onSelectClient(client.id)} className={`${buttonBase} bg-slate-100 text-slate-700 hover:bg-[#353535] hover:text-white`}>
          <Eye className="h-3.5 w-3.5" /> Fiche
        </button>

        {phone ? (
          <a href={`tel:${phone}`} className={`${buttonBase} bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white`}>
            <PhoneCall className="h-3.5 w-3.5" /> Appeler
          </a>
        ) : null}

        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${buttonBase} bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white`}>
            <MessageCircle className="h-3.5 w-3.5" /> Relancer
          </a>
        ) : null}

        <button type="button" onClick={() => onEditClient(client.id)} className={`${buttonBase} bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white`}>
          <Edit3 className="h-3.5 w-3.5" /> Modifier
        </button>

        <button
          type="button"
          onClick={() => onUpdateClientStatus([client.id], suspended ? 'active' : 'suspended')}
          className={`${buttonBase} ${
            suspended
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white'
          }`}
        >
          {suspended ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
          {suspended ? 'Reactiver' : 'Suspendre'}
        </button>

        <button type="button" onClick={() => onDeleteClients([client.id])} className={`${buttonBase} bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white`}>
          <Trash2 className="h-3.5 w-3.5" /> Suppr.
        </button>
      </div>
    );
  };

  return (
    <div id="manager-clients-view" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-slate-800">
            Fichier Clients & Relances Rétention ({centerClients.length})
          </h3>
          <p className="text-[10px] font-medium text-slate-400">
            {activeCount} actifs • {suspendedCount} suspendus • Suivi des réabonnements et inactivité.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex rounded-xl border border-slate-200/50 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white text-[#ff5757] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            id="btn-register-client"
            type="button"
            onClick={onRegisterClientClick}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#ff5757] px-3.5 py-1.5 text-xs font-semibold text-white transition-premium hover:bg-[#e04646] sm:flex-initial cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Enregistrer un client
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus-within:border-[#ff5757]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            id="client-list-search"
            type="text"
            placeholder="Rechercher par prenom, nom, e-mail ou telephone..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Genre</label>
            <select value={genderFilter} onChange={(event) => setGenderFilter(event.target.value as 'all' | 'H' | 'F')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none font-bold">
              <option value="all">Tous les genres</option>
              <option value="H">Homme</option>
              <option value="F">Femme</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Statut client</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none font-bold">
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Abonnement & Relances</label>
            <select value={subFilter} onChange={(event) => setSubFilter(event.target.value as SubFilterType)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none font-bold">
              <option value="all">Tous les profils</option>
              <option value="has_active">Avec forfait actif</option>
              <option value="no_active">Sans forfait actif</option>
              <option value="inactive_30d">🚨 Relance : Inactifs (&gt; 30 jours)</option>
              <option value="renewal_needed">⏳ Relance : Forfait à renouveler</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Periode</label>
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as 'all' | 'this_month' | 'this_year')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none">
              <option value="all">Toutes les periodes</option>
              <option value="this_month">Ce mois-ci</option>
              <option value="this_year">Cette annee</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          <button type="button" onClick={toggleAllVisible} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 transition hover:bg-slate-200 cursor-pointer">
            {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-[#ff5757]" /> : <Square className="h-4 w-4 text-slate-400" />}
            {allVisibleSelected ? 'Deselectionner la vue' : 'Selectionner la vue'}
          </button>
          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-slate-500">
            <Users className="h-4 w-4" /> {selectedClientIds.length} selectionne(s)
          </span>
        </div>

        {selectedClientIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => requestBulkStatus('suspended')} disabled={selectedActiveCount === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-extrabold text-amber-700 transition hover:bg-amber-600 hover:text-white disabled:opacity-40 disabled:hover:bg-amber-50 disabled:hover:text-amber-700 cursor-pointer">
              <PauseCircle className="h-3.5 w-3.5" /> Suspendre
            </button>
            <button type="button" onClick={() => requestBulkStatus('active')} disabled={selectedSuspendedCount === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-700 transition hover:bg-emerald-600 hover:text-white disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 cursor-pointer">
              <PlayCircle className="h-3.5 w-3.5" /> Reactiver
            </button>
            <button type="button" onClick={requestBulkDelete} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-extrabold text-rose-700 transition hover:bg-rose-600 hover:text-white cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
            <button type="button" onClick={() => setSelectedClientIds([])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold text-slate-500 transition hover:bg-slate-50 cursor-pointer">
              Vider
            </button>
          </div>
        )}
      </div>

      {viewMode === 'grid' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {gridClients.map(client => {
              const activePkg = clientPackages.find(cp => cp.clientId === client.id && cp.status === 'active' && cp.centerId === centerId);
              const initials = getClientInitials(client);
              const displayName = getClientDisplayName(client);
              const suspended = isSuspended(client);
              const isFemale = client.gender === 'F';
              const genderColor = isFemale
                ? 'from-rose-400 to-pink-500 shadow-rose-100 text-white'
                : 'from-blue-400 to-indigo-500 shadow-indigo-100 text-white';

              return (
                <article key={client.id} className={`relative flex flex-col justify-between space-y-4 overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-md ${suspended ? 'border-amber-100 opacity-80' : 'border-slate-100'}`}>
                  <div className="absolute right-3 top-3 z-10">
                    {renderSelectionButton(client, true)}
                  </div>

                  <div className="space-y-3 pr-10">
                    <div className="flex items-center gap-3">
                      <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display font-bold uppercase shadow-md ${genderColor}`}>
                        {initials}
                        <div className="absolute -bottom-1 -right-1 rounded-full border border-slate-100 bg-white p-0.5 shadow-xs">
                          {isFemale ? <Venus className="h-2.5 w-2.5 text-pink-500" /> : <Mars className="h-2.5 w-2.5 text-blue-500" />}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-[#353535]">{displayName}</h4>
                          {renderStatusBadge(client)}
                        </div>
                        <span className="mt-0.5 block text-[10px] font-mono text-slate-400">{safeText(client.phone) || '-'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-50 pt-3 text-[11px] text-slate-600">
                      {client.email && <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="truncate font-mono">{client.email}</span></div>}
                      <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" /> Membre depuis : {safeText(client.createdAt) || '-'}</div>
                      <div className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {activePkg ? (
                          <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Abonnement actif ({activePkg.sessionsRemaining} s. rest)</span>
                        ) : (
                          <span className="rounded-md border border-slate-150 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">Sans abonnement actif</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderClientActions(client, 'grid')}
                </article>
              );
            })}
          </div>

          {filteredClients.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-400">
              Aucun client ne correspond a vos filtres.
            </div>
          )}

          {filteredClients.length > gridLimit && (
            <div className="flex justify-center pt-2">
              <button type="button" onClick={() => setGridLimit(gridLimit + 12)} className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-xs font-bold text-slate-700 shadow-xs transition-premium hover:bg-slate-50 cursor-pointer">
                Voir plus de clients ({filteredClients.length - gridLimit} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="w-12 p-4">
                      <button type="button" onClick={toggleAllVisible} className="text-slate-400 transition hover:text-[#ff5757] cursor-pointer" aria-label="Selectionner les clients visibles">
                        {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-[#ff5757]" /> : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="p-4">Adherent</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Genre</th>
                    <th className="p-4">Telephone</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Cree le</th>
                    <th className="p-4">Abonnement</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedClients.length > 0 ? paginatedClients.map(client => {
                    const activePkg = clientPackages.find(cp => cp.clientId === client.id && cp.status === 'active' && cp.centerId === centerId);
                    return (
                      <tr key={client.id} className={`transition-colors hover:bg-slate-50/50 ${isSuspended(client) ? 'bg-amber-50/25' : ''}`}>
                        <td className="p-4">{renderSelectionButton(client, true)}</td>
                        <td className="p-4 font-bold text-[#353535]">{getClientDisplayName(client)}</td>
                        <td className="p-4">{renderStatusBadge(client)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${client.gender === 'F' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                            {client.gender === 'F' ? 'Femme' : 'Homme'}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{safeText(client.phone) || '-'}</td>
                        <td className="p-4 font-mono text-slate-500">{safeText(client.email) || '-'}</td>
                        <td className="p-4 text-slate-500">{safeText(client.createdAt) || '-'}</td>
                        <td className="p-4">
                          {activePkg ? (
                            <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600">Actif ({activePkg.sessionsRemaining} s. rest)</span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">Sans forfait</span>
                          )}
                        </td>
                        <td className="p-4 text-right">{renderClientActions(client, 'list')}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center italic text-slate-400">Aucun client ne correspond a vos filtres.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-150 bg-slate-50 p-3 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                {filteredClients.length === 0 ? 0 : (listPage - 1) * listPageSize + 1}-{Math.min(listPage * listPageSize, filteredClients.length)} sur {filteredClients.length} clients
              </span>
              <select value={listPageSize} onChange={(event) => setListPageSize(Number(event.target.value) as 20 | 50 | 100 | 200)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold focus:outline-none">
                {clientPageSizes.map(size => <option key={size} value={size}>{size} par page</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" disabled={listPage === 1} onClick={() => setListPage(listPage - 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer">Precedent</button>
              <span>Page {listPage} sur {totalPages}</span>
              <button type="button" disabled={listPage === totalPages} onClick={() => setListPage(listPage + 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer">Suivant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
