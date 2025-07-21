import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import CompanySettingsForm from '@/components/CompanySettingsForm';
import FinancialSettingsForm from '@/components/FinancialSettingsForm';
import CurrencySettingsForm from '@/components/CurrencySettingsForm';
import ModulePermissionsForm from '@/components/ModulePermissionsForm'; // Import new component
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AppSettings {
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  bank_account_details: string | null;
  default_vat_rate: number;
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
  default_currency_id: string | null;
  module_permissions: Record<string, Record<string, string[]>> | null; // New field
}

const SettingsPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      toast.error('Failed to load application settings: ' + error.message);
      setAppSettings(null);
    } else {
      setAppSettings(data as AppSettings);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (error) {
          console.error('Error fetching user role:', error.message);
          toast.error('Failed to fetch your user role.');
        } else {
          setCurrentUserRole(data.role);
        }
      };
      fetchUserRole();
      fetchAppSettings();
    }
  }, [supabase, session]);

  const handleModuleToggle = async (moduleName: keyof AppSettings, checked: boolean) => {
    if (!appSettings) return;

    const { error } = await supabase
      .from('app_settings')
      .update({ [moduleName]: checked })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      toast.error(`Failed to update ${moduleName.replace('module_', '').replace('_enabled', '')} status: ` + error.message);
    } else {
      toast.success(`${moduleName.replace('module_', '').replace('_enabled', '')} status updated successfully!`);
      setAppSettings(prev => prev ? { ...prev, [moduleName]: checked } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (currentUserRole !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Dark Mode / Light Mode</span>
              <ThemeToggle />
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              More general application settings will go here.
            </p>
          </CardContent>
        </Card>

        {appSettings && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <CompanySettingsForm initialData={appSettings} onSuccess={fetchAppSettings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Defaults</CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialSettingsForm initialData={appSettings} onSuccess={fetchAppSettings} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-full">
              <CardHeader>
                <CardTitle>Module Management</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'module_dashboard_enabled', label: 'Dashboard Module' },
                  { key: 'module_tasks_enabled', label: 'Tasks Module' },
                  { key: 'module_tickets_enabled', label: 'Tickets Module' },
                  { key: 'module_services_enabled', label: 'Services Module' },
                  { key: 'module_products_enabled', label: 'Products Module' },
                  { key: 'module_pos_enabled', label: 'POS Module' },
                  { key: 'module_invoices_enabled', label: 'Invoices Module' },
                  { key: 'module_reports_enabled', label: 'Reports Module' },
                  { key: 'module_users_enabled', label: 'User Management Module' },
                  { key: 'module_profile_enabled', label: 'Profile Module' },
                  { key: 'module_settings_enabled', label: 'Settings Module' },
                  { key: 'module_wiki_enabled', label: 'Wiki Module' },
                  { key: 'module_chat_enabled', label: 'Chat Module' },
                ].map((module) => (
                  <div key={module.key} className="flex items-center justify-between space-x-2 p-2 border rounded-md">
                    <Label htmlFor={module.key}>{module.label}</Label>
                    <Switch
                      id={module.key}
                      checked={appSettings[module.key as keyof AppSettings] as boolean}
                      onCheckedChange={(checked) => handleModuleToggle(module.key as keyof AppSettings, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-full">
              <CardHeader>
                <CardTitle>Currency & Exchange Rate Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CurrencySettingsForm onSuccess={fetchAppSettings} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-full">
              <CardHeader>
                <CardTitle>Module Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <ModulePermissionsForm initialPermissions={appSettings.module_permissions} onSuccess={fetchAppSettings} />
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure notification preferences (e.g., email alerts, in-app notifications).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage connections to external services.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;