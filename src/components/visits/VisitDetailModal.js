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

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Carica visita
      const { data: v } = await supabase
        .from('visits')
        .select('*, stores(nome, sede), profiles(nome)')
        .eq('id', visitId)
        .single();
      setVisit(v);

      // Carica attività con allegati
      const { data: acts } = await supabase
        .from('visit_activities')
        .select('*, activities(titolo, descrizione), attachments(*)')
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface" style={{ maxWidth: '512px', margin: '0 auto' }}>
      {/* Header modal */}
      <div className="bg-primary-800 text-white px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-1 -ml-1 active:opacity-70">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{storeName}</p>
          <p className="text-xs text-white/70">Dettaglio visita</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Info visita */}
          <div className="p-4 bg-white border-b border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Data" value={fmt(visit?.start_time, { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoCell label="Durata" value={getDuration() || '—'} />
              <InfoCell label="Inizio" value={fmt(visit?.start_time, { hour: '2-digit', minute: '2-digit' })} />
              <InfoCell label="Fine" value={fmt(visit?.end_time, { hour: '2-digit', minute: '2-digit' })} />
              {visit?.profiles?.nome && <InfoCell label="Utente" value={visit.profiles.nome} />}
              <InfoCell label="Completate" value={`${completed.length}/${visitActivities.length}`} />
            </div>
            {visit?.note_generali && (
              <div className="mt-3 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">NOTE GENERALI</p>
                <p className="text-sm text-slate-700">{visit.note_generali}</p>
              </div>
            )}
          </div>

          {/* Attività completate */}
          {completed.length > 0 && (
            <div className="p-4">
              <p className="section-title flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"/>
                Completate ({completed.length})
              </p>
              <div className="flex flex-col gap-2">
                {completed.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          )}

          {/* Attività non completate */}
          {notCompleted.length > 0 && (
            <div className="p-4 pt-0">
              <p className="section-title flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-300 rounded-full"/>
                Non completate ({notCompleted.length})
              </p>
              <div className="flex flex-col gap-2">
                {notCompleted.map(va => <ActivityDetail key={va.id} va={va} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer con PDF */}
      {!loading && visit?.end_time && (
        <div className="p-4 bg-white border-t border-slate-100">
          <button
            className="btn-primary w-full"
            onClick={() => generatePDF(visit, visitActivities, storeName, visit?.profiles?.nome || profile?.nome)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            Genera PDF
          </button>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActivityDetail({ va }) {
  const isImage = (t) => t?.startsWith('image/');
  return (
    <div className={`card py-3 ${va.completed ? 'border-emerald-100' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center
          ${va.completed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          {va.completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </span>
        <span className={`text-sm font-semibold ${va.completed ? 'text-emerald-800' : 'text-slate-500'}`}>
          {va.activities?.titolo}
        </span>
      </div>
      {va.notes && <p className="text-xs text-slate-500 ml-6 mb-2">{va.notes}</p>}
      {va.attachments?.length > 0 && (
        <div className="ml-6 flex flex-wrap gap-1.5">
          {va.attachments.map(att => (
            isImage(att.file_type) ? (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer">
                <img src={att.file_url} alt={att.file_name} className="w-14 h-14 object-cover rounded-lg border border-slate-200"/>
              </a>
            ) : (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary-600 bg-primary-50 rounded-lg px-2.5 py-1.5 font-medium flex items-center gap-1">
                📄 {att.file_name}
              </a>
            )
          ))}
        </div>
      )}
    </div>
  );
}
