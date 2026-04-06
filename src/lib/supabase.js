// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Mancano le variabili d\'ambiente REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Sessione persistente tra ricaricamenti
    autoRefreshToken: true,      // Rinnovo automatico del token
    detectSessionInUrl: true,    // Gestione magic links se usati
  },
});

// Helper: upload file su Supabase Storage
export async function uploadAttachment(visitId, activityId, file) {
  const ext = file.name.split('.').pop();
  const timestamp = Date.now();
  const path = `attachments/${visitId}/${activityId}/${timestamp}_${file.name}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  // Ottieni URL pubblico
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(path);

  return { path, publicUrl: urlData.publicUrl, fileName: file.name, fileType: file.type };
}

// Helper: elimina file da Supabase Storage
export async function deleteAttachment(path) {
  const { error } = await supabase.storage.from('attachments').remove([path]);
  if (error) throw error;
}
