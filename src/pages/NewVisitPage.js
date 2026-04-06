// src/pages/NewVisitPage.js
import { useState, useEffect } from 'react';
import { supabase, uploadAttachment } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStores } from '../hooks/useStores';
import { useActivities } from '../hooks/useStores';
import Spinner from '../components/shared/Spinner';
import ActivityRow from '../components/visits/ActivityRow';
import generatePDF from '../lib/generatePDF';

export default function NewVisitPage() {
  const { user, profile } = useAuth();
  const { stores } = useStores(true);
  const { activities } = useActivities(true);

  // Stati visita
  const [phase, setPhase] = useState('select'); // select | active | closed
  const [selectedStore, setSelectedStore] = useState('');
  const [visit, setVisit] = useState(null); // oggetto visita dal DB
  const [visitActivities, setVisitActivities] = useState([]); // lista con stato locale
  const [generalNote, setGeneralNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avvio visita
  const startVisit = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      // 1. Crea record visita
      const { data: newVisit, error: visitErr } = await supabase
        .from('visits')
        .insert({ user_id: user.id, store_id: selectedStore, start_time: new Date().toISOString() })
        .select()
        .single();
      if (visitErr) throw visitErr;

      // 2. Crea record visit_activities per ogni attività attiva
      const actRows = activities.map(a => ({
        visit_id: newVisit.id,
        activity_id: a.id,
        completed: false,
        notes: '',
      }));
      const { data: createdActs, error: actsErr } = await supabase
        .from('visit_activities')
        .insert(actRows)
        .select('*, activities(titolo, descrizione)');
      if (actsErr) throw actsErr;

      setVisit(newVisit);
      setVisitActivities(createdActs.map(va => ({ ...va, attachments: [] })));
      setPhase('active');
    } catch (err) {
      alert('Errore nell\'avvio della visita: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle completamento attività
  const toggleActivity = async (vaId, completed) => {
    setVisitActivities(prev =>
      prev.map(va => va.id === vaId ? { ...va, completed } : va)
    );
    await supabase.from('visit_activities').update({ completed }).eq('id', vaId);
  };

  // Aggiorna note attività
  const updateNote = async (vaId, notes) => {
    setVisitActivities(prev =>
      prev.map(va => va.id === vaId ? { ...va, notes } : va)
    );
    // Debounce implicito: salva al blur o dopo 1.5s
  };

  // Salva note su DB (chiamato al blur)
  const saveNote = async (vaId, notes) => {
    await supabase.from('visit_activities').update({ notes }).eq('id', vaId);
  };

  // Upload allegato
  const handleFileUpload = async (vaId, files) => {
    const va = visitActivities.find(v => v.id === vaId);
    for (const file of Array.from(files)) {
      try {
        setSaving(true);
        const { path, publicUrl, fileName, fileType } = await uploadAttachment(visit.id, vaId, file);
        const { data: att } = await supabase
          .from('attachments')
          .insert({ visit_activity_id: vaId, file_url: publicUrl, file_path: path, file_name: fileName, file_type: fileType })
          .select()
          .single();
        setVisitActivities(prev =>
          prev.map(v => v.id === vaId ? { ...v, attachments: [...(v.attachments || []), att] } : v)
        );
      } catch (err) {
        alert('Errore upload: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  // Elimina allegato
  const deleteAttachment = async (vaId, attId) => {
    await supabase.from('attachments').delete().eq('id', attId);
    setVisitActivities(prev =>
      prev.map(va => va.id === vaId
        ? { ...va, attachments: va.attachments.filter(a => a.id !== attId) }
        : va
      )
    );
  };

  // Chiudi visita
  const closeVisit = async () => {
    if (!window.confirm('Sei sicuro di voler chiudere la visita? Non sarà più modificabile.')) return;
    setSaving(true);
    const endTime = new Date().toISOString();
    await supabase.from('visits').update({ end_time: endTime, note_generali: generalNote }).eq('id', visit.id);
    setVisit(prev => ({ ...prev, end_time: endTime }));
    setPhase('closed');
    setSaving(false);
  };

  // Reset per nuova visita
  const resetVisit = () => {
    setPhase('select');
    setSelectedStore('');
    setVisit(null);
    setVisitActivities([]);
    setGeneralNote('');
  };

  const storeName = stores.find(s => s.id === selectedStore)?.nome || '';
  const completed = visitActivities.filter(v => v.completed).length;
  const total = visitActivities.length;

  // ── FASE 1: Selezione store ──
  if (phase === 'select') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="card">
          <h2 className="font-bold text-slate-800 text-lg mb-1">Inizia una nuova visita</h2>
          <p className="text-slate-500 text-sm mb-4">Seleziona lo store da visitare</p>

          <label className="section-title">Store</label>
          <select
            className="input-field mb-4"
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
          >
            <option value="">— Seleziona uno store —</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.nome} {s.sede ? `· ${s.sede}` : ''}</option>
            ))}
          </select>

          <button
            className="btn-primary w-full"
            onClick={startVisit}
            disabled={!selectedStore || loading}
          >
            {loading ? <Spinner size="sm" color="white" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16"/>
              </svg>
            )}
            {loading ? 'Avvio in corso...' : 'Avvia visita'}
          </button>
        </div>

        <div className="card bg-primary-50 border-primary-100">
          <p className="text-xs text-primary-700 font-medium">
            💡 Verranno caricate automaticamente {activities.length} attività standard da verificare durante la visita.
          </p>
        </div>
      </div>
    );
  }

  // ── FASE 2/3: Visita attiva o chiusa ──
  return (
    <div className="flex flex-col gap-0">
      {/* Header visita */}
      <div className={`px-4 py-3 ${phase === 'closed' ? 'bg-emerald-700' : 'bg-amber-500'} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{storeName}</p>
            <p className="text-xs opacity-80">
              Inizio: {visit && new Date(visit.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              {visit?.end_time && ` · Fine: ${new Date(visit.end_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl">{completed}/{total}</p>
            <p className="text-xs opacity-80">completate</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Lista attività */}
      <div className="divide-y divide-slate-100">
        {visitActivities.map(va => (
          <ActivityRow
            key={va.id}
            va={va}
            readonly={phase === 'closed'}
            onToggle={(completed) => toggleActivity(va.id, completed)}
            onNoteChange={(notes) => updateNote(va.id, notes)}
            onNoteBlur={(notes) => saveNote(va.id, notes)}
            onFileUpload={(files) => handleFileUpload(va.id, files)}
            onDeleteAttachment={(attId) => deleteAttachment(va.id, attId)}
          />
        ))}
      </div>

      {/* Note generali */}
      <div className="p-4 bg-white border-t border-slate-100">
        <label className="section-title">Note generali visita</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Eventuali note generali sulla visita..."
          value={generalNote}
          onChange={e => setGeneralNote(e.target.value)}
          disabled={phase === 'closed'}
        />
      </div>

      {/* Azioni footer */}
      <div className="p-4 flex flex-col gap-3 bg-white border-t border-slate-100">
        {phase === 'active' && (
          <button className="btn-primary w-full" onClick={closeVisit} disabled={saving}>
            {saving ? <Spinner size="sm" color="white" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            )}
            Concludi visita
          </button>
        )}

        {phase === 'closed' && (
          <>
            <button
              className="btn-primary w-full"
              onClick={() => generatePDF(visit, visitActivities, storeName, profile?.nome)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Genera PDF
            </button>
            <button className="btn-secondary w-full" onClick={resetVisit}>
              Inizia nuova visita
            </button>
          </>
        )}
      </div>
    </div>
  );
}
