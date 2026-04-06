// src/hooks/useStores.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useStores(onlyActive = true) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      setLoading(true);
      let q = supabase.from('stores').select('*').order('nome');
      if (onlyActive) q = q.eq('attivo', true);
      const { data, error } = await q;
      if (!error) setStores(data || []);
      setLoading(false);
    }
    fetchStores();
  }, [onlyActive]);

  return { stores, loading };
}

export function useActivities(onlyActive = true) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true);
      let q = supabase.from('activities').select('*').order('titolo');
      if (onlyActive) q = q.eq('attiva', true);
      const { data, error } = await q;
      if (!error) setActivities(data || []);
      setLoading(false);
    }
    fetchActivities();
  }, [onlyActive]);

  return { activities, loading };
}
