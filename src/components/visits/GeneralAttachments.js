// src/components/visits/GeneralAttachments.js
import { useState, useRef } from 'react';

export default function GeneralAttachments({ attachments, readonly, onUpload, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedNames, setUploadedNames] = useState([]);
  const fileRef = useRef();

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    // Mostra subito i nomi dei file in caricamento
    setUploadedNames(Array.from(files).map(f => f.name));
    await onUpload(files);
    setUploadedNames([]);
    setUploading(false);
    e.target.value = '';
  };

  // Filtra null e immagini
  const files = (attachments || []).filter(a => a && !a.file_type?.startsWith('image/'));

  return (
    <div>
      <label className="section-title">Allegati ({files.length})</label>

      {/* File già caricati */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {files.map(att => (
            <div key={att.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
              <span className="text-lg flex-shrink-0">
                {att.file_type?.includes('pdf') ? '📄' :
                 att.file_type?.includes('sheet') || att.file_name?.endsWith('.xlsx') ? '📊' :
                 att.file_type?.includes('word') || att.file_name?.endsWith('.docx') ? '📝' : '📎'}
              </span>
              <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-600 font-medium truncate">
                {att.file_name}
              </a>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => onDelete(att.id)}
                  className="text-red-400 active:text-red-600 p-2 flex-shrink-0"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/>
                    <path d="M9,6V4h6v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File in caricamento — feedback visivo */}
      {uploading && uploadedNames.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {uploadedNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
              <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
              <span className="text-xs text-blue-600 truncate">{name}</span>
            </div>
          ))}
        </div>
      )}

      {!readonly && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-slate-600 text-sm font-medium
            bg-slate-100 rounded-xl px-4 py-2.5 active:bg-slate-200 transition-colors
            disabled:opacity-50 w-full justify-center"
        >
          {uploading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"/>
              Caricamento in corso...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              Aggiungi file
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
