import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProfileForm from '@/components/ProfileForm';
import UserCreateForm from '@/components/UserCreateForm';
import { toast } from 'sonner';
import { Edit, Search, Eye, UserPlus, Trash2 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api'; // Import novog API klijenta

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
  default_currency_id: string | null;
}

const UserManagementPage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) {
        params.search = searchTerm; // API bi trebao pretraživati po imenu ili emailu
      }
      if (filterRole !== 'all') {
        params.role = filterRole;
      }
      const { data } = await api.get('/profiles', { params }); // Pretpostavljena ruta
      setProfiles(data as Profile[]);
    } catch (error: any) {
      toast.error('Failed to load profiles: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        try {
          const { data } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
          setCurrentUserRole(data.role);
        } catch (error: any) {
          console.error('Error fetching user role:', error.response?.data || error.message);
          toast.error('Failed to fetch your user role.');
        }
      };
      fetchUserRole();
    }
    fetchProfiles();
  }, [searchTerm, filterRole, session]);

  const handleEditProfileClick = (profile: Profile) => {
    setEditingProfile(profile);
    setIsEditFormOpen(true);
  };

  const handleViewClientDetails = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete user: ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      const response = await api.delete(`/users/${userId}`); // Pretpostavljena ruta za brisanje korisnika
      toast.success('User deleted successfully!');
      fetchProfiles();
    } catch (error: any) {
      toast.error('Error deleting user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFormSuccess = () => {
    setIsEditFormOpen(false);
    setIsCreateFormOpen(false);
    fetchProfiles();
  };

  const canCreateUsers = currentUserRole === 'administrator';
  const canEditUsers = currentUserRole === 'administrator';
  const canDeleteUsers = currentUserRole === 'administrator';

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        {canCreateUsers && (
          <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <UserCreateForm onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select onValueChange={setFilterRole} defaultValue={filterRole}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
            <SelectItem value="administrator">Administrator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No user profiles found.</p>
        ) : (
          profiles.map((profile) => (
            <Card key={profile.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {profile.first_name} {profile.last_name}
                  <div className="flex space-x-2">
                    {profile.role === 'client' && (
                      <Button variant="ghost" size="icon" onClick={() => handleViewClientDetails(profile.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {canEditUsers && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditProfileClick(profile)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteUsers && profile.id !== session?.user?.id && ( // Prevent deleting self
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(profile.id, profile.email)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Email: <span className="font-medium">{profile.email}</span></p>
                  <p>Role: <span className="font-medium capitalize">{profile.role}</span></p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          {editingProfile && <ProfileForm initialData={editingProfile} onSuccess={handleFormSuccess} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;