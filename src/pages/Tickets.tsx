import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TicketForm from '@/components/TicketForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
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
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tickets: ' + error.message);
    } else {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [supabase]);

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
    return <div className="flex items-center justify-center min-h-screen">Loading tickets...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditTicketClick(ticket)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTicket(ticket.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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