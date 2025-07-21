import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/ProfileForm';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner'; // Import LoadingSpinner
import { usePermissions } from '@/hooks/usePermissions'; // Import usePermissions

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
  default_currency_id: string | null; // Add this field as it's used in ProfileForm
}

interface AppSettings {
  module_permissions: Record<string, Record<string, string[]>> | null;
}

const ProfilePage: React.FC = () => {
  const { supabase, session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null); // State for app settings

  // Pozivanje usePermissions hooka na vrhu komponente
  const { canViewModule } = usePermissions(appSettings, currentUserRole as 'client' | 'worker' | 'administrator');

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      let currentRole: string | null = null;
      let currentSettings: AppSettings | null = null;

      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (roleError) {
        console.error('Error fetching user role:', roleError.message);
        toast.error('Failed to fetch your user role.');
      } else {
        currentRole = roleData.role;
        setCurrentUserRole(roleData.role);
      }

      // Fetch app settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('module_permissions')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Error fetching app settings:', settingsError.message);
        toast.error('Failed to load app settings.');
      } else {
        currentSettings = settingsData as AppSettings;
        setAppSettings(settingsData as AppSettings);
      }

      if (!currentRole || !currentSettings) {
        setLoading(false);
        return;
      }

      // Provjera dozvola se sada radi preko `canViewModule` koji je definisan na vrhu komponente
      if (!canViewModule('profile')) { // Koristimo canViewModule direktno
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles_with_auth_emails') // Use the new view
        .select(`
          id,
          first_name,
          last_name,
          role,
          email,
          default_currency_id
        `) // Select email and default_currency_id directly
        .eq('id', session.user.id)
        .single();

      if (error) {
        toast.error('Failed to load profile: ' + error.message);
      } else if (data) {
        setProfile({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          email: data.email || 'N/A',
          default_currency_id: data.default_currency_id,
        });
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [supabase, session, appSettings, currentUserRole]); // Dodati appSettings i currentUserRole kao zavisnosti

  const handleFormSuccess = () => {
    // Re-fetch profile to show updated data
    if (session?.user?.id) {
      setLoading(true);
      supabase
        .from('profiles_with_auth_emails') // Use the new view
        .select(`
          id,
          first_name,
          last_name,
          role,
          email,
          default_currency_id
        `) // Select email and default_currency_id directly
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            toast.error('Failed to re-load profile: ' + error.message);
          } else if (data) {
            setProfile({
              id: data.id,
              first_name: data.first_name,
              last_name: data.last_name,
              role: data.role,
              email: data.email || 'N/A',
              default_currency_id: data.default_currency_id,
            });
          }
          setLoading(false);
        });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('profile')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Could not load user profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm initialData={profile} onSuccess={handleFormSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;