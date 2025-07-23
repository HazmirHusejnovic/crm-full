import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  currency_id: string | null; // New field
  invoice_items: InvoiceItem[];
  client_profile: ClientProfileDetails | null; // Added for separate fetch
  creator_profile_details: CreatorProfileDetails | null; // Added for separate fetch
  currency: CurrencyDetails | null; // Joined currency details
}

const PrintableInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        toast.error('Invoice ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get(`/invoices/${id}/details`); // Pretpostavljena ruta za detalje fakture
        setInvoice(data as Invoice);
      } catch (error: any) {
        toast.error('Failed to load invoice: ' + (error.response?.data?.message || error.message));
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (!loading && invoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, invoice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invoice Not Found</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">The requested invoice could not be loaded.</p>
          <Button onClick={() => navigate('/invoices')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

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

  const currentCurrencySymbol = invoice.currency?.symbol || '$';

  return (
    <div className="container mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg my-8 print:shadow-none print:my-0 print:p-0">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Button onClick={() => navigate('/invoices')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Invoice</h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">#{invoice.invoice_number}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Billed To:</h2>
          <p className="text-gray-700 dark:text-gray-300">{invoice.client_profile?.first_name} {invoice.client_profile?.last_name}</p>
          <p className="text-gray-700 dark:text-gray-300">{invoice.client_profile?.email}</p>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Invoice Details:</h2>
          <p className="text-gray-700 dark:text-gray-300">Issue Date: {format(new Date(invoice.issue_date), 'PPP')}</p>
          <p className="text-gray-700 dark:text-gray-300">Due Date: {format(new Date(invoice.due_date), 'PPP')}</p>
          <p className="text-gray-700 dark:text-gray-300">Status: <span className={`font-semibold capitalize ${getStatusColor(invoice.status)}`}>{invoice.status}</span></p>
          <p className="text-gray-700 dark:text-gray-300">Created By: {invoice.creator_profile_details?.first_name} {invoice.creator_profile_details?.last_name}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Items:</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Description</th>
                <th className="py-3 px-6 text-center">Qty</th>
                <th className="py-3 px-6 text-right">Unit Price</th>
                <th className="py-3 px-6 text-right">VAT Rate</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-300 text-sm font-light">
              {invoice.invoice_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-6 text-left">{item.description}</td>
                  <td className="py-3 px-6 text-center">{item.quantity}</td>
                  <td className="py-3 px-6 text-right">{currentCurrencySymbol}{item.unit_price.toFixed(2)}</td>
                  <td className="py-3 px-6 text-right">{(item.vat_rate * 100).toFixed(2)}%</td>
                  <td className="py-3 px-6 text-right">{currentCurrencySymbol}{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full md:w-1/2 lg:w-1/3">
          <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">Total Amount:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              {currentCurrencySymbol}{invoice.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};

export default PrintableInvoice;