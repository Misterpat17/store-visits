// src/pages/StoreStatsPage.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';

const PERIOD_OPTIONS = [
  { label: '7 giorni', days: 7 },
  { label: '30 giorni', days: 30 },
  { label: 'Tutto', days: null },
];

export default function StoreStatsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [period, setPeriod] = useState(30);

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

      // Query visite con store
      let visitQuery = supabase
        .from('visits')
        .select('id, store_id, user_id, start_time, stores(nome, area)')
        .is('deleted_at', null)
        .not('end_time', 'is', null);

      if (!isAdmin) visitQuery = visitQuery.eq('user_id', user.id);
      if (since) visitQuery = visitQuery.gte('start_time', since);

      const { data: visits, error: visitErr } = await visitQuery;
      if (visitErr) throw visitErr;

      if (!visits || visits.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      // Recupera tutti i profili utente necessari
      const userIds = [...new Set(visits.map(v => v.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p.nome; });

      // Raggruppa per store
      const storeMap = {};
      visits.forEach(v => {
        const storeId = v.store_id;
        const storeName = v.stores?.nome || 'Sconosciuto';
        const storeArea = v.stores?.area || '';
        const userName = profileMap[v.user_id] || 'Sconosciuto';

        if (!storeMap[storeId]) {
          storeMap[storeId] = { storeId, storeName, storeArea, totalVisits: 0, users: {} };
        }
        storeMap[storeId].totalVisits++;
        storeMap[storeId].users[userName] = (storeMap[storeId].users[userName] || 0) + 1;
      });

      setStats(Object.values(storeMap).sort((a, b) => b.totalVisits - a.totalVisits));
    } catch (err) {
      console.error('Errore stats store:', err);
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, period]);

  useEffect(() => {
    if (!authLoading && user) fetchStats();
  }, [authLoading, user, fetchStats]);

  if (authLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex flex-col">
      {/* Filtro periodo */}
      <div className="p-4 bg-white border-b border-slate-100 flex gap-2 flex-wrap">
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
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : stats.length === 0 ? (
        <div className="flex flex-col items-center py-16 px-6 text-center">
          <p className="text-3xl mb-3">🏪</p>
          <p className="font-semibold text-slate-700">Nessuna visita nel periodo</p>
          <p className="text-sm text-slate-400 mt-1">Le statistiche appariranno dopo le prime visite.</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          <p className="section-title">{stats.length} store visitati · {stats.reduce((s, x) => s + x.totalVisits, 0)} visite totali</p>
          {stats.map(s => (
            <div key={s.storeId} className="card p-0 overflow-hidden">
              <button
                className="w-full flex items-center px-4 py-3.5 gap-3 active:bg-slate-50"
                onClick={() => setExpanded(expanded === s.storeId ? null : s.storeId)}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-blue-700 text-sm">{s.totalVisits}</span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-slate-800 text-sm truncate">{s.storeName}</p>
                  {s.storeArea && <p className="text-xs text-slate-400">{s.storeArea}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge-gray text-[10px]">
                    {Object.keys(s.users).length} {Object.keys(s.users).length === 1 ? 'utente' : 'utenti'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"
                    className={`transition-transform ${expanded === s.storeId ? 'rotate-180' : ''}`}>
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>
              </button>

              {expanded === s.storeId && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {Object.entries(s.users)
                    .sort(([, a], [, b]) => b - a)
                    .map(([uName, count]) => (
                      <div key={uName} className="flex items-center px-4 py-2.5 gap-3 bg-slate-50">
                        <div className="w-7 h-7 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700">
                            {uName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-slate-700 flex-1">{uName}</span>
                        <span className="font-semibold text-slate-600 text-sm">
                          {count} {count === 1 ? 'visita' : 'visite'}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
