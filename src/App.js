// src/App.js
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import NewVisitPage from './pages/NewVisitPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import StoreStatsPage from './pages/StoreStatsPage';
import BottomNav from './components/shared/BottomNav';
import Spinner from './components/shared/Spinner';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  // tabKey usato SOLO per NewVisitPage che deve sempre rimontarsi
  const [visitKey, setVisitKey] = useState(0);
  const prevUserRef = useRef(null);

  // Reset alla home solo quando l'utente fa login (da null a utente)
  useEffect(() => {
    if (user && !prevUserRef.current) {
      setActiveTab('home');
    }
    prevUserRef.current = user;
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Rimonta solo NewVisitPage quando ci si torna
    if (tab === 'nuova-visita') {
      setVisitKey(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const tabLabels = {
    'home': 'Home',
    'nuova-visita': 'Nuova Visita',
    'storico': 'Storico',
    'store-stats': 'Store',
    'dashboard': 'Dashboard',
    'admin': 'Amministrazione',
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-lg mx-auto relative">
      <header
        className="bg-blue-800 text-white px-4 pb-3 sticky top-0 z-30"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <span className="font-semibold text-sm">Bruno Store Check</span>
          </div>
          <span className="text-white/70 text-xs">{tabLabels[activeTab]}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Tutti i tab sono montati e nascosti con CSS — nessun rimount al cambio tab */}
        <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
          <HomePage onNavigate={handleTabChange} />
        </div>
        <div style={{ display: activeTab === 'nuova-visita' ? 'block' : 'none' }}>
          <NewVisitPage key={visitKey} />
        </div>
        <div style={{ display: activeTab === 'storico' ? 'block' : 'none' }}>
          <HistoryPage />
        </div>
        <div style={{ display: activeTab === 'store-stats' ? 'block' : 'none' }}>
          <StoreStatsPage />
        </div>
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <DashboardPage />
        </div>
        <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
          <AdminPage />
        </div>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
