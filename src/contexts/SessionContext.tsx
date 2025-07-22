import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (mounted) {
        sessionRef.current = currentSession;
        setSession(currentSession);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // Spriječava nepotrebne re-rendere ako se session nije promijenio
      if (JSON.stringify(currentSession) !== JSON.stringify(sessionRef.current)) {
        sessionRef.current = currentSession;
        setSession(currentSession);
      }

      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
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