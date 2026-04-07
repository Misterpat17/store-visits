// src/components/admin/UsersManager.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Spinner from '../shared/Spinner';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', password: '', ruolo: 'user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('nome');
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    if (!form.nome || !form.email || !form.password) { setError('Compila tutti i campi'); return; }
    if (form.password.length < 6) { setError('Password min. 6 caratteri'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      // Recupera il token di sessione corrente
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session) throw new Error('Sessione non trovata, rieffettua il login');
      
      const token = sessionData.session.access_token;
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Errore nella creazione');
      
      setSuccess(`Account creato per ${form.nome}`);
      setForm({ nome: '', email: '', password: '', ruolo: 'user' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (u) => {
    await supabase.from('profiles').update({ ruolo: u.ruolo === 'admin' ? 'user' : 'admin' }).eq('id', u.id);
    fetchUsers();
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
          ✓ {success}
        </div>
      )}

      <button className="btn-primary w-full" onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {showForm ? 'Annulla' : 'Nuovo utente'}
      </button>

      {showForm && (
        <div className="card flex flex-col gap-3">
          <p className="font-semibold text-slate-800">Crea nuovo account</p>
          <input className="input-field" placeholder="Nome completo *" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })} />
          <input className="input-field" type="email" placeholder="Email *" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="input-field" type="password" placeholder="Password * (min. 6 caratteri)"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <select className="input-field" value={form.ruolo}
            onChange={e => setForm({ ...form, ruolo: e.target.value })}>
            <option value="user">Utente standard</option>
            <option value="admin">Amministratore</option>
          </select>
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <button className="btn-primary" onClick={createUser} disabled={saving}>
            {saving ? <Spinner size="sm" color="white" /> : null}
            {saving ? 'Creazione...' : 'Crea account'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="section-title">{users.length} utenti registrati</p>
          {users.map(u => (
            <div key={u.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center
                text-blue-700 font-bold text-sm flex-shrink-0">
                {u.nome?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{u.nome}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <button onClick={() => toggleRole(u)}
                className={`badge shrink-0 ${u.ruolo === 'admin' ? 'badge-blue' : 'badge-gray'}`}
                title="Clicca per cambiare ruolo">
                {u.ruolo === 'admin' ? '🛡 Admin' : '👤 User'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
