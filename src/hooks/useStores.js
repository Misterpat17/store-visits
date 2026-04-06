// src/hooks/useStores.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useStores(onlyActive = true) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    let q = supabase.from('stores').select('*').order('nome');
    if (onlyActive) q = q.eq('attivo', true);
    const { data, error } = await q;
    if (!error) setStores(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [onlyActive]);

  return { stores, loading, refetch: fetch };
}

// src/hooks/useActivities.js (inline per comodità)
export function useActivities(onlyActive = true) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    let q = supabase.from('activities').select('*').order('titolo');
    if (onlyActive) q = q.eq('attiva', true);
    const { data, error } = await q;
    if (!error) setActivities(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [onlyActive]);

  return { activities, loading, refetch: fetch };
}
