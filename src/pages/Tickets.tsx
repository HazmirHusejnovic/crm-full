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
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext
import { useTranslation } from 'react-i18next'; // Import useTranslation

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

const TicketsPage: React.FC = () => {
  const { supabase, session } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from context
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Separate loading for data fetching
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { t } = useTranslation(); // Initialize useTranslation
  // usePermissions now gets its dependencies from useAppContext internally
  const { canViewModule, canCreate, canEdit, canDelete } = usePermissions();

  const fetchTickets = async () => {
    setLoadingData(true); // Start loading for tickets specific data

    // Provjera dozvola se sada radi preko `canViewModule` koji je definisan na vrhu komponente
    if (!canViewModule('tickets')) {
      setLoadingData(false); // Not authorized, stop loading page data
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
    setLoadingData(false);
  };

  useEffect(() => {
    // Only proceed if global app settings and user role are loaded and available
    if (loadingAppSettings || !appSettings || !currentUserRole) {
      setLoadingData(true); // Keep local loading state true while global context is loading
      return;
    }
    fetchTickets();
  }, [supabase, searchTerm, filterStatus, appSettings, currentUserRole, loadingAppSettings, canViewModule]); // Dependencies now include context values and canViewModule

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

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
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
          <h1 className="text-2xl font-bold mb-4">{t('access_denied_title')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('access_denied_message')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('tickets')}</h1>
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
          <p className="col-span-full text-center text-gray-500">{t('no_tickets_found')}</p>
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