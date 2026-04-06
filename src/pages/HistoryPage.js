// src/pages/HistoryPage.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';
import VisitDetailModal from '../components/visits/VisitDetailModal';

export default function HistoryPage() {
  const { user, isAdmin } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [allStores, setAllStores] = useState([]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('visits')
      .select(`
        *,
        stores(nome, sede),
        profiles(nome)
      `)
      .order('start_time', { ascending: false });

    if (!isAdmin) {
      q = q.eq('user_id', user.id);
    } else {
      if (filterUser) q = q.eq('user_id', filterUser);
      if (filterStore) q = q.eq('store_id', filterStore);
    }

    const { data, error } = await q;
    if (!error) setVisits(data || []);
    setLoading(false);
  }, [user, isAdmin, filterUser, filterStore]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  // Carica utenti e store per i filtri admin
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('profiles').select('id, nome').then(({ data }) => setAllUsers(data || []));
    supabase.from('stores').select('id, nome').eq('attivo', true).then(({ data }) => setAllStores(data || []));
  }, [isAdmin]);

  const getDuration = (start, end) => {
    if (!start || !end) return null;
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col">
      {/* Filtri (solo admin) */}
      {isAdmin && (
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-2">
          <p className="section-title">Filtra visite</p>
          <div className="flex gap-2">
            <select
              className="input-field text-sm flex-1"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            >
              <option value="">Tutti gli utenti</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select
              className="input-field text-sm flex-1"
              value={filterStore}
              onChange={e => setFilterStore(e.target.value)}
            >
              <option value="">Tutti gli store</option>
              {allStores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Lista visite */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-700 mb-1">Nessuna visita trovata</p>
          <p className="text-sm text-slate-400">Le visite completate appariranno qui.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visits.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedVisit(v)}
              className="w-full flex items-center px-4 py-3.5 gap-3 bg-white active:bg-slate-50 text-left transition-colors"
            >
              {/* Icona stato */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                ${v.end_time ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {v.end_time ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>

              {/* Contenuto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {v.stores?.nome}
                  </p>
                  {v.stores?.sede && (
                    <span className="text-xs text-slate-400 truncate">{v.stores.sede}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{formatDate(v.start_time)}</span>
                  {getDuration(v.start_time, v.end_time) && (
                    <span className="badge-gray text-[10px]">{getDuration(v.start_time, v.end_time)}</span>
                  )}
                  {isAdmin && v.profiles?.nome && (
                    <span className="badge-blue text-[10px]">{v.profiles.nome}</span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Modal dettaglio */}
      {selectedVisit && (
        <VisitDetailModal
          visitId={selectedVisit.id}
          storeName={selectedVisit.stores?.nome}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}
