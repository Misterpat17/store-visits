// src/components/shared/BottomNav.js
import { useAuth } from '../../context/AuthContext';

const tabs = [
  {
    id: 'nuova-visita',
    label: 'Visita',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
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
    id: 'dashboard',
    label: 'Dashboard',
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
                transition-colors min-h-[56px]
                ${active ? 'text-primary-700' : 'text-slate-400 active:text-slate-600'}`}
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-semibold ${active ? 'text-primary-700' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-700 rounded-t"
                  style={{ width: `${100 / navTabs.length}%`, marginLeft: `${(navTabs.indexOf(tab) / navTabs.length) * 100}%` }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
