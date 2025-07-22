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

  // Use a ref to track the user ID of the session currently in state.
  // This helps prevent unnecessary state updates if only the session token refreshes.
  const currentSessionUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        setSession(initialSession);
        currentSessionUserIdRef.current = initialSession?.user?.id || null;
        setLoading(false); // Initial load complete
      }
    });

    // 2. Real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;

      const newUserId = currentSession?.user?.id || null;

      // Only update React state if the user ID has actually changed
      // or if it's a sign-out event (where newUserId becomes null and currentSessionUserIdRef.current might not be null yet)
      if (newUserId !== currentSessionUserIdRef.current || _event === 'SIGNED_OUT') {
        setSession(currentSession);
        currentSessionUserIdRef.current = newUserId; // Update ref to reflect new state
      }

      // Handle navigation based on auth events
      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        // If signed in/updated and currently on login page, navigate to root (which redirects to dashboard)
        if (currentSession?.user?.id && location.pathname === '/login') {
          navigate('/');
        }
      }
    });

    return () => {
      isMounted = false; // Cleanup flag
      subscription.unsubscribe();
    };
  }, [navigate, supabase]); // Dependencies: navigate and supabase client (stable)

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