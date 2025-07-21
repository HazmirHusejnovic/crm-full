import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/ProfileForm';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner'; // Import LoadingSpinner

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
}

const ProfilePage: React.FC = () => {
  const { supabase, session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          auth_users:auth.users(email)
        `)
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
          email: data.auth_users?.email || 'N/A',
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase, session]);

  const handleFormSuccess = () => {
    // Re-fetch profile to show updated data
    if (session?.user?.id) {
      setLoading(true);
      supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          auth_users:auth.users(email)
        `)
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
              email: data.auth_users?.email || 'N/A',
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