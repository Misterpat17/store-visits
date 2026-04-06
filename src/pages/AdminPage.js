// src/pages/AdminPage.js
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UsersManager from '../components/admin/UsersManager';
import StoresManager from '../components/admin/StoresManager';
import ActivitiesManager from '../components/admin/ActivitiesManager';

const SECTIONS = [
  { id: 'users', label: 'Utenti', icon: '👥' },
  { id: 'stores', label: 'Store', icon: '🏪' },
  { id: 'activities', label: 'Attività', icon: '☑️' },
];

export default function AdminPage() {
  const { isAdmin, profile, logout } = useAuth();
  const [section, setSection] = useState('users');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <span className="text-5xl mb-4">🔒</span>
        <p className="font-bold text-slate-700 text-lg">Accesso negato</p>
        <p className="text-slate-400 text-sm mt-1">Questa sezione è riservata agli amministratori.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Info utente + logout */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-800">{profile?.nome}</p>
          <span className="badge-blue text-[10px]">Amministratore</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 font-medium active:text-red-700 flex items-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Esci
        </button>
      </div>

      {/* Tab sezioni */}
      <div className="flex bg-slate-50 border-b border-slate-100">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors
              ${section === s.id
                ? 'text-primary-700 border-b-2 border-primary-700 bg-white'
                : 'text-slate-500'}`}
          >
            <span className="text-lg">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Contenuto sezione */}
      <div>
        {section === 'users' && <UsersManager />}
        {section === 'stores' && <StoresManager />}
        {section === 'activities' && <ActivitiesManager />}
      </div>
    </div>
  );
}
