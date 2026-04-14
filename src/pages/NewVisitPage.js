// src/pages/NewVisitPage.js
import { useState } from 'react';
import { supabase, uploadAttachment } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStores, useActivities } from '../hooks/useStores';
import Spinner from '../components/shared/Spinner';
import ActivityRow from '../components/visits/ActivityRow';
import GeneralAttachments from '../components/visits/GeneralAttachments';
import generatePDF from '../lib/generatePDF';

const AREA_ORDER = ['COMMERCIALE','OBSOLETI','ASSISTENZA','FORMAZIONE','VOLANTINO','PROMOZIONE','AREE ESPOSITIVE','ANALISI PERFORMANCE'];

export default function NewVisitPage({ onVisitClosed, onVisitReset }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { stores, refetch: refetchStores } = useStores(true);
  const { activities, refetch: refetchActivities } = useActivities(true);

  const [phase, setPhase] = useState('select');
  const [selectedStore, setSelectedStore] = useState('');
  const [visit, setVisit] = useState(null);
  const [visitActivities, setVisitActivities] = useState([]);
  const [generalNote, setGeneralNote] = useState('');
  const [generalAttachments, setGeneralAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const storesByArea = stores.reduce((acc, s) => {
    const area = s.area || 'ALTRO';
    if (!acc[area]) acc[area] = [];
    acc[area].push(s);
    return acc;
  }, {});

  // Raggruppa per area rispettando l'ordine fisso
  const activitiesByArea = AREA_ORDER.reduce((acc, area) => {
    const acts = visitActivities.filter(va => va.activities?.area === area);
    if (acts.length > 0) acc[area] = acts;
    return acc;
  }, {});
  // Aggiungi eventuali aree non in lista
  visitActivities.forEach(va => {
    const area = va.activities?.area || 'ALTRO';
    if (!AREA_ORDER.includes(area)) {
      if (!activitiesByArea[area]) activitiesByArea[area] = [];
      activitiesByArea[area].push(va);
    }
  });

  const startVisit = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const { data: newVisit, error: visitErr } = await supabase
        .from('visits')
        .insert({ user_id: user.id, store_id: selectedStore, start_time: new Date().toISOString() })
        .select()
        .single();
      if (visitErr) throw visitErr;

      const sorted = [...activities].sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
      const actRows = sorted.map(a => ({
        visit_id: newVisit.id,
        activity_id: a.id,
        completed: false,
        notes: '',
        rating: null,
      }));
      const { data: createdActs, error: actsErr } = await supabase
        .from('visit_activities')
        .insert(actRows)
        .select('*, activities(titolo, descrizione, area, ordine)');
      if (actsErr) throw actsErr;

      setVisit(newVisit);
      setVisitActivities(
        createdActs
          .map(va => ({ ...va, attachments: [] }))
          .sort((a, b) => (a.activities?.ordine || 0) - (b.activities?.ordine || 0))
      );
      setPhase('active');
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = async (vaId, completed) => {
    setVisitActivities(prev => prev.map(va => va.id === vaId ? { ...va, completed } : va));
    await supabase.from('visit_activities').update({ completed }).eq('id', vaId);
  };

  const updateNote = (vaId, notes) => {
    setVisitActivities(prev => prev.map(va => va.id === vaId ? { ...va, notes } : va));
  };

  const saveNote = async (vaId, notes) => {
    await supabase.from('visit_activities').update({ notes }).eq('id', vaId);
  };

  const updateRating = async (vaId, rating) => {
    setVisitActivities(prev => prev.map(va => va.id === vaId ? { ...va, rating } : va));
    await supabase.from('visit_activities').update({ rating }).eq('id', vaId);
  };

  const handlePhotoUpload = async (vaId, files) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
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
        alert('Errore upload foto: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeletePhoto = async (vaId, attId) => {
    await supabase.from('attachments').delete().eq('id', attId);
    setVisitActivities(prev =>
      prev.map(va => va.id === vaId
        ? { ...va, attachments: va.attachments.filter(a => a.id !== attId) }
        : va)
    );
  };

  const handleGeneralFileUpload = async (files) => {
    for (const file of Array.from(files)) {
      try {
        setSaving(true);
        const timestamp = Date.now();
        const path = `attachments/${visit.id}/general/${timestamp}_${file.name}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        const { data: att } = await supabase
          .from('attachments')
          .insert({ visit_activity_id: null, file_url: urlData.publicUrl, file_path: path, file_name: file.name, file_type: file.type, visit_id: visit.id })
          .select()
          .single();
        setGeneralAttachments(prev => [...prev, att]);
      } catch (err) {
        alert('Errore upload file: ' + err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteGeneralFile = async (attId) => {
    await supabase.from('attachments').delete().eq('id', attId);
    setGeneralAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const closeVisit = async () => {
    if (!window.confirm('Sei sicuro di voler chiudere la visita? Non sarà più modificabile.')) return;
    setSaving(true);
    const endTime = new Date().toISOString();
    await supabase.from('visits').update({ end_time: endTime, note_generali: generalNote }).eq('id', visit.id);
    setVisit(prev => ({ ...prev, end_time: endTime }));
    setPhase('closed');
    setSaving(false);
    if (onVisitClosed) onVisitClosed();
  };

  const resetVisit = async () => {
    await Promise.all([refetchStores(), refetchActivities()]);
    setPhase('select');
    setSelectedStore('');
    setVisit(null);
    setVisitActivities([]);
    setGeneralNote('');
    setGeneralAttachments([]);
    if (onVisitReset) onVisitReset();
  };

  if (authLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const storeName = stores.find(s => s.id === selectedStore)?.nome || '';
  const completed = visitActivities.filter(v => v.completed).length;
  const total = visitActivities.length;

  if (phase === 'select') {
    return (
      <div className="p-4 flex flex-col gap-4">
        <div className="card">
          <h2 className="font-bold text-slate-800 text-lg mb-1">Inizia una nuova visita</h2>
          <p className="text-slate-500 text-sm mb-4">Seleziona lo store da visitare</p>
          <label className="section-title">Store</label>
          <select className="input-field mb-4" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
            <option value="">— Seleziona uno store —</option>
            {Object.entries(storesByArea).sort(([a], [b]) => a.localeCompare(b)).map(([area, areaStores]) => (
              <optgroup key={area} label={area}>
                {areaStores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </optgroup>
            ))}
          </select>
          <button className="btn-primary w-full" onClick={startVisit} disabled={!selectedStore || loading}>
            {loading ? <Spinner size="sm" color="white" /> : null}
            {loading ? 'Avvio in corso...' : 'Avvia visita'}
          </button>
        </div>
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-xs text-blue-700 font-medium">
            💡 Verranno caricate automaticamente {activities.length} attività standard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
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
        <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }} />
        </div>
      </div>

      {Object.entries(activitiesByArea).map(([area, areaActs]) => (
        <div key={area}>
          <div className="px-4 py-2 bg-slate-100 border-y border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{area}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {areaActs.map(va => (
              <ActivityRow
                key={va.id}
                va={va}
                readonly={phase === 'closed'}
                onToggle={(c) => toggleActivity(va.id, c)}
                onNoteChange={(n) => updateNote(va.id, n)}
                onNoteBlur={(n) => saveNote(va.id, n)}
                onFileUpload={(files) => handlePhotoUpload(va.id, files)}
                onDeleteAttachment={(attId) => handleDeletePhoto(va.id, attId)}
                onRatingChange={(r) => updateRating(va.id, r)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-4">
        <div>
          <label className="section-title">Note generali visita</label>
          <textarea className="input-field resize-none" rows={3}
            placeholder="Eventuali note generali..." value={generalNote}
            onChange={e => setGeneralNote(e.target.value)} disabled={phase === 'closed'} />
        </div>
        <GeneralAttachments
          attachments={generalAttachments}
          readonly={phase === 'closed'}
          onUpload={handleGeneralFileUpload}
          onDelete={handleDeleteGeneralFile}
        />
      </div>

      <div className="p-4 flex flex-col gap-3 bg-white border-t border-slate-100">
        {phase === 'active' && (
          <button className="btn-primary w-full" onClick={closeVisit} disabled={saving}>
            {saving ? <Spinner size="sm" color="white" /> : null}
            Concludi visita
          </button>
        )}
        {phase === 'closed' && (
          <>
            <button className="btn-primary w-full"
              onClick={() => generatePDF(visit, visitActivities, storeName, profile?.nome)}>
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
