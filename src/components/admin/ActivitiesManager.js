// src/components/admin/ActivitiesManager.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Spinner from '../shared/Spinner';

export default function ActivitiesManager() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titolo: '', descrizione: '' });
  const [saving, setSaving] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    const { data } = await supabase.from('activities').select('*').order('titolo');
    setActivities(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, []);

  const openNew = () => { setForm({ titolo: '', descrizione: '' }); setEditing('new'); };
  const openEdit = (a) => { setForm({ titolo: a.titolo, descrizione: a.descrizione || '' }); setEditing(a); };
  const cancel = () => { setEditing(null); };

  const save = async () => {
    if (!form.titolo) return;
    setSaving(true);
    if (editing === 'new') {
      await supabase.from('activities').insert({ titolo: form.titolo, descrizione: form.descrizione, attiva: true });
    } else {
      await supabase.from('activities').update({ titolo: form.titolo, descrizione: form.descrizione }).eq('id', editing.id);
    }
    setSaving(false);
    cancel();
    fetchActivities();
  };

  const toggleActive = async (a) => {
    await supabase.from('activities').update({ attiva: !a.attiva }).eq('id', a.id);
    fetchActivities();
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {editing ? (
        <div className="card flex flex-col gap-3">
          <p className="font-semibold text-slate-800">
            {editing === 'new' ? 'Nuova attività' : 'Modifica attività'}
          </p>
          <input className="input-field" placeholder="Titolo attività *" value={form.titolo}
            onChange={e => setForm({ ...form, titolo: e.target.value })} />
          <textarea className="input-field resize-none" rows={2}
            placeholder="Descrizione / istruzioni (opzionale)" value={form.descrizione}
            onChange={e => setForm({ ...form, descrizione: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={cancel}>Annulla</button>
            <button className="btn-primary flex-1" onClick={save} disabled={saving || !form.titolo}>
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
          Aggiungi attività
        </button>
      )}

      <p className="text-xs text-slate-400">
        Le attività attive vengono caricate automaticamente ad ogni nuova visita.
      </p>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map(a => (
            <div key={a.id} className={`card flex items-start gap-3 ${!a.attiva ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{a.titolo}</p>
                {a.descrizione && <p className="text-xs text-slate-400 mt-0.5">{a.descrizione}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(a)}
                  className="text-slate-400 active:text-primary-600 p-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => toggleActive(a)}
                  className={`badge ${a.attiva ? 'badge-green' : 'badge-gray'}`}>
                  {a.attiva ? 'Attiva' : 'Off'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
