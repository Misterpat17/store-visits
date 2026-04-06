// src/App.js
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import NewVisitPage from './pages/NewVisitPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import BottomNav from './components/shared/BottomNav';
import Spinner from './components/shared/Spinner';
import './index.css';

// Registra service worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => console.log('SW registrato'))
      .catch((err) => console.log('SW errore:', err));
  });
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('nuova-visita');
  // Chiave che cambia ad ogni cambio tab, forza il remount del componente
  const [tabKey, setTabKey] = useState(0);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setTabKey(prev => prev + 1); // forza remount e ricarica dati
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activeTab) {
      case 'nuova-visita': return <NewVisitPage key={tabKey} />;
      case 'storico': return <HistoryPage key={tabKey} />;
      case 'dashboard': return <DashboardPage key={tabKey} />;
      case 'admin': return <AdminPage key={tabKey} />;
      default: return <NewVisitPage key={tabKey} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
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
            <span className="font-semibold text-sm">Store Visit Manager</span>
          </div>
          <span className="text-white/70 text-xs">
            {{ 'nuova-visita': 'Nuova Visita', 'storico': 'Storico', 'dashboard': 'Dashboard', 'admin': 'Amministrazione' }[activeTab]}
          </span>
        </div>
      </header>

      {/* Contenuto pagina */}
      <main className="flex-1 overflow-y-auto pb-24">
        {renderPage()}
      </main>

      {/* Bottom navigation */}
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
