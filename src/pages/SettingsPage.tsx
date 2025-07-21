import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import CompanySettingsForm from '@/components/CompanySettingsForm';
import FinancialSettingsForm from '@/components/FinancialSettingsForm';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AppSettings {
  company_name: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_logo_url: string | null; // New field
  bank_account_details: string | null; // New field
  default_vat_rate: number;
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
      setAppSettings(data);
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