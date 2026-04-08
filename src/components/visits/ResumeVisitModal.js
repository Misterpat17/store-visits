// src/components/visits/ResumeVisitModal.js
import { useState, useEffect } from 'react';
import { supabase, uploadAttachment } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../shared/Spinner';
import ActivityRow from './ActivityRow';
import GeneralAttachments from './GeneralAttachments';
import generatePDF from '../../lib/generatePDF';

export default function ResumeVisitModal({ visit, storeName, onClose, onVisitClosed }) {
  const { profile } = useAuth();
  const [visitActivities, setVisitActivities] = useState([]);
  const [generalNote, setGeneralNote] = useState(visit.note_generali || '');
  const [generalAttachments, setGeneralAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(visit.end_time ? 'closed' : 'active');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Carica attività con allegati (solo quelle legate a visit_activity)
      const { data: acts } = await supabase
        .from('visit_activities')
        .select('*, activities(titolo, descrizione, area, ordine), attachments(*)')
        .eq('visit_id', visit.id)
        .order('id');

      // Filtra: gli attachments delle attività devono avere visit_activity_id valorizzato
      setVisitActivities(
        (acts || [])
          .map(va => ({
            ...va,
            attachments: (va.attachments || []).filter(a => a.visit_activity_id === va.id)
          }))
          .sort((a, b) => (a.activities?.ordine || 0) - (b.activities?.ordine || 0))
      );

      // Carica allegati generali (visit_activity_id = null, visit_id = visit.id)
      const { data: genAtts } = await supabase
        .from('attachments')
        .select('*')
        .is('visit_activity_id', null)
        .eq('visit_id', visit.id);
      setGeneralAttachments(genAtts || []);

      setLoading(false);
    }
    load();
  }, [visit.id]);

  const activitiesByArea = visitActivities.reduce((acc, va) => {
    const area = va.activities?.area || 'ALTRO';
    if (!acc[area]) acc[area] = [];
    acc[area].push(va);
    return acc;
  }, {});

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

  // Solo foto per le attività
  const handlePhotoUpload = async (vaId, files) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        setSaving(true);
        const { path, publicUrl, fileName, fileType } = await uploadAttachment(visit.id, vaId, file);
        const { data: att } = await supabase
          .from('attachments')
          .insert({ visit_activity_id: vaId, file_url: publicUrl, file_path: path, file_name: fileName, file_type: fileType })
          .select().single();
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

  // File generali nelle note
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
          .insert({
            visit_activity_id: null,
            file_url: urlData.publicUrl,
            file_path: path,
            file_name: file.name,
            file_type: file.type,
            visit_id: visit.id,
          })
          .select().single();
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
    setPhase('closed');
    setSaving(false);
    if (onVisitClosed) onVisitClosed();
  };

  const completed = visitActivities.filter(v => v.completed).length;
  const total = visitActivities.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface"
      style={{ maxWidth: '512px', margin: '0 auto', left: 0, right: 0 }}>

      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 text-white
        ${phase === 'closed' ? 'bg-emerald-700' : 'bg-amber-500'}`}
        style={{ paddingTop: 'calc(0.75rem + var(--safe-area-inset-top))' }}>
        <button onClick={onClose} className="p-1 -ml-1 active:opacity-70 flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{storeName}</p>
          <p className="text-xs opacity-80">
            {phase === 'closed' ? 'Visita completata' : 'Visita in corso'}
            {' · '}{new Date(visit.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg">{completed}/{total}</p>
          <p className="text-xs opacity-80">completate</p>
        </div>
      </div>

      <div className={`h-1.5 ${phase === 'closed' ? 'bg-emerald-600' : 'bg-amber-400'}`}>
        <div className="h-full bg-white/60 transition-all duration-500"
          style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 flex-1"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
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
                onChange={e => setGeneralNote(e.target.value)}
                disabled={phase === 'closed'} />
            </div>
            <GeneralAttachments
              attachments={generalAttachments}
              readonly={phase === 'closed'}
              onUpload={handleGeneralFileUpload}
              onDelete={handleDeleteGeneralFile}
            />
          </div>
          <div className="h-4" />
        </div>
      )}

      {!loading && (
        <div className="p-4 flex flex-col gap-3 bg-white border-t border-slate-100 flex-shrink-0"
          style={{ paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))' }}>
          {phase === 'active' && (
            <button className="btn-primary w-full" onClick={closeVisit} disabled={saving}>
              {saving ? <Spinner size="sm" color="white" /> : null}
              Concludi visita
            </button>
          )}
          {phase === 'closed' && (
            <button className="btn-primary w-full"
              onClick={() => generatePDF({ ...visit, note_generali: generalNote }, visitActivities, storeName, profile?.nome)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              Genera PDF
            </button>
          )}
          <button className="btn-secondary w-full" onClick={onClose}>Chiudi</button>
        </div>
      )}
    </div>
  );
}
