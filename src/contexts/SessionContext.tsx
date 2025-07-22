import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Add this missing context creation
const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionContextType {
  supabase: SupabaseClient;
  session: Session | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ulkesgvggxkopvwnaqju.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2VzZ3ZnZ3hrb3B2d25hcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDcyMTMsImV4cCI6MjA2ODY4MzIxM30.xNX-I6OPN99BTqAMN-xuA32mjwiD-AtVXBLEidObT84';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Koristimo ref da pohranimo referencu na trenutni korisnički objekat
  // kako bismo izbjegli ažuriranje stanja sesije ako se samo token osvježi, a korisnik ostane isti.
  const currentUserObjectRef = useRef<User | null | undefined>(undefined);

  useEffect(() => {
    const handleInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      currentUserObjectRef.current = initialSession?.user; // Pohrani referencu na korisnički objekat
      setLoading(false);
    };

    handleInitialSession();

    // Promjene stanja autentifikacije u realnom vremenu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const newUserObject = currentSession?.user || null;
      const oldUserObject = currentUserObjectRef.current;

      // Ažuriraj stanje sesije samo ako se referenca na korisnički objekat promijenila.
      // Ovo pokriva promjene korisnika (prijava/odjava) i značajne promjene korisničkih podataka,
      // ali izbjegava re-renderovanja uzrokovana samo osvježavanjem tokena ako korisnički objekat ostaje isti.
      if (newUserObject !== oldUserObject) {
        setSession(currentSession);
        currentUserObjectRef.current = newUserObject;
      }
      setLoading(false); // Osiguraj da je loading false nakon bilo koje promjene stanja autentifikacije

      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      } else if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        if (currentSession?.user?.id && location.pathname === '/login') {
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]); // Zavisnosti: navigate. `supabase` je stabilan.

  // Memoiziraj vrijednost konteksta kako bi se spriječila nepotrebna re-renderovanja potrošača
  const contextValue = React.useMemo(() => ({ supabase, session }), [session]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
  }

  return (
    <SessionContext.Provider value={contextValue}>
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