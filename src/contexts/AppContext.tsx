import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { supabase, session } = useSession();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loadingAppSettings, setLoadingAppSettings] = useState(true);

  useEffect(() => {
    const fetchGlobalAppData = async () => {
      setLoadingAppSettings(true);

      // Fetch app settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Error fetching global app settings:', settingsError.message);
        toast.error('Failed to load global app settings.');
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
        } else {
          setCurrentUserRole(roleData.role);
        }
      } else {
        setCurrentUserRole(null); // No session, no role
      }

      setLoadingAppSettings(false);
    };

    fetchGlobalAppData();
  }, [supabase, session]); // Re-fetch when supabase client or session changes

  return (
    <AppContext.Provider value={{ appSettings, currentUserRole, loadingAppSettings }}>
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