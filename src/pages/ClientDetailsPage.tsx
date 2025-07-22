import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { ArrowLeft, ListTodo, Ticket, ReceiptText, Mail, PlusCircle, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TaskForm from '@/components/TaskForm';
import TicketForm from '@/components/TicketForm';
import InvoiceForm from '@/components/InvoiceForm';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext';

interface ClientProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'client' | 'worker' | 'administrator';
  email: string;
  default_currency_id: string | null;
  default_currency: { code: string; symbol: string } | null;
}

interface ClientTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
  creator_profile: { first_name: string | null; last_name: string | null } | null;
}

interface ClientTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  assigned_to: string | null;
  created_by: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
  creator_profile: { first_name: string | null; last_name: string | null } | null;
  tasks: { title: string | null } | null;
}

interface CreatorProfileDetails {
  first_name: string | null;
  last_name: string | null;
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
  creator_profile_details: CreatorProfileDetails | null;
}

const ClientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase, session } = useSession();
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [clientTickets, setClientTickets] = useState<ClientTicket[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext();

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);

  const { canViewModule, canCreate } = usePermissions();

  const fetchData = async () => {
    setLoadingData(true);

    if (!session?.user?.id || !id) {
      setLoadingData(false);
      return;
    }

    // Wait for global app settings and user role to load from AppContext
    if (loadingAppSettings || !appSettings || !currentUserRole) {
      setLoadingData(true); // Keep local loading state true while global context is loading
      return;
    }

    // Now that global data is loaded, check permissions
    if (!canViewModule('users')) {
      setLoadingData(false);
      return;
    }

    let hasError = false;

    // Fetch client profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles_with_auth_emails')
      .select(`
          id,
          first_name,
          last_name,
          role,
          email,
          default_currency_id,
          currencies(code, symbol)
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
        email: profileData.email || 'N/A',
        default_currency_id: profileData.default_currency_id,
        default_currency: profileData.currencies,
      });
    }

    // Fetch client's tasks (created by or assigned to)
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(`
          id,
          title,
          description,
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
          description,
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
          created_by
        `)
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (invoicesError) {
      toast.error('Failed to load client invoices: ' + invoicesError.message);
      hasError = true;
    } else {
      const invoicesWithCreatorDetails = await Promise.all(invoicesData.map(async (invoice: any) => {
        let creatorProfileDetails: CreatorProfileDetails | null = null;
        if (invoice.created_by) {
          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', invoice.created_by)
            .single();
          if (creatorError) {
            console.error('Error fetching creator profile for invoice:', invoice.id, creatorError.message);
            creatorProfileDetails = { first_name: 'Error', last_name: 'Fetching' };
          } else {
            creatorProfileDetails = {
              first_name: creatorData.first_name,
              last_name: creatorData.last_name,
            };
          }
        }
        return { ...invoice, creator_profile_details: creatorProfileDetails };
      }));
      setClientInvoices(invoicesWithCreatorDetails as ClientInvoice[]);
    }

    setLoadingData(false);
  };

  useEffect(() => {
    // Only proceed if global app settings and user role are loaded and available
    if (loadingAppSettings || !appSettings || !currentUserRole) {
      setLoadingData(true); // Keep local loading state true while global context is loading
      return;
    }
    fetchData();
  }, [id, supabase, session, appSettings, currentUserRole, loadingAppSettings, canViewModule]);

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

  const handleFormSuccess = () => {
    setIsTaskFormOpen(false);
    setIsTicketFormOpen(false);
    setIsInvoiceFormOpen(false);
    fetchData(); // Re-fetch all data to update lists
  };

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('users')) {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
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
        <div className="flex space-x-2">
          {canCreate('tasks') && (
            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Task for {clientProfile.first_name} {clientProfile.last_name}</DialogTitle>
                </DialogHeader>
                <TaskForm
                  initialData={{
                    title: `Task for ${clientProfile.first_name} ${clientProfile.last_name}`,
                    description: `Related to client: ${clientProfile.first_name} ${clientProfile.last_name} (${clientProfile.email})`,
                    status: 'pending',
                    assigned_to: null,
                    due_date: '',
                  }}
                  onSuccess={handleFormSuccess}
                />
              </DialogContent>
            </Dialog>
          )}

          {canCreate('tickets') && (
            <Dialog open={isTicketFormOpen} onOpenChange={setIsTicketFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Ticket for {clientProfile.first_name} {clientProfile.last_name}</DialogTitle>
                </DialogHeader>
                <TicketForm
                  initialData={{
                    subject: `Ticket for ${clientProfile.first_name} ${clientProfile.last_name}`,
                    description: `Related to client: ${clientProfile.first_name} ${clientProfile.last_name} (${clientProfile.email})`,
                    status: 'open',
                    priority: 'medium',
                    assigned_to: null,
                    linked_task_id: null,
                  }}
                  onSuccess={handleFormSuccess}
                />
              </DialogContent>
            </Dialog>
          )}

          {canCreate('invoices') && (
            <Dialog open={isInvoiceFormOpen} onOpenChange={setIsInvoiceFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Create Invoice for {clientProfile.first_name} {clientProfile.last_name}</DialogTitle>
                </DialogHeader>
                <InvoiceForm
                  initialData={{
                    invoice_number: '',
                    client_id: id,
                    issue_date: format(new Date(), 'yyyy-MM-dd'),
                    due_date: format(new Date(), 'yyyy-MM-dd'),
                    status: 'draft',
                    items: [{ description: '', quantity: 1, unit_price: 0, vat_rate: 0, service_id: null }],
                  }}
                  onSuccess={handleFormSuccess}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
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
            {clientProfile.default_currency && (
              <p className="text-sm text-muted-foreground flex items-center">
                <DollarSign className="h-4 w-4 mr-2" /> Default Currency: {clientProfile.default_currency.name} ({clientProfile.default_currency.symbol})
              </p>
            )}
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
                      <p>Created At: {format(new Date(task.created_at), 'PPP p')}</p>
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
                      <p>Created At: {format(new Date(ticket.created_at), 'PPP p')}</p>
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
                      <p>Created By: {invoice.creator_profile_details?.first_name} {invoice.creator_profile_details?.last_name}</p>
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