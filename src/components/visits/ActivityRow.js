// src/components/visits/ActivityRow.js
import { useState, useRef } from 'react';

export default function ActivityRow({
  va, readonly,
  onToggle, onNoteChange, onNoteBlur,
  onFileUpload, onDeleteAttachment
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    await onFileUpload(files);
    setUploading(false);
    e.target.value = '';
  };

  const isImage = (type) => type?.startsWith('image/');

  return (
    <div className={`bg-white transition-colors ${va.completed ? 'bg-emerald-50/40' : ''}`}>
      {/* Riga principale */}
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Checkbox */}
        <button
          disabled={readonly}
          onClick={() => onToggle(!va.completed)}
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
            ${va.completed
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-slate-300 active:border-primary-400'
            }
            ${readonly ? 'opacity-70 cursor-default' : ''}`}
        >
          {va.completed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </button>

        {/* Titolo attività */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <p className={`font-medium text-sm leading-snug ${va.completed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
            {va.activities?.titolo}
          </p>
          {va.activities?.descrizione && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{va.activities.descrizione}</p>
          )}
          {/* Badge allegati/note */}
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {va.notes && (
              <span className="badge-blue text-[10px]">📝 nota</span>
            )}
            {va.attachments?.length > 0 && (
              <span className="badge-blue text-[10px]">📎 {va.attachments.length}</span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1.5 text-slate-400 active:text-slate-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>
      </div>

      {/* Sezione espansa */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-50">
          {/* Campo note */}
          <div className="pt-3">
            <label className="section-title">Note</label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              placeholder="Aggiungi una nota per questa attività..."
              value={va.notes || ''}
              onChange={e => onNoteChange(e.target.value)}
              onBlur={e => onNoteBlur(e.target.value)}
              disabled={readonly}
            />
          </div>

          {/* Allegati */}
          <div>
            <label className="section-title">Allegati ({va.attachments?.length || 0})</label>

            {/* Lista allegati esistenti */}
            {va.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {va.attachments.map(att => (
                  <div key={att.id} className="relative group">
                    {isImage(att.file_type) ? (
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={att.file_url}
                          alt={att.file_name}
                          className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                        />
                      </a>
                    ) : (
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium max-w-[140px]"
                      >
                        <span>📄</span>
                        <span className="truncate">{att.file_name}</span>
                      </a>
                    )}
                    {/* Bottone elimina */}
                    {!readonly && (
                      <button
                        onClick={() => onDeleteAttachment(att.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full
                          text-xs flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100
                          active:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pulsante aggiungi allegato */}
            {!readonly && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-primary-600 text-sm font-medium
                  bg-primary-50 rounded-xl px-4 py-2.5 active:bg-primary-100 transition-colors
                  disabled:opacity-50 w-full justify-center"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"/>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    Aggiungi foto o file
                  </>
                )}
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
