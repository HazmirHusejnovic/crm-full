import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { ArrowLeft, ListTodo, Ticket, ReceiptText, Mail, Phone } from 'lucide-react';

interface ClientProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
}

interface ClientTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // Assigned to
  creator_profile: { first_name: string | null; last_name: string | null } | null; // Created by
}

interface ClientTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  assigned_to: string | null;
  created_by: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // Assigned to
  creator_profile: { first_name: string | null; last_name: string | null } | null; // Created by
  tasks: { title: string | null } | null; // For linked_task
}

interface ClientInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  created_by: string;
  creator_profile: { first_name: string | null; last_name: string | null } | null; // Creator profile
}

const ClientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase, session } = useSession();
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [clientTickets, setClientTickets] = useState<ClientTicket[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id || !id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      let hasError = false;

      // Fetch current user's role for access control
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userRoleError) {
        console.error('Error fetching current user role:', userRoleError.message);
        toast.error('Failed to fetch your user role.');
        hasError = true;
      } else {
        setCurrentUserRole(userRoleData.role);
        if (userRoleData.role !== 'administrator') {
          setLoading(false);
          return; // Prevent further fetching if not admin
        }
      }

      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          auth_users:auth.users(email)
        `)
        .eq('id', id)
        .single();

      if (profileError) {
        toast.error('Failed to load client profile: ' + profileError.message);
        hasError = true;
      } else if (profileData) {
        setClientProfile({
          id: profileData.id,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          role: profileData.role,
          email: profileData.auth_users?.email || 'N/A',
        });
      }

      // Fetch client's tasks (created by or assigned to)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date,
          created_at,
          assigned_to,
          created_by,
          profiles!tasks_assigned_to_fkey(first_name, last_name),
          creator_profile:profiles!tasks_created_by_fkey(first_name, last_name)
        `)
        .or(`created_by.eq.${id},assigned_to.eq.${id}`)
        .order('created_at', { ascending: false });

      if (tasksError) {
        toast.error('Failed to load client tasks: ' + tasksError.message);
        hasError = true;
      } else {
        setClientTasks(tasksData as ClientTask[]);
      }

      // Fetch client's tickets (created by or assigned to)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          subject,
          status,
          priority,
          created_at,
          assigned_to,
          created_by,
          profiles!tickets_assigned_to_fkey(first_name, last_name),
          creator_profile:profiles!tickets_created_by_fkey(first_name, last_name),
          tasks(title)
        `)
        .or(`created_by.eq.${id},assigned_to.eq.${id}`)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        toast.error('Failed to load client tickets: ' + ticketsError.message);
        hasError = true;
      } else {
        setClientTickets(ticketsData as ClientTicket[]);
      }

      // Fetch client's invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          total_amount,
          status,
          created_at,
          created_by,
          creator_profile:profiles!invoices_created_by_fkey(first_name, last_name)
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (invoicesError) {
        toast.error('Failed to load client invoices: ' + invoicesError.message);
        hasError = true;
      } else {
        setClientInvoices(invoicesData as ClientInvoice[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, supabase, session]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'resolved':
      case 'paid':
        return 'text-green-600';
      case 'in_progress':
      case 'sent':
      case 'reopened':
        return 'text-blue-600';
      case 'pending':
      case 'open':
      case 'draft':
        return 'text-yellow-600';
      case 'cancelled':
      case 'closed':
        return 'text-gray-500';
      case 'overdue':
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
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

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client Not Found</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">The requested client profile could not be loaded.</p>
          <Button onClick={() => navigate('/users')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to User Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => navigate('/users')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to User Management
        </Button>
        <h1 className="text-3xl font-bold">
          Client Details: {clientProfile.first_name} {clientProfile.last_name}
        </h1>
        <div></div> {/* Placeholder for alignment */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold">{clientProfile.first_name} {clientProfile.last_name}</p>
            <p className="text-sm text-muted-foreground flex items-center">
              <Mail className="h-4 w-4 mr-2" /> {clientProfile.email}
            </p>
            <p className="text-sm text-muted-foreground">Role: <span className="capitalize">{clientProfile.role}</span></p>
            {/* Add more profile details here if available, e.g., phone, address */}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientTasks.length}</div>
                  <p className="text-xs text-muted-foreground">Total tasks associated</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tickets</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientTickets.length}</div>
                  <p className="text-xs text-muted-foreground">Total tickets associated</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListTodo className="mr-2 h-5 w-5" /> Client Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientTasks.length === 0 ? (
              <p className="text-center text-gray-500">No tasks found for this client.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientTasks.map((task) => (
                  <Card key={task.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Status: <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status.replace(/_/g, ' ')}</span></p>
                      {task.assigned_to && (
                        <p>Assigned To: {task.profiles?.first_name} {task.profiles?.last_name}</p>
                      )}
                      <p>Created By: {task.creator_profile?.first_name} {task.creator_profile?.last_name}</p>
                      {task.due_date && (
                        <p>Due Date: {format(new Date(task.due_date), 'PPP')}</p>
                      )}
                      <p>Created At: {format(new Date(task.created_at), 'PPP')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ticket className="mr-2 h-5 w-5" /> Client Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientTickets.length === 0 ? (
              <p className="text-center text-gray-500">No tickets found for this client.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientTickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Status: <span className={`font-medium ${getStatusColor(ticket.status)}`}>{ticket.status.replace(/_/g, ' ')}</span></p>
                      <p>Priority: <span className={`font-medium ${getStatusColor(ticket.priority)}`}>{ticket.priority}</span></p>
                      {ticket.assigned_to && (
                        <p>Assigned To: {ticket.profiles?.first_name} {ticket.profiles?.last_name}</p>
                      )}
                      <p>Created By: {ticket.creator_profile?.first_name} {ticket.creator_profile?.last_name}</p>
                      {ticket.linked_task_id && (
                        <p>Linked Task: {ticket.tasks?.title}</p>
                      )}
                      <p>Created At: {format(new Date(ticket.created_at), 'PPP')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ReceiptText className="mr-2 h-5 w-5" /> Client Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientInvoices.length === 0 ? (
              <p className="text-center text-gray-500">No invoices found for this client.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientInvoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Total: <span className="font-medium">${invoice.total_amount.toFixed(2)}</span></p>
                      <p>Status: <span className={`font-medium capitalize ${getStatusColor(invoice.status)}`}>{invoice.status}</span></p>
                      <p>Issue Date: {format(new Date(invoice.issue_date), 'PPP')}</p>
                      <p>Due Date: {format(new Date(invoice.due_date), 'PPP')}</p>
                      <p>Created By: {invoice.creator_profile?.first_name} {invoice.creator_profile?.last_name}</p>
                      <p>Created At: {format(new Date(invoice.created_at), 'PPP')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDetailsPage;