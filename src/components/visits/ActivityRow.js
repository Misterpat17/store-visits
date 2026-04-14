// src/components/visits/ActivityRow.js
import { useState, useRef } from 'react';

function StarRating({ value, onChange, readonly }) {
  const [hovered, setHovered] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  const getColor = (rating) => {
    if (!rating) return 'text-slate-300';
    if (rating <= 2) return 'text-red-500';
    if (rating === 3) return 'text-amber-400';
    return 'text-emerald-500';
  };

  const displayValue = hovered || value || 0;
  const color = getColor(displayValue);

  return (
    <div className="flex items-center gap-1">
      {stars.map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star === value ? null : star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-2xl leading-none transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer active:scale-110'} ${star <= displayValue ? color : 'text-slate-200'}`}
        >
          ★
        </button>
      ))}
      {value && (
        <span className={`text-xs font-semibold ml-1 ${getColor(value)}`}>
          {value <= 2 ? 'Critico' : value === 3 ? 'Sufficiente' : value === 4 ? 'Buono' : 'Ottimo'}
        </span>
      )}
    </div>
  );
}

export default function ActivityRow({
  va, readonly,
  onToggle, onNoteChange, onNoteBlur,
  onFileUpload, onDeleteAttachment, onRatingChange
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

  const handlePaste = async (e) => {
    if (readonly) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      setUploading(true);
      await onFileUpload(imageFiles);
      setUploading(false);
    }
  };

  const photos = (va.attachments || []).filter(a => a && a.file_type?.startsWith('image/'));

  const ratingColor = (r) => {
    if (!r) return '';
    if (r <= 2) return 'text-red-500';
    if (r === 3) return 'text-amber-400';
    return 'text-emerald-500';
  };

  return (
    <div className={`bg-white transition-colors ${va.completed ? 'bg-emerald-50/40' : ''}`}>
      <div className="flex items-center px-4 py-3 gap-3">
        <button
          type="button"
          disabled={readonly}
          onClick={() => onToggle(!va.completed)}
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
            ${va.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 active:border-blue-400'}
            ${readonly ? 'opacity-70 cursor-default' : ''}`}
        >
          {va.completed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <p className={`font-medium text-sm leading-snug ${va.completed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
            {va.activities?.titolo}
          </p>
          <div className="flex gap-1.5 mt-1 flex-wrap items-center">
            {va.notes && <span className="badge-blue text-[10px]">📝 nota</span>}
            {photos.length > 0 && <span className="badge-blue text-[10px]">📷 {photos.length}</span>}
            {va.rating && (
              <span className={`text-xs font-bold ${ratingColor(va.rating)}`}>
                {'★'.repeat(va.rating)}{'☆'.repeat(5 - va.rating)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1.5 text-slate-400 active:text-slate-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-50">
          {/* Valutazione stelline */}
          <div className="pt-3">
            <label className="section-title">Valutazione</label>
            <StarRating
              value={va.rating || null}
              onChange={(v) => onRatingChange && onRatingChange(v)}
              readonly={readonly}
            />
          </div>

          {/* Note con paste screenshot */}
          <div>
            <label className="section-title">Note</label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              placeholder="Aggiungi una nota... (puoi incollare screenshot con Ctrl+V)"
              value={va.notes || ''}
              onChange={e => onNoteChange(e.target.value)}
              onBlur={e => onNoteBlur(e.target.value)}
              onPaste={handlePaste}
              disabled={readonly}
            />
          </div>

          {/* Foto */}
          <div>
            <label className="section-title">Foto ({photos.length})</label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photos.map(att => (
                  <div key={att.id} className="relative">
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                      <img src={att.file_url} alt={att.file_name}
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    </a>
                    {!readonly && (
                      <button
                        type="button"
                        onClick={() => onDeleteAttachment(att.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full
                          text-sm flex items-center justify-center shadow-md"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!readonly && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-blue-600 text-sm font-medium
                  bg-blue-50 rounded-xl px-4 py-2.5 active:bg-blue-100 transition-colors
                  disabled:opacity-50 w-full justify-center"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Aggiungi foto
                  </>
                )}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      )}
    </div>
  );
}
