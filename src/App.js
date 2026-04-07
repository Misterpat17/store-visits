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
  // Una key separata per ogni tab — così rimonta solo il tab che si apre
  const [keys, setKeys] = useState({
    home: 0,
    'nuova-visita': 0,
    storico: 0,
    'store-stats': 0,
    dashboard: 0,
    admin: 0,
  });
  const prevUserRef = useRef(null);

  useEffect(() => {
    if (user && !prevUserRef.current) {
      setActiveTab('home');
      setKeys(prev => ({ ...prev, home: prev.home + 1 }));
    }
    prevUserRef.current = user;
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Rimonta solo il tab di destinazione, non gli altri
    setKeys(prev => ({ ...prev, [tab]: prev[tab] + 1 }));
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

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <HomePage key={keys.home} onNavigate={handleTabChange} />;
      case 'nuova-visita': return <NewVisitPage key={keys['nuova-visita']} />;
      case 'storico': return <HistoryPage key={keys.storico} />;
      case 'store-stats': return <StoreStatsPage key={keys['store-stats']} />;
      case 'dashboard': return <DashboardPage key={keys.dashboard} />;
      case 'admin': return <AdminPage key={keys.admin} />;
      default: return <HomePage key={keys.home} onNavigate={handleTabChange} />;
    }
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
        {renderPage()}
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
