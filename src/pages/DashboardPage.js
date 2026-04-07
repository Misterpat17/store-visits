// src/pages/DashboardPage.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const PERIOD_OPTIONS = [
  { label: '7 giorni', days: 7 },
  { label: '30 giorni', days: 30 },
  { label: 'Tutto', days: null },
];

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState(30);
  const [filterUser, setFilterUser] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    supabase.from('profiles').select('id, nome').then(({ data }) => setAllUsers(data || []));
  }, [isAdmin, authLoading]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let since = null;
      if (period) {
        since = new Date();
        since.setDate(since.getDate() - period);
        since = since.toISOString();
      }

      // Query visite con store (senza join profiles)
      let visitQuery = supabase
        .from('visits')
        .select('id, store_id, start_time, end_time, stores(nome)')
        .is('deleted_at', null)
        .not('end_time', 'is', null);

      if (!isAdmin) visitQuery = visitQuery.eq('user_id', user.id);
      else if (filterUser) visitQuery = visitQuery.eq('user_id', filterUser);
      if (since) visitQuery = visitQuery.gte('start_time', since);

      const { data: visits, error: visitErr } = await visitQuery;
      if (visitErr) throw visitErr;

      // Calcola stats per store
      const storeMap = {};
      (visits || []).forEach(v => {
        const name = v.stores?.nome || 'Sconosciuto';
        storeMap[name] = (storeMap[name] || 0) + 1;
      });

      const storeData = Object.entries(storeMap)
        .map(([name, visite]) => ({ name, visite }))
        .sort((a, b) => b.visite - a.visite)
        .slice(0, 10);

      // Query attività (senza join profiles)
      let actQuery = supabase
        .from('visit_activities')
        .select('completed, visit_id');

      if (!isAdmin || filterUser) {
        // Filtra per le visite dell'utente
        const visitIds = (visits || []).map(v => v.id);
        if (visitIds.length === 0) {
          setStats({ totalVisits: 0, storeData: [], totalActs: 0, completedActs: 0, completionRate: 0 });
          setLoading(false);
          return;
        }
        actQuery = actQuery.in('visit_id', visitIds);
      } else if (since) {
        // Per admin senza filtro utente, filtra per data tramite subquery
        const visitIds = (visits || []).map(v => v.id);
        if (visitIds.length > 0) {
          actQuery = actQuery.in('visit_id', visitIds);
        }
      }

      const { data: acts } = await actQuery;

      const totalActs = acts?.length || 0;
      const completedActs = acts?.filter(a => a.completed).length || 0;

      setStats({
        totalVisits: visits?.length || 0,
        storeData,
        totalActs,
        completedActs,
        completionRate: totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0,
      });
    } catch (err) {
      console.error('Errore dashboard:', err);
      setStats({ totalVisits: 0, storeData: [], totalActs: 0, completedActs: 0, completionRate: 0 });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, period, filterUser]);

  useEffect(() => {
    if (!authLoading && user) fetchStats();
  }, [authLoading, user, fetchStats]);

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Filtri */}
      <div className="flex gap-2 items-center flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => setPeriod(opt.days)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors
              ${period === opt.days
                ? 'bg-blue-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            {opt.label}
          </button>
        ))}
        {isAdmin && (
          <select
            className="input-field text-sm py-1.5 ml-auto"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
          >
            <option value="">Tutti gli utenti</option>
            {allUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <KPICard label="Visite totali" value={stats.totalVisits} icon="🏪" color="blue" />
            <KPICard
              label="Completamento"
              value={`${stats.completionRate}%`}
              icon="✅"
              color={stats.completionRate >= 80 ? 'green' : stats.completionRate >= 50 ? 'amber' : 'red'}
            />
            <KPICard label="Attività OK" value={stats.completedActs} icon="☑️" color="green" />
            <KPICard label="Non completate" value={stats.totalActs - stats.completedActs} icon="⬜" color="gray" />
          </div>

          {/* Grafico */}
          {stats.storeData.length > 0 ? (
            <div className="card">
              <p className="section-title">Visite per store</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.storeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    formatter={(v) => [v, 'Visite']}
                  />
                  <Bar dataKey="visite" radius={[6, 6, 0, 0]}>
                    {stats.storeData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#1d4ed8' : '#93c5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="card flex flex-col items-center py-8 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="font-semibold text-slate-700">Nessun dato disponibile</p>
              <p className="text-sm text-slate-400 mt-1">Inizia a registrare visite per vedere i dati.</p>
            </div>
          )}

          {/* Barra completamento */}
          {stats.totalActs > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <p className="section-title mb-0">Completamento attività</p>
                <span className="font-bold text-blue-700">{stats.completionRate}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                <span>{stats.completedActs} completate</span>
                <span>{stats.totalActs - stats.completedActs} non completate</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color] || colors.gray}`}>
      <span className="text-2xl">{icon}</span>
      <p className="font-bold text-2xl mt-1">{value}</p>
      <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
    </div>
  );
}
