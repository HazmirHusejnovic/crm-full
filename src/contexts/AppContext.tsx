import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppSettings {
  // Vaše postavke
}

interface AppContextType {
  appSettings: AppSettings | null;
  currentUserRole: string | null;
  loadingAppSettings: boolean;
  refreshAppSettings: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loadingAppSettings, setLoadingAppSettings] = useState(true);

  const fetchGlobalAppData = useCallback(async () => {
    // Vaša logika za dohvat podataka
  }, []);

  useEffect(() => {
    fetchGlobalAppData();
  }, [fetchGlobalAppData]);

  return (
    <AppContext.Provider value={{ appSettings, currentUserRole, loadingAppSettings, refreshAppSettings: fetchGlobalAppData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext mora se koristiti unutar AppContextProvidera');
  }
  return context;
};