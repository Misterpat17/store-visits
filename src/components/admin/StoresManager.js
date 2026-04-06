// src/components/admin/StoresManager.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Spinner from '../shared/Spinner';

export default function StoresManager() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | { id, nome, sede }
  const [form, setForm] = useState({ nome: '', sede: '' });
  const [saving, setSaving] = useState(false);

  const fetchStores = async () => {
    setLoading(true);
    const { data } = await supabase.from('stores').select('*').order('nome');
    setStores(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  const openNew = () => { setForm({ nome: '', sede: '' }); setEditing('new'); };
  const openEdit = (s) => { setForm({ nome: s.nome, sede: s.sede || '' }); setEditing(s); };
  const cancel = () => { setEditing(null); setForm({ nome: '', sede: '' }); };

  const save = async () => {
    if (!form.nome) return;
    setSaving(true);
    if (editing === 'new') {
      await supabase.from('stores').insert({ nome: form.nome, sede: form.sede, attivo: true });
    } else {
      await supabase.from('stores').update({ nome: form.nome, sede: form.sede }).eq('id', editing.id);
    }
    setSaving(false);
    cancel();
    fetchStores();
  };

  const toggleActive = async (s) => {
    await supabase.from('stores').update({ attivo: !s.attivo }).eq('id', s.id);
    fetchStores();
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {editing ? (
        <div className="card flex flex-col gap-3">
          <p className="font-semibold text-slate-800">
            {editing === 'new' ? 'Aggiungi store' : 'Modifica store'}
          </p>
          <input className="input-field" placeholder="Nome store *" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })} />
          <input className="input-field" placeholder="Sede / città (opzionale)" value={form.sede}
            onChange={e => setForm({ ...form, sede: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={cancel}>Annulla</button>
            <button className="btn-primary flex-1" onClick={save} disabled={saving || !form.nome}>
              {saving ? <Spinner size="sm" color="white" /> : null}
              Salva
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-primary w-full" onClick={openNew}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Aggiungi store
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {stores.map(s => (
            <div key={s.id} className={`card flex items-center gap-3 ${!s.attivo ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{s.nome}</p>
                {s.sede && <p className="text-xs text-slate-400">{s.sede}</p>}
              </div>
              <button onClick={() => openEdit(s)}
                className="text-slate-400 active:text-primary-600 p-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button onClick={() => toggleActive(s)}
                className={`badge ${s.attivo ? 'badge-green' : 'badge-gray'}`}>
                {s.attivo ? 'Attivo' : 'Disattivo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
