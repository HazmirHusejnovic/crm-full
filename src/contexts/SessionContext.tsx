import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface SessionContextType {
  supabase: SupabaseClient;
  session: Session | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ulkesgvggxkopvwnaqju.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2VzZ3ZnZ3hrb3B2d25hcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDcyMTMsImV4cCI6MjA2ODY4MzIxM30.xNX-I6OPN99BTqAMN-xuA32mjwiD-AtVXBLEidObT84';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Koristimo ref da pratimo ID trenutnog korisnika kako bismo spriječili ponovno renderovanje
  // ako se samo token osvježi, a korisnik ostane isti.
  const currentUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Početna provjera sesije
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      currentUserIdRef.current = initialSession?.user?.id;
      setLoading(false);
    });

    // Promjene stanja autentifikacije u realnom vremenu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const newUserId = currentSession?.user?.id || null;

      // Ažuriraj stanje samo ako se ID korisnika promijenio ili ako je početno učitavanje i sesija je null
      if (newUserId !== currentUserIdRef.current || (currentUserIdRef.current === undefined && newUserId === null)) {
        setSession(currentSession);
        currentUserIdRef.current = newUserId;
      }
      setLoading(false); // Osiguraj da je loading false nakon bilo koje promjene stanja autentifikacije

      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        // Navigiraj samo ako je korisnik zaista prijavljen i nije već na root putanji
        // Index.tsx će se pobrinuti za preusmjeravanje na dashboard
        if (currentSession?.user?.id && location.pathname === '/login') {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]); // Zavisnosti: navigate. Ovaj efekat se pokreće samo jednom pri montiranju.

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Učitavanje...</div>;
  }

  return (
    <SessionContext.Provider value={{ supabase, session }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};