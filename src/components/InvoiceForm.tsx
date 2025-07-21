import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form'; // Import FormProvider
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import InvoiceItemForm, { InvoiceItemFormValues, invoiceItemFormSchema } from './InvoiceItemForm'; // Import invoiceItemFormSchema
import { format } from 'date-fns';

const invoiceFormSchema = z.object({
  invoice_number: z.string().min(1, { message: 'Invoice number is required.' }),
  client_id: z.string().uuid({ message: 'Client is required.' }),
  issue_date: z.string().min(1, { message: 'Issue date is required.' }),
  due_date: z.string().min(1, { message: 'Due date is required.' }),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
  items: z.array(invoiceItemFormSchema).min(1, { message: 'At least one invoice item is required.' }), // Use the schema here
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  initialData?: InvoiceFormValues & { id?: string; created_by?: string };
  onSuccess?: () => void;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [clients, setClients] = useState<Profile[]>([]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_number: initialData?.invoice_number || '',
      client_id: initialData?.client_id || '',
      issue_date: initialData?.issue_date ? format(new Date(initialData.issue_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: initialData?.due_date ? format(new Date(initialData.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      status: initialData?.status || 'draft',
      items: initialData?.items || [{ description: '', quantity: 1, unit_price: 0, vat_rate: 0, service_id: null }], // Ensure service_id is initialized
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'client');

      if (error) {
        toast.error('Failed to load clients: ' + error.message);
      } else {
        const clientsWithEmails = await Promise.all(data.map(async (profile: any) => {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('users(email)')
            .eq('id', profile.id)
            .single();

          if (userError) {
            console.error('Error fetching email for client profile:', profile.id, userError.message);
            return { ...profile, email: 'Error fetching email' };
          } else {
            return { ...profile, email: userData?.users?.email || 'N/A' };
          }
        }));
        setClients(clientsWithEmails as Profile[]);
      }
    };
    fetchClients();
  }, [supabase]);

  const calculateItemTotal = (item: InvoiceItemFormValues) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const vatRate = item.vat_rate || 0;
    return (quantity * unitPrice * (1 + vatRate));
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    // Validate items before proceeding
    const itemValidationResults = await Promise.all(values.items.map(item => invoiceItemFormSchema.safeParseAsync(item)));
    const invalidItems = itemValidationResults.filter(result => !result.success);

    if (invalidItems.length > 0) {
      toast.error('Please correct errors in invoice items.');
      console.error('Invalid items:', invalidItems.map(item => (item as any).error.errors)); // Log detailed errors
      return;
    }

    const totalAmount = values.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

    const invoiceData = {
      invoice_number: values.invoice_number,
      client_id: values.client_id,
      issue_date: new Date(values.issue_date).toISOString(),
      due_date: new Date(values.due_date).toISOString(),
      total_amount: totalAmount,
      status: values.status,
      created_by: initialData?.created_by || session.user.id,
    };

    let invoiceError = null;
    let invoiceId = initialData?.id;

    if (initialData?.id) {
      // Update existing invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', initialData.id);
      invoiceError = updateError;
    } else {
      // Create new invoice
      const { data, error: insertError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select('id')
        .single();
      invoiceError = insertError;
      if (data) {
        invoiceId = data.id;
      }
    }

    if (invoiceError) {
      toast.error('Failed to save invoice: ' + invoiceError.message);
      return;
    }

    // Handle invoice items
    if (invoiceId) {
      // First, delete existing items for this invoice if updating
      if (initialData?.id) {
        const { error: deleteItemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);
        if (deleteItemsError) {
          toast.error('Failed to clear existing invoice items: ' + deleteItemsError.message);
          return;
        }
      }

      // Then, insert all current items
      const itemsToInsert = values.items.map(item => ({
        ...item,
        invoice_id: invoiceId,
        total: calculateItemTotal(item),
        service_id: item.service_id === 'custom' ? null : item.service_id,
      }));

      const { error: insertItemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        toast.error('Failed to save invoice items: ' + insertItemsError.message);
        return;
      }
    }

    toast.success('Invoice saved successfully!');
    form.reset();
    onSuccess?.();
  };

  return (
    <FormProvider {...form}> {/* Wrap the form with FormProvider */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="invoice_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl>
                <Input placeholder="INV-2024-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="issue_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-semibold mt-6 mb-3">Invoice Items</h3>
        <div className="space-y-4">
          {fields.map((item, index) => (
            <InvoiceItemForm
              key={item.id}
              index={index}
              onRemove={remove}
            />
          ))}
        </div>
        <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, unit_price: 0, vat_rate: 0, service_id: null })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>

        <Button type="submit" className="w-full">Save Invoice</Button>
      </form>
    </FormProvider>
  );
};

export default InvoiceForm;