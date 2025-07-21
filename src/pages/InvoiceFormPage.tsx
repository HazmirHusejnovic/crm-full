import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import InvoiceForm from '@/components/InvoiceForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
// Removed MainLayout import as it's already provided by the router

// Define the Invoice type based on what InvoiceForm expects as initialData
interface InvoiceFormData {
  id?: string;
  invoice_number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_by?: string; // Optional for new invoices, required for existing
  items: Array<{
    id?: string; // For existing items
    service_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }>;
}

const InvoiceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase, session } = useSession();
  const [initialData, setInitialData] = useState<InvoiceFormData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (id) {
        setLoading(true);
        const { data, error: fetchError } = await supabase
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
            invoice_items(
              id,
              service_id,
              description,
              quantity,
              unit_price,
              vat_rate
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) {
          toast.error('Failed to load invoice for editing: ' + fetchError.message);
          setError('Failed to load invoice for editing.');
          setLoading(false);
          return;
        }

        if (data) {
          setInitialData({
            id: data.id,
            invoice_number: data.invoice_number,
            client_id: data.client_id,
            issue_date: data.issue_date,
            due_date: data.due_date,
            status: data.status,
            created_by: data.created_by,
            items: data.invoice_items.map(item => ({
              id: item.id,
              service_id: item.service_id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              vat_rate: item.vat_rate,
            })),
          });
        }
      }
      setLoading(false);
    };

    fetchInvoiceData();
  }, [id, supabase]);

  const handleSuccess = () => {
    toast.success(id ? 'Invoice updated successfully!' : 'Invoice created successfully!');
    navigate('/invoices'); // Navigate back to the invoices list
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => navigate('/invoices')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/invoices')} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <h1 className="text-3xl font-bold">{id ? 'Edit Invoice' : 'Create New Invoice'}</h1>
      </div>
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>{id ? 'Edit Invoice Details' : 'Enter New Invoice Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceForm initialData={initialData} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceFormPage;