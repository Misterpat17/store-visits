// src/pages/HomePage.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';

export default function HomePage({ setActiveTab }) {
  const { user, profile, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function loadData() {
      setLoading(true);
      try {
        // Statistiche rapide
        const { data: visits } = await supabase
          .from('visits')
          .select('id, store_id, end_time, stores(nome)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('start_time', { ascending: false });

        const totalVisite = visits?.length || 0;
        const storeVisitati = new Set(visits?.map(v => v.store_id)).size;
        const visteCompletate = visits?.filter(v => v.end_time).length || 0;

        setStats({ totalVisite, storeVisitati, visteCompletate });
        setRecentVisits((visits || []).slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getOra = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: 'short'
  });

  const actions = [
    {
      id: 'nuova-visita',
      label: 'Nuova visita',
      desc: 'Avvia una visita in store',
      color: 'bg-blue-700',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10,8 16,12 10,16"/>
        </svg>
      ),
    },
    {
      id: 'storico',
      label: 'Storico visite',
      desc: 'Consulta le visite passate',
      color: 'bg-slate-700',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      desc: 'Statistiche e performance',
      color: 'bg-emerald-700',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <rect x="2" y="3" width="6" height="8" rx="1"/>
          <rect x="10" y="3" width="12" height="5" rx="1"/>
          <rect x="10" y="12" width="12" height="9" rx="1"/>
          <rect x="2" y="15" width="6" height="6" rx="1"/>
        </svg>
      ),
    },
    ...(isAdmin ? [{
      id: 'admin',
      label: 'Amministrazione',
      desc: 'Gestisci utenti, store e attività',
      color: 'bg-amber-600',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    }] : []),
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Benvenuto */}
      <div className="bg-blue-800 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm font-medium">{getOra()},</p>
        <p className="text-2xl font-bold mt-0.5">{profile?.nome || '—'}</p>
        <span className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
          ${isAdmin ? 'bg-amber-400 text-amber-900' : 'bg-blue-600 text-white'}`}>
          {isAdmin ? '🛡 Amministratore' : '👤 Utente'}
        </span>
      </div>

      {/* Statistiche rapide */}
      {loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Visite totali" value={stats?.totalVisite} icon="📋" />
          <StatCard label="Store visitati" value={stats?.storeVisitati} icon="🏪" />
          <StatCard label="Completate" value={stats?.visteCompletate} icon="✅" />
        </div>
      )}

      {/* Azioni principali */}
      <div>
        <p className="section-title">Cosa vuoi fare?</p>
        <div className="grid grid-cols-2 gap-3">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => setActiveTab(action.id)}
              className={`${action.color} rounded-2xl p-4 text-left text-white
                active:opacity-80 transition-opacity flex flex-col gap-3`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                {action.icon}
              </div>
              <div>
                <p className="font-bold text-sm">{action.label}</p>
                <p className="text-xs opacity-75 mt-0.5">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ultime visite */}
      {recentVisits.length > 0 && (
        <div>
          <p className="section-title">Ultime visite</p>
          <div className="flex flex-col gap-2">
            {recentVisits.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveTab('storico')}
                className="card flex items-center gap-3 text-left active:bg-slate-50"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${v.end_time ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {v.end_time ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{v.stores?.nome}</p>
                  <p className="text-xs text-slate-400">{formatDate(v.start_time)}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="card text-center py-3">
      <span className="text-2xl">{icon}</span>
      <p className="font-bold text-xl text-slate-800 mt-1">{value ?? '—'}</p>
      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}
