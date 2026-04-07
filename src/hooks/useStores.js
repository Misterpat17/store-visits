// src/hooks/useStores.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useStores(onlyActive = true) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('stores').select('*').order('area').order('nome');
      if (onlyActive) q = q.eq('attivo', true);
      const { data, error } = await q;
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error('Errore caricamento store:', err);
      // Riprova dopo 2 secondi in caso di errore di lock
      setTimeout(async () => {
        try {
          let q = supabase.from('stores').select('*').order('area').order('nome');
          if (onlyActive) q = q.eq('attivo', true);
          const { data } = await q;
          setStores(data || []);
        } catch (e) {
          console.error('Secondo tentativo fallito:', e);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  return { stores, loading, refetch: fetchStores };
}

export function useActivities(onlyActive = true) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('activities').select('*').order('ordine');
      if (onlyActive) q = q.eq('attiva', true);
      const { data, error } = await q;
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Errore caricamento attività:', err);
      // Riprova dopo 2 secondi in caso di errore di lock
      setTimeout(async () => {
        try {
          let q = supabase.from('activities').select('*').order('ordine');
          if (onlyActive) q = q.eq('attiva', true);
          const { data } = await q;
          setActivities(data || []);
        } catch (e) {
          console.error('Secondo tentativo fallito:', e);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}
