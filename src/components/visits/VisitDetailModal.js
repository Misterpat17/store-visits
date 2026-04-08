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
  const [generalAttachments, setGeneralAttachments] = useState([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: v } = await supabase
          .from('visits')
          .select('*, stores(nome, sede, area)')
          .eq('id', visitId)
          .single();
        setVisit(v);

        if (v?.user_id) {
          const { data: p } = await supabase
            .from('profiles').select('nome').eq('id', v.user_id).single();
          setUserName(p?.nome || '');
        }

        // Attività con solo le foto (visit_activity_id valorizzato)
        const { data: acts } = await supabase
          .from('visit_activities')
          .select('*, activities(titolo, descrizione, area), attachments(*)')
          .eq('visit_id', visitId)
          .order('id');

        setVisitActivities(
          (acts || []).map(va => ({
            ...va,
            // Solo allegati legati all'attività (non quelli generali)
            attachments: (va.attachments || []).filter(a => a.visit_activity_id === va.id)
          }))
        );

        // Allegati generali (visit_activity_id = null)
        const { data: genAtts } = await supabase
          .from('attachments')
          .select('*')
          .is('visit_activity_id', null)
          .eq('visit_id', visitId);
        setGeneralAttachments(genAtts || []);

      } catch (err) {
        console.error('Errore caricamento dettaglio:', err);
      } finally {
        setLoading(false);
      }
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

  const groupByArea = (acts) => acts.reduce((acc, va) => {
    const area = va.activities?.area || 'ALTRO';
    if (!acc[area]) acc[area] = [];
    acc[area].push(va);
    return acc;
  }, {});

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      await generatePDF(visit, visitActivities, storeName, userName || profile?.nome);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface"
      style={{ maxWidth: '512px', margin: '0 auto', left: 0, right: 0 }}>

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
        {visit && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 bg-emerald-500 text-white">
            Chiusa
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 flex-1"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Info visita */}
          <div className="p-4 bg-white border-b border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <InfoCell label="Data" value={fmt(visit?.start_time, { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoCell label="Durata" value={getDuration() || '—'} />
              <InfoCell label="Inizio" value={fmt(visit?.start_time, { hour: '2-digit', minute: '2-digit' })} />
              <InfoCell label="Fine" value={fmt(visit?.end_time, { hour: '2-digit', minute: '2-digit' })} />
              {userName && <InfoCell label="Utente" value={userName} />}
              <InfoCell label="Completate" value={`${completed.length}/${visitActivities.length}`}
                highlight={completed.length === visitActivities.length && visitActivities.length > 0} />
            </div>

            {/* Note generali */}
            {visit?.note_generali && (
              <div className="mt-3 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">NOTE GENERALI</p>
                <p className="text-sm text-slate-700">{visit.note_generali}</p>
              </div>
            )}

            {/* Allegati generali */}
            {generalAttachments.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">ALLEGATI GENERALI</p>
                <div className="flex flex-col gap-2">
                  {generalAttachments.map(att => (
                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="text-lg">
                        {att.file_type?.includes('pdf') ? '📄' :
                         att.file_name?.endsWith('.xlsx') ? '📊' :
                         att.file_name?.endsWith('.docx') ? '📝' : '📎'}
                      </span>
                      <span className="text-xs text-blue-600 font-medium truncate">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attività completate per area */}
          {Object.entries(groupByArea(completed)).map(([area, acts]) => (
            <div key={`c-${area}`}>
              <div className="px-4 py-2 bg-emerald-50 border-y border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"/>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{area}</p>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {acts.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          ))}

          {/* Attività non completate per area */}
          {Object.entries(groupByArea(notCompleted)).map(([area, acts]) => (
            <div key={`nc-${area}`}>
              <div className="px-4 py-2 bg-slate-50 border-y border-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-300 rounded-full flex-shrink-0"/>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {area} — non completate
                </p>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {acts.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          ))}

          <div className="h-4" />
        </div>
      )}

      {!loading && (
        <div className="p-4 bg-white border-t border-slate-100 flex-shrink-0"
          style={{ paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))' }}>
          <button className="btn-primary w-full" onClick={handleGeneratePDF} disabled={generatingPDF}>
            {generatingPDF ? <Spinner size="sm" color="white" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
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
  // Solo foto (immagini) per le attività
  const photos = (va.attachments || []).filter(a => a.file_type?.startsWith('image/'));
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
          ${va.completed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          {va.completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </span>
        <span className={`text-sm font-medium ${va.completed ? 'text-slate-800' : 'text-slate-400'}`}>
          {va.activities?.titolo}
        </span>
      </div>
      {va.notes && (
        <p className="text-xs text-slate-500 ml-6 mt-1 bg-slate-50 rounded-lg px-2 py-1">{va.notes}</p>
      )}
      {photos.length > 0 && (
        <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
          {photos.map(att => (
            <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer">
              <img src={att.file_url} alt={att.file_name}
                className="w-16 h-16 object-cover rounded-xl border border-slate-200"/>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
