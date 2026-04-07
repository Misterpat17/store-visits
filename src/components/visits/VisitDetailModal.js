// src/components/visits/VisitDetailModal.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../shared/Spinner';
import generatePDF from '../../lib/generatePDF';

export default function VisitDetailModal({ visitId, storeName, onClose }) {
  const { profile } = useAuth();
  const [visit, setVisit] = useState(null);
  const [visitActivities, setVisitActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: v } = await supabase
        .from('visits')
        .select('*, stores(nome, sede, area), profiles(nome)')
        .eq('id', visitId)
        .single();
      setVisit(v);

      const { data: acts } = await supabase
        .from('visit_activities')
        .select('*, activities(titolo, descrizione, area), attachments(*)')
        .eq('visit_id', visitId)
        .order('id');
      setVisitActivities(acts || []);
      setLoading(false);
    }
    load();
  }, [visitId]);

  const fmt = (iso, opts) => iso ? new Date(iso).toLocaleString('it-IT', opts) : '—';

  const getDuration = () => {
    if (!visit?.start_time || !visit?.end_time) return null;
    const mins = Math.round((new Date(visit.end_time) - new Date(visit.start_time)) / 60000);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const completed = visitActivities.filter(v => v.completed);
  const notCompleted = visitActivities.filter(v => !v.completed);

  // Raggruppa per area
  const completedByArea = completed.reduce((acc, va) => {
    const area = va.activities?.area || 'ALTRO';
    if (!acc[area]) acc[area] = [];
    acc[area].push(va);
    return acc;
  }, {});

  const notCompletedByArea = notCompleted.reduce((acc, va) => {
    const area = va.activities?.area || 'ALTRO';
    if (!acc[area]) acc[area] = [];
    acc[area].push(va);
    return acc;
  }, {});

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      await generatePDF(visit, visitActivities, storeName, visit?.profiles?.nome || profile?.nome);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    // Overlay a schermo intero che copre tutto
    <div className="fixed inset-0 z-50 bg-surface flex flex-col"
      style={{ maxWidth: '512px', margin: '0 auto', left: 0, right: 0 }}>

      {/* Header */}
      <div className="bg-blue-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-area-inset-top))' }}>
        <button onClick={onClose} className="p-1 -ml-1 active:opacity-70 flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{storeName}</p>
          <p className="text-xs text-white/70">Dettaglio visita</p>
        </div>
        {/* Badge stato */}
        {visit && (
          <span className={`badge flex-shrink-0 ${visit.end_time ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
            {visit.end_time ? 'Chiusa' : 'Aperta'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto">

          {/* Info visita */}
          <div className="p-4 bg-white border-b border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <InfoCell label="Data" value={fmt(visit?.start_time, { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoCell label="Durata" value={getDuration() || '—'} />
              <InfoCell label="Inizio" value={fmt(visit?.start_time, { hour: '2-digit', minute: '2-digit' })} />
              <InfoCell label="Fine" value={fmt(visit?.end_time, { hour: '2-digit', minute: '2-digit' })} />
              {visit?.profiles?.nome && <InfoCell label="Utente" value={visit.profiles.nome} />}
              <InfoCell
                label="Completate"
                value={`${completed.length}/${visitActivities.length}`}
                highlight={completed.length === visitActivities.length}
              />
            </div>
            {visit?.note_generali && (
              <div className="mt-3 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">NOTE GENERALI</p>
                <p className="text-sm text-slate-700">{visit.note_generali}</p>
              </div>
            )}
          </div>

          {/* Attività completate */}
          {Object.entries(completedByArea).map(([area, acts]) => (
            <div key={area}>
              <div className="px-4 py-2 bg-emerald-50 border-y border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"/>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{area}</p>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {acts.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          ))}

          {/* Attività non completate */}
          {Object.entries(notCompletedByArea).map(([area, acts]) => (
            <div key={area}>
              <div className="px-4 py-2 bg-slate-50 border-y border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-300 rounded-full flex-shrink-0"/>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{area} — non completate</p>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {acts.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          ))}

          <div className="h-4" />
        </div>
      )}

      {/* Footer PDF — sempre visibile */}
      {!loading && (
        <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0"
          style={{ paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))' }}>
          <button
            className="btn-primary w-full"
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? <Spinner size="sm" color="white" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            )}
            {generatingPDF ? 'Generazione PDF...' : 'Genera PDF'}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function ActivityDetail({ va }) {
  const isImage = (t) => t?.startsWith('image/');
  return (
    <div className={`px-4 py-3 bg-white ${va.completed ? '' : 'opacity-70'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
          ${va.completed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          {va.completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </span>
        <span className={`text-sm font-medium ${va.completed ? 'text-slate-800' : 'text-slate-500'}`}>
          {va.activities?.titolo}
        </span>
      </div>
      {va.notes && (
        <p className="text-xs text-slate-500 ml-6 mt-1 bg-slate-50 rounded-lg px-2 py-1">{va.notes}</p>
      )}
      {va.attachments?.length > 0 && (
        <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
          {va.attachments.map(att => (
            isImage(att.file_type) ? (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer">
                <img src={att.file_url} alt={att.file_name}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200"/>
              </a>
            ) : (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1">
                📄 {att.file_name}
              </a>
            )
          ))}
        </div>
      )}
    </div>
  );
}
