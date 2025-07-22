import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

  // Koristimo ref da pratimo ID korisnika kako bismo spriječili ponovno učitavanje
  // ako se samo token osvježi, a korisnik ostane isti.
  const userIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const fetchGlobalAppData = async () => {
      const currentSessionUserId = session?.user?.id;

      // Provjeri da li se ID korisnika promijenio.
      // Ako nije, i ako već nismo u stanju učitavanja, preskoči ponovno učitavanje.
      if (userIdRef.current === currentSessionUserId && !loadingAppSettings) {
        return;
      }

      setLoadingAppSettings(true);
      userIdRef.current = currentSessionUserId; // Ažuriraj ref na trenutni ID korisnika

      // Dohvati postavke aplikacije
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Greška pri dohvatanju globalnih postavki aplikacije:', settingsError.message);
        toast.error('Nije uspjelo učitavanje globalnih postavki aplikacije.');
        setAppSettings(null); // Osiguraj da su postavke null u slučaju greške
      } else {
        setAppSettings(settingsData as AppSettings);
      }

      // Dohvati ulogu korisnika ako sesija postoji
      if (currentSessionUserId) {
        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSessionUserId)
          .single();
        if (roleError) {
          console.error('Greška pri dohvatanju uloge trenutnog korisnika:', roleError.message);
          toast.error('Nije uspjelo dohvatanje vaše korisničke uloge.');
          setCurrentUserRole(null); // Osiguraj da je uloga null u slučaju greške
        } else {
          setCurrentUserRole(roleData.role);
        }
      } else {
        setCurrentUserRole(null); // Nema sesije, nema uloge
      }

      setLoadingAppSettings(false);
    };

    fetchGlobalAppData();
  }, [supabase, session?.user?.id]); // Zavisnost je sada eksplicitno na session.user.id

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