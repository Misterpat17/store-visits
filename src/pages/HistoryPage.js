// src/pages/HistoryPage.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';
import VisitDetailModal from '../components/visits/VisitDetailModal';
import ResumeVisitModal from '../components/visits/ResumeVisitModal';

const TABS = [
  { id: 'completate', label: '✅ Completate' },
  { id: 'in-corso', label: '⏳ In corso' },
  { id: 'cestino', label: '🗑 Cestino' },
];

export default function HistoryPage({ onVisitClosed }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('completate');
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [resumeVisit, setResumeVisit] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const fetchIdRef = useRef(0);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    const currentFetchId = ++fetchIdRef.current;

    const safetyTimer = setTimeout(() => {
      if (currentFetchId === fetchIdRef.current) setLoading(false);
    }, 8000);

    setLoading(true);
    try {
      let q = supabase
        .from('visits')
        .select('*, stores(nome, sede, area)')
        .order('start_time', { ascending: false });

      if (activeTab === 'cestino') q = q.not('deleted_at', 'is', null);
      else if (activeTab === 'completate') q = q.is('deleted_at', null).not('end_time', 'is', null);
      else q = q.is('deleted_at', null).is('end_time', null);

      if (!isAdmin) q = q.eq('user_id', user.id);
      else {
        if (filterUser) q = q.eq('user_id', filterUser);
        if (filterStore) q = q.eq('store_id', filterStore);
      }

      const { data: visitsData, error } = await q;
      if (currentFetchId !== fetchIdRef.current) return;
      if (error) throw error;

      if (isAdmin && visitsData?.length > 0) {
        const userIds = [...new Set(visitsData.map(v => v.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles').select('id, nome').in('id', userIds);
        if (currentFetchId !== fetchIdRef.current) return;
        const profilesMap = {};
        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });
        setVisits(visitsData.map(v => ({ ...v, profiles: profilesMap[v.user_id] || null })));
      } else {
        setVisits(visitsData || []);
      }
    } catch (err) {
      console.error('Errore caricamento visite:', err);
    } finally {
      clearTimeout(safetyTimer);
      if (currentFetchId === fetchIdRef.current) setLoading(false);
    }
  }, [user, isAdmin, filterUser, filterStore, activeTab]);

  useEffect(() => {
    if (!authLoading && user) fetchVisits();
  }, [authLoading, user, fetchVisits]);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    supabase.from('profiles').select('id, nome').then(({ data }) => setAllUsers(data || []));
    supabase.from('stores').select('id, nome').eq('attivo', true).then(({ data }) => setAllStores(data || []));
  }, [isAdmin, authLoading]);

  const softDelete = async (visitId) => {
    if (!window.confirm('Spostare questa visita nel cestino?')) return;
    await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', visitId);
    fetchVisits();
  };

  const restore = async (visitId) => {
    await supabase.from('visits').update({ deleted_at: null }).eq('id', visitId);
    fetchVisits();
  };

  const hardDelete = async (visitId) => {
    if (!window.confirm('Eliminare definitivamente? Operazione non reversibile.')) return;
    await supabase.from('visits').delete().eq('id', visitId);
    fetchVisits();
  };

  const handleVisitClosedFromModal = () => {
    setResumeVisit(null);
    fetchVisits();
    if (onVisitClosed) onVisitClosed();
  };

  const getDuration = (start, end) => {
    if (!start || !end) return null;
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short'
  });

  const emptyMessages = {
    completate: { title: 'Nessuna visita completata', sub: 'Le visite concluse appariranno qui.' },
    'in-corso': { title: 'Nessuna visita in corso', sub: 'Le visite non ancora concluse appariranno qui.' },
    cestino: { title: 'Il cestino è vuoto', sub: 'Le visite eliminate appariranno qui.' },
  };

  return (
    <div className="flex flex-col">
      <div className="flex bg-slate-50 border-b border-slate-100">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-3 px-1 text-xs font-semibold whitespace-nowrap transition-colors
              ${activeTab === t.id ? 'text-blue-700 border-b-2 border-blue-700 bg-white' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-2">
          <p className="section-title">Filtra visite</p>
          <div className="flex gap-2">
            <select className="input-field text-sm flex-1" value={filterUser}
              onChange={e => setFilterUser(e.target.value)}>
              <option value="">Tutti gli utenti</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select className="input-field text-sm flex-1" value={filterStore}
              onChange={e => setFilterStore(e.target.value)}>
              <option value="">Tutti gli store</option>
              {allStores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading && visits.length === 0 && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}

      {!loading && visits.length === 0 && (
        <div className="flex flex-col items-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-700 mb-1">{emptyMessages[activeTab]?.title}</p>
          <p className="text-sm text-slate-400">{emptyMessages[activeTab]?.sub}</p>
        </div>
      )}

      {visits.length > 0 && (
        <div className="divide-y divide-slate-100">
          {visits.map(v => (
            <div key={v.id} className="flex items-center px-4 py-3.5 gap-3 bg-white active:bg-slate-50">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                ${activeTab === 'cestino' ? 'bg-red-100' : activeTab === 'completate' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {activeTab === 'cestino' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/>
                  </svg>
                ) : activeTab === 'completate' ? (
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

              <div className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  if (activeTab === 'completate') setSelectedVisit(v);
                  else if (activeTab === 'in-corso') setResumeVisit(v);
                }}>
                <div className="flex items-baseline gap-2">
                  <p className="font-semibold text-slate-800 text-sm truncate">{v.stores?.nome}</p>
                  {v.stores?.area && <span className="text-xs text-slate-400 truncate">{v.stores.area}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500">{formatDate(v.start_time)}</span>
                  {getDuration(v.start_time, v.end_time) && (
                    <span className="badge-gray text-[10px]">{getDuration(v.start_time, v.end_time)}</span>
                  )}
                  {isAdmin && v.profiles?.nome && (
                    <span className="badge-blue text-[10px]">{v.profiles.nome}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {activeTab === 'completate' && (
                  <button onClick={() => softDelete(v.id)}
                    className="p-2 text-slate-400 active:text-red-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/>
                    </svg>
                  </button>
                )}
                {activeTab === 'in-corso' && (
                  <>
                    <button onClick={() => setResumeVisit(v)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold active:bg-amber-200">
                      Riprendi
                    </button>
                    <button onClick={() => softDelete(v.id)}
                      className="p-2 text-slate-400 active:text-red-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M9,6V4h6v2"/>
                      </svg>
                    </button>
                  </>
                )}
                {activeTab === 'cestino' && (
                  <>
                    <button onClick={() => restore(v.id)}
                      className="p-2 text-slate-400 active:text-emerald-600">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                      </svg>
                    </button>
                    {isAdmin && (
                      <button onClick={() => hardDelete(v.id)}
                        className="p-2 text-red-400 active:text-red-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
                          <path d="M10,11v6m4-6v6"/><path d="M9,6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVisit && (
        <VisitDetailModal visitId={selectedVisit.id} storeName={selectedVisit.stores?.nome}
          onClose={() => setSelectedVisit(null)} />
      )}
      {resumeVisit && (
        <ResumeVisitModal visit={resumeVisit} storeName={resumeVisit.stores?.nome}
          onClose={() => setResumeVisit(null)} onVisitClosed={handleVisitClosedFromModal} />
      )}
    </div>
  );
}
