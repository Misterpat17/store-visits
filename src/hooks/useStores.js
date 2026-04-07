// src/hooks/useStores.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useStores(onlyActive = true) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('stores').select('*').order('area').order('nome');
    if (onlyActive) q = q.eq('attivo', true);
    const { data, error } = await q;
    if (!error) setStores(data || []);
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  return { stores, loading, refetch: fetchStores };
}

export function useActivities(onlyActive = true) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('activities').select('*').order('ordine');
    if (onlyActive) q = q.eq('attiva', true);
    const { data, error } = await q;
    if (!error) setActivities(data || []);
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}
