import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'; // Import Input for search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select for filter
import ProfileForm from '@/components/ProfileForm';
import UserCreateForm from '@/components/UserCreateForm'; // Import the new UserCreateForm
import { toast } from 'sonner';
import { Edit, Search, Eye, UserPlus } from 'lucide-react'; // Import UserPlus icon
import LoadingSpinner from '@/components/LoadingSpinner'; // Import LoadingSpinner
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string; // Assuming email can be fetched or joined from auth.users
}

const UserManagementPage: React.FC = () => {
  const { supabase, session } = useSession();
  const navigate = useNavigate(); // Initialize useNavigate
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false); // Renamed for clarity
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false); // New state for create form
  const [editingProfile, setEditingProfile] = useState<Profile | undefined>(undefined);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [filterRole, setFilterRole] = useState<string>('all'); // New state for role filter

  const fetchProfiles = async () => {
    setLoading(true);
    // Fetch profiles and join with auth.users to get email
    let query = supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        auth_users:auth.users(email)
      `);

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,auth_users.email.ilike.%${searchTerm}%`);
    }

    if (filterRole !== 'all') {
      query = query.eq('role', filterRole);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load profiles: ' + error.message);
    } else {
      const formattedProfiles: Profile[] = data.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        role: p.role,
        email: p.auth_users?.email || 'N/A',
      }));
      setProfiles(formattedProfiles);
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
        } else {
          setCurrentUserRole(data.role);
        }
      };
      fetchUserRole();
      fetchProfiles(); // Initial fetch
    }
  }, [supabase, session, searchTerm, filterRole]); // Re-fetch when search term or filter role changes

  const handleEditProfileClick = (profile: Profile) => {
    setEditingProfile(profile);
    setIsEditFormOpen(true);
  };

  const handleViewClientDetails = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleFormSuccess = () => {
    setIsEditFormOpen(false);
    setIsCreateFormOpen(false);
    fetchProfiles();
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditProfileClick(profile)}>
                      <Edit className="h-4 w-4" />
                    </Button>
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