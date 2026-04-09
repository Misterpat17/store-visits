// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

// Evento globale emesso quando la sessione è confermata valida dopo un ritorno in foreground
export const SESSION_READY_EVENT = 'bruno-session-ready';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Errore profilo:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Carica sessione esistente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    // Ascolta cambi di sessione (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user);
          if (mounted) setProfile(p);
        } else {
          setUser(null);
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    // Quando la pagina torna visibile, getSession() resetta lo stato interno
    // del client Supabase e garantisce che le query successive funzionino.
    // Dopo getSession(), emettiamo SESSION_READY_EVENT così tutti i componenti
    // sanno che possono ricaricare i dati.
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          // Emetti evento: la sessione è pronta, i componenti possono fare query
          window.dispatchEvent(new CustomEvent(SESSION_READY_EVENT));
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Errore getSession al ritorno in foreground:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.ruolo === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
