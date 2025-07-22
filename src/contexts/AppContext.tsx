import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from './SessionContext';
import { toast } from 'sonner';

interface AppSettings {
  module_dashboard_enabled: boolean;
  module_tasks_enabled: boolean;
  module_tickets_enabled: boolean;
  module_services_enabled: boolean;
  module_products_enabled: boolean;
  module_pos_enabled: boolean;
  module_invoices_enabled: boolean;
  module_reports_enabled: boolean;
  module_users_enabled: boolean;
  module_profile_enabled: boolean;
  module_settings_enabled: boolean;
  module_wiki_enabled: boolean;
  module_chat_enabled: boolean;
  module_permissions: Record<string, Record<string, string[]>> | null;
  default_vat_rate: number;
  default_currency_id: string | null;
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  bank_account_details: string | null;
}

interface AppContextType {
  appSettings: AppSettings | null;
  currentUserRole: string | null;
  loadingAppSettings: boolean;
  refetchAppSettings: () => void; // Add a function to manually refetch
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { supabase, session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loadingAppSettings, setLoadingAppSettings] = useState(true);

  // Use a ref to track the last loaded user ID to prevent unnecessary re-fetches
  const lastLoadedUserId = useRef<string | null | undefined>(undefined);

  // Use a ref to track if app settings have been fetched at least once
  const hasFetchedAppSettings = useRef(false);

  const fetchGlobalAppData = useCallback(async () => {
    // Only set loading to true and fetch if the user ID has changed,
    // or if app settings haven't been fetched yet.
    if (session?.user?.id !== lastLoadedUserId.current || !hasFetchedAppSettings.current) {
      setLoadingAppSettings(true);
      lastLoadedUserId.current = session?.user?.id || null; // Update the ref immediately
      hasFetchedAppSettings.current = true; // Mark as fetched

      // Fetch app settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Error fetching global app settings:', settingsError.message);
        toast.error('Failed to load global app settings.');
        setAppSettings(null); // Ensure state is clear on error
      } else {
        setAppSettings(settingsData as AppSettings);
      }

      // Fetch user role if session exists
      if (session?.user?.id) {
        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (roleError) {
          console.error('Error fetching current user role:', roleError.message);
          toast.error('Failed to fetch your user role.');
          setCurrentUserRole(null); // Clear role on error
        } else {
          setCurrentUserRole(roleData.role);
        }
      } else {
        setCurrentUserRole(null); // No session, no role
      }

      setLoadingAppSettings(false);
    } else {
      // If session.user.id is the same and appSettings are already loaded,
      // and it's not the initial fetch, ensure loading is false.
      setLoadingAppSettings(false);
    }
  }, [supabase, session]); // Dependencies for useCallback: supabase, session

  useEffect(() => {
    fetchGlobalAppData();
  }, [fetchGlobalAppData]); // Dependency for useEffect: fetchGlobalAppData (memoized by useCallback)

  // Provide a way to manually refetch app settings (e.g., after a form submission in SettingsPage)
  const refetchAppSettings = useCallback(() => {
    hasFetchedAppSettings.current = false; // Reset flag to force re-fetch
    fetchGlobalAppData();
  }, [fetchGlobalAppData]);

  return (
    <AppContext.Provider value={{ appSettings, currentUserRole, loadingAppSettings, refetchAppSettings }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};