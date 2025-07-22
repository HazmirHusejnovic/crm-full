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
import { PlusCircle, Edit, Trash2, Search, FileText, Users, CalendarClock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_user_id: string | null; // Renamed
  assigned_group_id: string | null; // New
  created_by: string;
  linked_task_id: string | null;
  linked_invoice_id: string | null; // New
  sla_due_at: string | null; // New
  sla_status: 'met' | 'breached' | 'warning' | null; // New
  attachments: string[]; // New (assuming array of URLs)
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // For assigned_user_id profile
  creator_profile: { first_name: string | null; last_name: string | null } | null; // For created_by profile
  tasks: { title: string | null } | null; // For linked_task
  invoices: { invoice_number: string | null } | null; // For linked_invoice_id
  ticket_groups: { name: string | null } | null; // For assigned_group_id
}

interface TicketGroup {
  id: string;
  name: string;
}

const TicketsPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGroupId, setFilterGroupId] = useState<string>('all'); // New filter
  const [filterSlaStatus, setFilterSlaStatus] = useState<string>('all'); // New filter
  const [ticketGroups, setTicketGroups] = useState<TicketGroup[]>([]); // For filter dropdown
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from('tickets')
      .select(`
        id,
        subject,
        description,
        status,
        priority,
        assigned_user_id,
        assigned_group_id,
        created_by,
        linked_task_id,
        linked_invoice_id,
        sla_due_at,
        sla_status,
        attachments,
        created_at,
        profiles!tickets_assigned_user_id_fkey(first_name, last_name),
        creator_profile:profiles!tickets_created_by_fkey(first_name, last_name),
        tasks(title),
        invoices(invoice_number),
        ticket_groups(name)
      `);

    if (searchTerm) {
      query = query.ilike('subject', `%${searchTerm}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterGroupId !== 'all') {
      query = query.eq('assigned_group_id', filterGroupId);
    }

    if (filterSlaStatus !== 'all') {
      query = query.eq('sla_status', filterSlaStatus);
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
    if (session) {
      const fetchUserRoleAndGroups = async () => {
        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (roleError) {
          console.error('Error fetching user role:', roleError.message);
          toast.error('Failed to fetch your user role.');
        } else {
          setCurrentUserRole(roleData.role);
        }

        const { data: groupsData, error: groupsError } = await supabase
          .from('ticket_groups')
          .select('id, name')
          .order('name', { ascending: true });

        if (groupsError) {
          toast.error('Failed to load ticket groups for filter: ' + groupsError.message);
        } else {
          setTicketGroups(groupsData);
        }
      };
      fetchUserRoleAndGroups();
    }
    fetchTickets();
  }, [supabase, searchTerm, filterStatus, filterGroupId, filterSlaStatus, session]);

  const handleNewTicketClick = () => {
    setEditingTicket(undefined);
    setIsFormOpen(true);
  };

  const handleEditTicketClick = (ticket: Ticket) => {
    setEditingTicket({
      ...ticket,
      sla_due_at: ticket.sla_due_at ? format(new Date(ticket.sla_due_at), 'yyyy-MM-dd') : '',
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'text-green-600';
      case 'in_progress':
      case 'reopened':
        return 'text-blue-600';
      case 'open':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getSlaStatusColor = (slaStatus: string | null) => {
    switch (slaStatus) {
      case 'met': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'breached': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const canManageTickets = currentUserRole === 'worker' || currentUserRole === 'administrator';
  const canDeleteTickets = currentUserRole === 'administrator';
  const canCreateTickets = currentUserRole === 'client' || currentUserRole === 'worker' || currentUserRole === 'administrator';


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        {canCreateTickets && (
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
        <Select onValueChange={setFilterGroupId} defaultValue={filterGroupId}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="null-value">No Group</SelectItem>
            {ticketGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setFilterSlaStatus} defaultValue={filterSlaStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by SLA Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SLA Statuses</SelectItem>
            <SelectItem value="met">Met</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="breached">Breached</SelectItem>
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
                    {canManageTickets && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditTicketClick(ticket)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteTickets && (
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
                  <p>Status: <span className={`font-medium ${getStatusColor(ticket.status)}`}>{ticket.status.replace(/_/g, ' ')}</span></p>
                  <p>Priority: <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span></p>
                  {ticket.assigned_user_id && (
                    <p>Assigned To: {ticket.profiles?.first_name} {ticket.profiles?.last_name}</p>
                  )}
                  {ticket.assigned_group_id && (
                    <p>Assigned Group: {ticket.ticket_groups?.name}</p>
                  )}
                  <p>Created By: {ticket.creator_profile?.first_name} {ticket.creator_profile?.last_name}</p>
                  {ticket.linked_task_id && (
                    <p>Linked Task: {ticket.tasks?.title}</p>
                  )}
                  {ticket.linked_invoice_id && (
                    <p>Linked Invoice: {ticket.invoices?.invoice_number}</p>
                  )}
                  {ticket.sla_due_at && (
                    <p>SLA Due: <span className={`font-medium ${getSlaStatusColor(ticket.sla_status)}`}>{format(new Date(ticket.sla_due_at), 'PPP')} ({ticket.sla_status})</span></p>
                  )}
                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <p className="flex items-center">
                      <FileText className="h-3 w-3 mr-1" /> Attachments: {ticket.attachments.length}
                    </p>
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