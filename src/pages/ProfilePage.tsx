import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/ProfileForm';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner'; // Import LoadingSpinner
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
  default_currency_id: string | null; // Add this field as it's used in ProfileForm
}

const ProfilePage: React.FC = () => {
  const { supabase, session } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from context
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingData, setLoadingData] = useState(true); // Separate loading for data fetching

  // usePermissions now gets its dependencies from useAppContext internally
  const { canViewModule } = usePermissions();

  useEffect(() => {
    const fetchProfileData = async () => {
      // Wait for global app settings and user role to load
      if (loadingAppSettings || !appSettings || !currentUserRole) {
        setLoadingData(true); // Still loading global data
        return;
      }

      // Now that global data is loaded, check permissions
      if (!canViewModule('profile')) {
        setLoadingData(false); // Not authorized, stop loading page data
        return;
      }

      setLoadingData(true); // Start loading page-specific data

      if (!session?.user?.id) {
        setLoadingData(false);
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
      setLoadingData(false);
    };

    fetchProfileData();
  }, [supabase, session, appSettings, currentUserRole, loadingAppSettings, canViewModule]); // Dependencies now include context values and canViewModule

  const handleFormSuccess = () => {
    // Re-fetch profile to show updated data
    if (session?.user?.id) {
      setLoadingData(true);
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
          setLoadingData(false);
        });
    }
  };

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
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