import { useState } from 'react';
import { Venus } from 'lucide-react';
import { motion } from 'motion/react';
import { Appointment, Center, Client, Payment } from '../../types';

type StatsPanelProps = {
  centers: Center[];
  clients: Client[];
  appointments: Appointment[];
  payments: Payment[];
  aq8ClientsCount: number;
  wonderClientsCount: number;
};

export function StatsPanel({
  centers,
  clients,
  appointments,
  payments,
  aq8ClientsCount,
  wonderClientsCount
}: StatsPanelProps) {
  const [occupancyCenterId, setOccupancyCenterId] = useState<string>(centers[0]?.id || 'center-1');

  return (        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Donut Chart: Adhérents par technologie */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Répartition des Adhérents par Technologie</h4>

              <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-4">
                {(() => {
                  const totalTechs = aq8ClientsCount + wonderClientsCount || 1;
                  const aq8Percent = Math.round((aq8ClientsCount / totalTechs) * 100);
                  const wonderPercent = 100 - aq8Percent;
                  return (
                    <>
                      <motion.div
                        className="relative w-36 h-36"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                      >
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <motion.circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="#ff5757"
                            strokeWidth="3.5"
                            strokeDasharray={`${aq8Percent} ${wonderPercent}`}
                            initial={{ strokeDashoffset: 125 }}
                            animate={{ strokeDashoffset: 25 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                          <motion.circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke="#353535"
                            strokeWidth="3.5"
                            strokeDasharray={`${wonderPercent} ${aq8Percent}`}
                            initial={{ strokeDashoffset: 125 + aq8Percent }}
                            animate={{ strokeDashoffset: 25 + aq8Percent }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold font-display text-slate-800">{clients.length}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Membres</span>
                        </div>
                      </motion.div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="w-3 h-3 bg-[#ff5757] rounded-sm shrink-0"></div>
                          <div>
                            <span className="text-slate-600 font-medium block">AQ8 Électrostimulation (EMS)</span>
                            <span className="font-bold font-mono text-slate-800 text-xs">{aq8ClientsCount} membres ({aq8Percent}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="w-3 h-3 bg-[#353535] rounded-sm shrink-0"></div>
                          <div>
                            <span className="text-slate-600 font-medium block">Wonder Muscle Sculpt</span>
                            <span className="font-bold font-mono text-slate-800 text-xs">{wonderClientsCount} membres ({wonderPercent}%)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Radial Gauges: Taux de Remplissage des Créneaux Hommes vs Femmes */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Remplissage des Créneaux</h4>

                {/* Center Selector Dropdown */}
                <select
                  value={occupancyCenterId}
                  onChange={(e) => setOccupancyCenterId(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 text-[#353535] rounded-xl text-[11px] font-bold px-3 py-1.5 focus:outline-none border border-slate-200"
                >
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const centerCapacities: Record<string, { men: number; women: number }> = {
                  'center-1': { men: 40, women: 56 },
                  'center-2': { men: 0, women: 80 },
                  'center-3': { men: 0, women: 60 },
                  'center-4': { men: 50, women: 50 },
                  'center-5': { men: 48, women: 48 }
                };

                const getCenterOccupancy = (cId: string) => {
                  const centerApts = appointments.filter(a => a.centerId === cId && a.status !== 'cancelled');
                  const caps = centerCapacities[cId] || { men: 40, women: 40 };

                  const menBookings = centerApts.filter(a => {
                    const cl = clients.find(c => c.id === a.clientId);
                    return cl && cl.gender === 'H';
                  }).length;

                  const womenBookings = centerApts.filter(a => {
                    const cl = clients.find(c => c.id === a.clientId);
                    return cl && (cl.gender === 'F' || !cl.gender);
                  }).length;

                  const menRate = caps.men > 0 ? Math.min(100, Math.round((menBookings / caps.men) * 100)) : 0;
                  const womenRate = caps.women > 0 ? Math.min(100, Math.round((womenBookings / caps.women) * 100)) : 0;

                  return { menBookings, menCapacity: caps.men, menRate, womenBookings, womenCapacity: caps.women, womenRate };
                };

                const occ = getCenterOccupancy(occupancyCenterId);
                const radius = 22;
                const circ = 2 * Math.PI * radius; // ~138.2

                return (
                  <div className="grid grid-cols-2 gap-4 py-2">
                    {/* Women Gauge */}
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-50/20 border border-rose-100/30 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Créneaux Femmes</span>
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                          <circle cx="25" cy="25" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
                          <motion.circle
                            cx="25"
                            cy="25"
                            r={radius}
                            fill="none"
                            stroke="#ff5757"
                            strokeWidth="3.5"
                            strokeDasharray={circ}
                            initial={{ strokeDashoffset: circ }}
                            animate={{ strokeDashoffset: circ - (occ.womenRate / 100) * circ }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                          <span className="text-sm font-bold text-slate-800">{occ.womenRate}%</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {occ.womenBookings} / {occ.womenCapacity} RDVs actifs
                      </div>
                    </div>

                    {/* Men Gauge */}
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-blue-50/20 border border-blue-100/30 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Créneaux Hommes</span>
                      {occ.menCapacity > 0 ? (
                        <>
                          <div className="relative w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                              <circle cx="25" cy="25" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
                              <motion.circle
                                cx="25"
                                cy="25"
                                r={radius}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3.5"
                                strokeDasharray={circ}
                                initial={{ strokeDashoffset: circ }}
                                animate={{ strokeDashoffset: circ - (occ.menRate / 100) * circ }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                              <span className="text-sm font-bold text-slate-800">{occ.menRate}%</span>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {occ.menBookings} / {occ.menCapacity} RDVs actifs
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400 text-[10px] italic">
                          <Venus className="h-8 w-8 text-rose-400 opacity-60 mb-2" />
                          <span>Centre réservé aux femmes uniquement</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bar Chart: Chiffre d'Affaires par Centre */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <h4 className="font-bold font-display text-slate-800 text-xs uppercase tracking-wider">Chiffre d'Affaires Consolidé par Centre</h4>

            {(() => {
              const getCenterRevenues = () => {
                return centers.map(c => {
                  const cPayments = payments.filter(p => p.centerId === c.id);
                  const total = cPayments.reduce((sum, p) => sum + p.amount, 0);
                  return { name: c.name, revenue: total };
                });
              };

              const data = getCenterRevenues();
              const maxRev = Math.max(...data.map(d => d.revenue), 10000);

              return (
                <div className="space-y-4 pt-2">
                  {data.map(d => {
                    const widthPct = (d.revenue / maxRev) * 100;
                    return (
                      <div key={d.name} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#353535]">{d.name}</span>
                          <span className="font-mono text-[#ff5757]">{d.revenue.toLocaleString()} DZD</span>
                        </div>
                        <div className="h-4 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${d.revenue > 0 ? widthPct : 2}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-slate-700 to-[#ff5757] rounded-lg"
                          ></motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
  );
}