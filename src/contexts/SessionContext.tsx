import React, { createContext, useContext, useEffect, useState } from 'react';
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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