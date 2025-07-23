import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, Search, Printer, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api'; // Import novog API klijenta

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
  service_id: string | null;
  services: { name: string } | null;
}

interface ClientProfileDetails {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface CreatorProfileDetails {
  first_name: string | null;
  last_name: string | null;
}

interface CurrencyDetails {
  id: string;
  code: string;
  symbol: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_by: string;
  created_at: string;
  currency_id: string | null;
  invoice_items: InvoiceItem[];
  client_profile: ClientProfileDetails | null;
  creator_profile_details: CreatorProfileDetails | null;
  currency: CurrencyDetails | null;
}

const InvoicesPage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) {
        params.invoice_number = searchTerm;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const { data } = await api.get('/invoices', { params }); // Pretpostavljena ruta

      // API bi trebao vratiti joined podatke, ali ako ne, možete ih dohvatiti ovdje
      const invoicesWithDetails = await Promise.all(data.map(async (invoice: any) => {
        let clientProfile: ClientProfileDetails | null = null;
        if (invoice.client_id) {
          const { data: clientData } = await api.get(`/profiles/${invoice.client_id}`); // Pretpostavljena ruta
          clientProfile = {
            id: clientData.id,
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            email: clientData.email || 'N/A',
          };
        }

        let creatorProfileDetails: CreatorProfileDetails | null = null;
        if (invoice.created_by) {
          const { data: creatorData } = await api.get(`/profiles/${invoice.created_by}`); // Pretpostavljena ruta
          creatorProfileDetails = {
            first_name: creatorData.first_name,
            last_name: creatorData.last_name,
          };
        }

        return {
          ...invoice,
          client_profile: clientProfile,
          creator_profile_details: creatorProfileDetails,
        };
      }));

      setInvoices(invoicesWithDetails as Invoice[]);
    } catch (error: any) {
      toast.error('Failed to load invoices: ' + (error.response?.data?.message || error.message));
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
    fetchInvoices();
  }, [searchTerm, filterStatus, session]);

  const handleNewInvoiceClick = () => {
    navigate('/invoices/new');
  };

  const handleEditInvoiceClick = (invoice: Invoice) => {
    navigate(`/invoices/edit/${invoice.id}`);
  };

  const handleViewPrintable = (invoiceId: string) => {
    navigate(`/invoices/print/${invoiceId}`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice and all its items?')) return;

    try {
      await api.delete(`/invoices/${invoiceId}`); // Pretpostavljena ruta
      toast.success('Invoice deleted successfully!');
      fetchInvoices();
    } catch (error: any) {
      toast.error('Failed to delete invoice: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      await api.put(`/invoices/${invoiceId}/status`, { status: newStatus }); // Pretpostavljena ruta
      toast.success(`Invoice status updated to "${newStatus}"!`);
      fetchInvoices(); // Re-fetch to update the list
    } catch (error: any) {
      toast.error('Failed to update invoice status: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'sent': return 'text-blue-600';
      case 'overdue': return 'text-red-600';
      case 'cancelled': return 'text-gray-500';
      case 'draft': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const canManageInvoices = currentUserRole === 'worker' || currentUserRole === 'administrator';
  const canDeleteInvoices = currentUserRole === 'administrator';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (currentUserRole !== 'worker' && currentUserRole !== 'administrator') {
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
        <h1 className="text-3xl font-bold">Invoices</h1>
        {canManageInvoices && (
          <Button onClick={handleNewInvoiceClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number..."
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No invoices found. Create one!</p>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {invoice.invoice_number}
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewPrintable(invoice.id)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canManageInvoices && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditInvoiceClick(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManageInvoices && invoice.status !== 'sent' && invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'sent')}>
                            Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {canManageInvoices && invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'paid')}>
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {canManageInvoices && invoice.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'cancelled')}>
                            Mark as Cancelled
                          </DropdownMenuItem>
                        )}
                        {canDeleteInvoices && (
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteInvoice(invoice.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Client: <span className="font-medium">{invoice.client_profile?.first_name} {invoice.client_profile?.last_name} ({invoice.client_profile?.email})</span></p>
                  <p>Issue Date: <span className="font-medium">{format(new Date(invoice.issue_date), 'PPP')}</span></p>
                  <p>Due Date: <span className="font-medium">{format(new Date(invoice.due_date), 'PPP')}</span></p>
                  <p>Total: <span className="font-medium flex items-center">{invoice.currency?.symbol}{invoice.total_amount.toFixed(2)}</span></p>
                  <p>Status: <span className={`font-medium capitalize ${getStatusColor(invoice.status)}`}>{invoice.status}</span></p>
                  <p>Created By: <span className="font-medium">{invoice.creator_profile_details?.first_name} {invoice.creator_profile_details?.last_name}</span></p>
                  <p className="mt-2 font-semibold">Items:</p>
                  <ul className="list-disc list-inside text-xs ml-2">
                    {invoice.invoice_items.map(item => (
                      <li key={item.id}>
                        {item.description} ({item.quantity} x {invoice.currency?.symbol}{item.unit_price.toFixed(2)}) - Total: {invoice.currency?.symbol}{item.total.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;