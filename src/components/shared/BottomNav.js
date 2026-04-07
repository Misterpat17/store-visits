// src/components/shared/BottomNav.js
import { useAuth } from '../../context/AuthContext';

const tabs = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    id: 'nuova-visita',
    label: 'Visita',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10,8 16,12 10,16"/>
      </svg>
    ),
  },
  {
    id: 'storico',
    label: 'Storico',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  },
  {
    id: 'store-stats',
    label: 'Store',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Stats',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <rect x="2" y="3" width="6" height="8" rx="1"/>
        <rect x="10" y="3" width="12" height="5" rx="1"/>
        <rect x="10" y="12" width="12" height="9" rx="1"/>
        <rect x="2" y="15" width="6" height="6" rx="1"/>
      </svg>
    ),
  },
];

const adminTab = {
  id: 'admin',
  label: 'Admin',
  icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

export default function BottomNav({ activeTab, setActiveTab }) {
  const { isAdmin } = useAuth();
  const navTabs = isAdmin ? [...tabs, adminTab] : tabs;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg
      bg-white border-t border-slate-100 shadow-lg z-40 bottom-nav">
      <div className="flex items-stretch">
        {navTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1
                transition-colors min-h-[56px] relative
                ${active ? 'text-blue-700' : 'text-slate-400 active:text-slate-600'}`}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-semibold ${active ? 'text-blue-700' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-t" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
