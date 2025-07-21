import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TicketForm from '@/components/TicketForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePermissions } from '@/hooks/usePermissions'; // Import usePermissions

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  created_by: string;
  linked_task_id: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // For assigned_to profile
  creator_profile: { first_name: string | null; last_name: string | null } | null; // For created_by profile
  tasks: { title: string | null } | null; // For linked_task
}

interface AppSettings {
  module_permissions: Record<string, Record<string, string[]>> | null;
}

const TicketsPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null); // State for app settings

  // Pozivanje usePermissions hooka na vrhu komponente
  const { canViewModule, canCreate, canEdit, canDelete } = usePermissions(appSettings, currentUserRole as 'client' | 'worker' | 'administrator');

  const fetchTickets = async () => {
    setLoading(true);
    let currentRole: string | null = null;
    let currentSettings: AppSettings | null = null;

    if (!session) {
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
    if (!canViewModule('tickets')) { // Koristimo canViewModule direktno
      setLoading(false);
      return;
    }

    let query = supabase
      .from('tickets')
      .select(`
        id,
        subject,
        description,
        status,
        priority,
        assigned_to,
        created_by,
        linked_task_id,
        created_at,
        profiles!tickets_assigned_to_fkey(first_name, last_name),
        creator_profile:profiles!tickets_created_by_fkey(first_name, last_name),
        tasks(title)
      `);

    if (searchTerm) {
      query = query.ilike('subject', `%${searchTerm}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tickets: ' + error.message);
    } else {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [supabase, searchTerm, filterStatus, session, appSettings, currentUserRole]); // Dodati appSettings i currentUserRole kao zavisnosti

  const handleNewTicketClick = () => {
    setEditingTicket(undefined);
    setIsFormOpen(true);
  };

  const handleEditTicketClick = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsFormOpen(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId);

    if (error) {
      toast.error('Failed to delete ticket: ' + error.message);
    } else {
      toast.success('Ticket deleted successfully!');
      fetchTickets();
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchTickets();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('tickets')) {
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
        <h1 className="text-3xl font-bold">Tickets</h1>
        {canCreate('tickets') && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewTicketClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTicket ? 'Edit Ticket' : 'Create New Ticket'}</DialogTitle>
              </DialogHeader>
              <TicketForm initialData={editingTicket} onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="reopened">Reopened</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No tickets found. Create one!</p>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {ticket.subject}
                  <div className="flex space-x-2">
                    {canEdit('tickets') && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditTicketClick(ticket)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete('tickets') && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTicket(ticket.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{ticket.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  <p>Status: <span className={`font-medium ${
                    ticket.status === 'resolved' || ticket.status === 'closed' ? 'text-green-600' :
                    ticket.status === 'in_progress' || ticket.status === 'reopened' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>{ticket.status.replace(/_/g, ' ')}</span></p>
                  <p>Priority: <span className={`font-medium ${
                    ticket.priority === 'urgent' ? 'text-red-600' :
                    ticket.priority === 'high' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>{ticket.priority}</span></p>
                  {ticket.assigned_to && (
                    <p>Assigned To: {ticket.profiles?.first_name} {ticket.profiles?.last_name}</p>
                  )}
                  <p>Created By: {ticket.creator_profile?.first_name} {ticket.creator_profile?.last_name}</p>
                  {ticket.linked_task_id && (
                    <p>Linked Task: {ticket.tasks?.title}</p>
                  )}
                  <p>Created At: {format(new Date(ticket.created_at), 'PPP p')}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketsPage;