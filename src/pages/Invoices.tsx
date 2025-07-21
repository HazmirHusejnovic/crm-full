import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvoiceForm from '@/components/InvoiceForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, Search, DollarSign, Printer } from 'lucide-react'; // Import Printer icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate

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
  profiles: { first_name: string | null; last_name: string | null; users: { email: string | null } | null } | null; // Client profile
  creator_profile: { first_name: string | null; last_name: string | null } | null; // Creator profile
  invoice_items: InvoiceItem[];
}

const InvoicesPage: React.FC = () => {
  const { supabase, session } = useSession();
  const navigate = useNavigate(); // Initialize useNavigate
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchInvoices = async () => {
    setLoading(true);
    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_id,
        issue_date,
        due_date,
        total_amount,
        status,
        created_by,
        created_at,
        profiles!invoices_client_id_fkey(first_name, last_name, users(email)),
        creator_profile:profiles!invoices_created_by_fkey(first_name, last_name),
        invoice_items(
          id,
          description,
          quantity,
          unit_price,
          vat_rate,
          total,
          service_id,
          services(name)
        )
      `);

    if (searchTerm) {
      query = query.ilike('invoice_number', `%${searchTerm}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load invoices: ' + error.message);
    } else {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [supabase, searchTerm, filterStatus]);

  const handleNewInvoiceClick = () => {
    setEditingInvoice(undefined);
    setIsFormOpen(true);
  };

  const handleEditInvoiceClick = (invoice: Invoice) => {
    setEditingInvoice({
      ...invoice,
      issue_date: format(new Date(invoice.issue_date), 'yyyy-MM-dd'),
      due_date: format(new Date(invoice.due_date), 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  const handleViewPrintable = (invoiceId: string) => {
    navigate(`/invoices/print/${invoiceId}`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice and all its items?')) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      toast.error('Failed to delete invoice: ' + error.message);
    } else {
      toast.success('Invoice deleted successfully!');
      fetchInvoices();
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchInvoices();
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
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewInvoiceClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            </DialogHeader>
            <InvoiceForm initialData={editingInvoice} onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditInvoiceClick(invoice)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteInvoice(invoice.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Client: <span className="font-medium">{invoice.profiles?.first_name} {invoice.profiles?.last_name} ({invoice.profiles?.users?.email})</span></p>
                  <p>Issue Date: <span className="font-medium">{format(new Date(invoice.issue_date), 'PPP')}</span></p>
                  <p>Due Date: <span className="font-medium">{format(new Date(invoice.due_date), 'PPP')}</span></p>
                  <p>Total: <span className="font-medium flex items-center"><DollarSign className="h-3 w-3 mr-1" />{invoice.total_amount.toFixed(2)}</span></p>
                  <p>Status: <span className={`font-medium capitalize ${getStatusColor(invoice.status)}`}>{invoice.status}</span></p>
                  <p>Created By: <span className="font-medium">{invoice.creator_profile?.first_name} {invoice.creator_profile?.last_name}</span></p>
                  <p className="mt-2 font-semibold">Items:</p>
                  <ul className="list-disc list-inside text-xs ml-2">
                    {invoice.invoice_items.map(item => (
                      <li key={item.id}>
                        {item.description} ({item.quantity} x {item.unit_price.toFixed(2)}) - Total: {item.total.toFixed(2)}
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