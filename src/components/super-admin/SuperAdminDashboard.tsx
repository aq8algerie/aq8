import { useState } from 'react';
import { AlertCircle, Award, Building, CheckCircle, Plus, Users } from 'lucide-react';
import { Center, Client, Payment } from '../../types';

type SuperAdminDashboardProps = {
  centers: Center[];
  clients: Client[];
  payments: Payment[];
  avgClientsPerCenter: string;
  aq8ClientsCount: number;
  wonderClientsCount: number;
  onAddCenter: () => void;
  onAddManager: () => void;
  onAddService: () => void;
};

export function SuperAdminDashboard({
  centers,
  clients,
  payments,
  avgClientsPerCenter,
  aq8ClientsCount,
  wonderClientsCount,
  onAddCenter,
  onAddManager,
  onAddService
}: SuperAdminDashboardProps) {
  const [hoveredRevenuePoint, setHoveredRevenuePoint] = useState<number | null>(null);
  const [dashboardChartTab, setDashboardChartTab] = useState<'revenue' | 'clients'>('revenue');

  const getRevenueTrendData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const validDates = payments
      .map(payment => new Date(payment.date))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const latestDate = validDates.at(-1) || new Date();
    const startMonth = new Date(latestDate.getFullYear(), latestDate.getMonth() - 5, 1);

    return Array.from({ length: 6 }, (_, index) => {
      const currentMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
      const mPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate.getFullYear() === currentMonth.getFullYear() && paymentDate.getMonth() === currentMonth.getMonth();
      });
      const total = mPayments.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: `${months[currentMonth.getMonth()]} ${String(currentMonth.getFullYear()).slice(-2)}`,
        value: total
      };
    });
  };

  const centerClientCounts = centers.map(c => clients.filter(cli => cli.centerId === c.id).length);
  const maxCenterClients = Math.max(...centerClientCounts, 1);

  return (        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-blue-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Centres Actifs</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{centers.length}</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg"><Building className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>+1</span>
                <span className="text-slate-400 font-medium">ce mois-ci</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-emerald-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne d'Adhérents</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{avgClientsPerCenter}</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg"><Users className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 8.2%</span>
                <span className="text-slate-400 font-medium">vs mai</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-rose-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adhérents AQ8 (EMS)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{aq8ClientsCount}</span>
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-[#ff5757] rounded-lg"><Award className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 15.3%</span>
                <span className="text-slate-400 font-medium">ce mois</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-xs space-y-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adhérents Wonder</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold font-display text-slate-800">{wonderClientsCount}</span>
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg"><CheckCircle className="h-4 w-4" /></div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-2">
                <span>↑ 12.0%</span>
                <span className="text-slate-400 font-medium">ce mois</span>
              </div>
            </div>
          </div>

          {/* Quick lists and chart */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Tabbed Premium SVG Chart representing center contribution or revenue trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold font-display text-slate-800 text-sm">
                    {dashboardChartTab === 'revenue' ? "Tendance du Chiffre d'Affaires Global" : "Nombre d'Adhérents par Centre"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {dashboardChartTab === 'revenue' ? "Revenus consolidés sur l'ensemble du réseau (DZD)" : "Total d'adhérents inscrits par établissement"}
                  </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 text-[11px] font-bold text-slate-600">
                  <button
                    onClick={() => setDashboardChartTab('revenue')}
                    className={`px-3 py-1 rounded-lg transition ${dashboardChartTab === 'revenue' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    Chiffre d'Affaires
                  </button>
                  <button
                    onClick={() => setDashboardChartTab('clients')}
                    className={`px-3 py-1 rounded-lg transition ${dashboardChartTab === 'clients' ? 'bg-white text-slate-800 shadow-xs' : 'hover:text-slate-900'}`}
                  >
                    Adhérents / Centre
                  </button>
                </div>
              </div>

              {dashboardChartTab === 'revenue' ? (
                /* LINE CHART SVG */
                <div className="h-60 pt-6 relative">
                  {(() => {
                    const trendData = getRevenueTrendData();
                    const maxVal = Math.max(...trendData.map(d => d.value), 20000);
                    const width = 500;
                    const height = 150;
                    const paddingLeft = 60;
                    const paddingRight = 40;
                    const chartWidth = width - paddingLeft - paddingRight;
                    const stepX = chartWidth / (trendData.length - 1);

                    // Compute points
                    const points = trendData.map((d, idx) => {
                      const x = paddingLeft + idx * stepX;
                      const y = height - 20 - (d.value / maxVal) * (height - 40);
                      return { x, y, ...d };
                    });

                    // Build path using smooth cubic Bézier curves
                    let linePath = `M ${points[0].x} ${points[0].y} `;
                    let areaPath = `M ${points[0].x} ${height - 20} L ${points[0].x} ${points[0].y} `;
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i];
                      const p1 = points[i + 1];
                      const cp1x = p0.x + (p1.x - p0.x) / 3;
                      const cp1y = p0.y;
                      const cp2x = p1.x - (p1.x - p0.x) / 3;
                      const cp2y = p1.y;
                      linePath += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} `;
                      areaPath += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y} `;
                    }
                    areaPath += `L ${points[points.length - 1].x} ${height - 20} Z`;

                    return (
                      <div className="w-full h-full flex flex-col justify-between">
                        <div className="relative flex-1">
                          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff5757" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#ff5757" stopOpacity="0.0" />
                              </linearGradient>
                              {/* Glowing effect filter */}
                              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Horizontal grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                              const y = height - 20 - pct * (height - 40);
                              const labelVal = Math.round(pct * maxVal);
                              return (
                                <g key={i} className="opacity-40">
                                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" strokeWidth="1" />
                                  <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[9px] font-semibold fill-slate-400 font-mono">
                                    {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Gradient Area under curve */}
                            <path d={areaPath} fill="url(#areaGrad)" />

                            {/* Line path with Glow filter */}
                            <path d={linePath} fill="none" stroke="#ff5757" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

                            {/* Interactive dots and hover hitboxes */}
                            {points.map((p, i) => (
                              <g key={i} className="group/dot cursor-pointer">
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={hoveredRevenuePoint === i ? "6" : "4"}
                                  fill={hoveredRevenuePoint === i ? "#ff5757" : "white"}
                                  stroke="#ff5757"
                                  strokeWidth="2"
                                  style={{ transition: "all 0.15s ease" }}
                                />
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="16"
                                  fill="transparent"
                                  onMouseEnter={() => setHoveredRevenuePoint(i)}
                                  onMouseLeave={() => setHoveredRevenuePoint(null)}
                                />
                              </g>
                            ))}
                          </svg>

                          {/* Interactive Tooltip popup */}
                          {hoveredRevenuePoint !== null && (
                            <div
                              className="absolute chart-tooltip text-white p-2 rounded-xl shadow-lg border border-slate-700/50 pointer-events-none z-30 font-mono text-[10px]"
                              style={{
                                left: `${(points[hoveredRevenuePoint].x / width) * 100}%`,
                                top: `${(points[hoveredRevenuePoint].y / height) * 100 - 35}%`,
                                transform: "translateX(-50%)"
                              }}
                            >
                              <span className="text-[8px] text-slate-400 font-sans block uppercase font-bold">{trendData[hoveredRevenuePoint].label}</span>
                              <span className="text-xs font-bold text-[#ff5757]">{trendData[hoveredRevenuePoint].value.toLocaleString()} DZD</span>
                            </div>
                          )}
                        </div>

                        {/* X-axis Labels */}
                        <div className="flex justify-between pl-[60px] pr-[40px] text-[10px] font-bold text-slate-400 font-sans pt-1">
                          {trendData.map(d => (
                            <span key={d.label}>{d.label}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Custom SVG Bar Chart (Existing count of clients per center) */
                <div className="h-60 flex items-end justify-between gap-4 pt-6 px-4">
                  {centers.map((c) => {
                    const count = clients.filter(cli => cli.centerId === c.id).length;
                    const pct = (count / maxCenterClients) * 85; // Max 85% height
                    return (
                      <div key={c.id} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-40">
                          <div
                            style={{ height: `${pct || 4}%` }}
                            className="w-full bg-gradient-to-t from-[#353535] to-[#ff5757] rounded-t-lg transition-all duration-500 group-hover:to-rose-400"
                          ></div>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono z-10 font-bold">
                            {count} Adhérent{count > 1 ? 's' : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Quick Action Board & summary info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold font-display text-slate-800 text-sm">Raccourcis Administrateur</h3>
                <p className="text-xs text-slate-500">Gérez l'infrastructure globale AQ8 Algérie d'un simple clic.</p>

                <div className="space-y-2">
                  <button
                    onClick={() => onAddCenter()}
                    className="w-full py-2.5 px-3 bg-[#353535] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un nouveau centre
                  </button>
                  <button
                    onClick={() => onAddManager()}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Créer un compte manager
                  </button>
                  <button
                    onClick={() => onAddService()}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-premium flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter une prestation
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  En tant que <strong>Super Admin</strong>, vos modifications sur les tarifs, centres et services s'appliquent immédiatement sur le site public et sur le planning des managers de chaque centre.
                </p>
              </div>
            </div>
          </div>
        </div>
  );
}
