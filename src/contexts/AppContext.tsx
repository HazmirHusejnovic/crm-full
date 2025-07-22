import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from './SessionContext';
import { toast } from 'sonner';

// First define the context type
interface AppContextType {
  appSettings: AppSettings | null;
  currentUserRole: string | null;
  loadingAppSettings: boolean;
  dbConnectionError: boolean;
}

interface AppSettings {
  // Add your AppSettings interface properties here
  [key: string]: any;
}

// Create the context with initial undefined value
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { supabase, session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loadingAppSettings, setLoadingAppSettings] = useState(true);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  const fetchGlobalAppData = async () => {
    try {
      setLoadingAppSettings(true);
      setDbConnectionError(false);

      // Add timeout for database requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database request timeout')), 10000)
      );

      // Fetch app settings with timeout
      const settingsPromise = supabase
        .from('app_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      const { data: settingsData, error: settingsError } = 
        await Promise.race([settingsPromise, timeoutPromise]);

      if (settingsError) throw settingsError;
      
      setAppSettings(settingsData as AppSettings);

      // Fetch user role if session exists
      if (session?.user?.id) {
        const rolePromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const { data: roleData, error: roleError } = 
          await Promise.race([rolePromise, timeoutPromise]);

        if (roleError) throw roleError;
        setCurrentUserRole(roleData.role);
      } else {
        setCurrentUserRole(null);
      }

    } catch (error) {
      console.error('Database connection error:', error);
      setDbConnectionError(true);
      toast.error('Unable to connect to database. Please try again later.');
    } finally {
      setLoadingAppSettings(false);
    }
  };

  useEffect(() => {
    fetchGlobalAppData();
  }, [supabase, session?.user?.id]);

  return (
    <AppContext.Provider value={{ 
      appSettings, 
      currentUserRole, 
      loadingAppSettings,
      dbConnectionError 
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Export the useAppContext hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};