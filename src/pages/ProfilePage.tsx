import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/ProfileForm';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api'; // Import novog API klijenta

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
  default_currency_id: string | null;
}

const ProfilePage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
        setProfile({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          email: data.email || 'N/A',
          default_currency_id: data.default_currency_id,
        });
      } catch (error: any) {
        toast.error('Failed to load profile: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleFormSuccess = () => {
    // Re-fetch profile to show updated data
    if (session?.user?.id) {
      setLoading(true);
      api.get(`/profiles/${session.user.id}`) // Pretpostavljena ruta
        .then(({ data }) => {
          setProfile({
            id: data.id,
            first_name: data.first_name,
            last_name: data.last_name,
            role: data.role,
            email: data.email || 'N/A',
            default_currency_id: data.default_currency_id,
          });
        })
        .catch((error: any) => {
          toast.error('Failed to re-load profile: ' + (error.response?.data?.message || error.message));
        })
        .finally(() => {
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