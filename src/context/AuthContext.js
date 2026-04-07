// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(authUser) {
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
  }

  useEffect(() => {
    let mounted = true;

    // Carica sessione esistente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
    });

    // Ascolta cambi di sessione
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
