// src/hooks/useStores.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

async function fetchWithRetry(queryFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await queryFn();
    if (!error) return data || [];
    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  return [];
}

export function useStores(onlyActive = true) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithRetry(() => {
        let q = supabase.from('stores').select('*').order('area').order('nome');
        if (onlyActive) q = q.eq('attivo', true);
        return q;
      });
      setStores(data);
    } catch (err) {
      console.error('Errore store dopo retry:', err);
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
      const data = await fetchWithRetry(() => {
        // ORDER BY area, ordine — ordinamento fisso per area e posizione (punto 8)
        let q = supabase.from('activities').select('*').order('area').order('ordine');
        if (onlyActive) q = q.eq('attiva', true);
        return q;
      });
      setActivities(data);
    } catch (err) {
      console.error('Errore attività dopo retry:', err);
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}
