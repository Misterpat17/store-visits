// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Mancano le variabili REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    lock: (name, acquireTimeout, fn) => fn(),
  },
});

// Helper: esegui una query con retry automatico in caso di errore
export async function queryWithRetry(queryFn, maxRetries = 3, delayMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await queryFn();
      if (result.error) throw result.error;
      return result;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

export async function uploadAttachment(visitId, activityId, file) {
  const timestamp = Date.now();
  const path = `attachments/${visitId}/${activityId}/${timestamp}_${file.name}`;

  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(path);

  return { path, publicUrl: urlData.publicUrl, fileName: file.name, fileType: file.type };
}

export async function deleteAttachment(path) {
  const { error } = await supabase.storage.from('attachments').remove([path]);
  if (error) throw error;
}
