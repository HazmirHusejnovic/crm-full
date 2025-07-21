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
  currency_id: z.string().uuid({ message: 'Currency is required.' }), // New field
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
  default_currency_id: string | null;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

interface ExchangeRate {
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [clients, setClients] = useState<Profile[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [appDefaultCurrencyId, setAppDefaultCurrencyId] = useState<string | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_number: initialData?.invoice_number || '',
      client_id: initialData?.client_id || '',
      issue_date: initialData?.issue_date ? format(new Date(initialData.issue_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: initialData?.due_date ? format(new Date(initialData.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      status: initialData?.status || 'draft',
      currency_id: initialData?.currency_id || '', // Initialize new field
      items: initialData?.items || [{ description: '', quantity: 1, unit_price: 0, vat_rate: 0, service_id: null }], // Ensure service_id is initialized
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch app settings for default currency
      const { data: appSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('default_currency_id')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Failed to load app settings:', settingsError.message);
        toast.error('Failed to load app settings.');
      } else {
        setAppDefaultCurrencyId(appSettings?.default_currency_id || null);
        if (!initialData?.currency_id) { // Set initial selected currency to app default if not already set
          form.setValue('currency_id', appSettings?.default_currency_id || '');
        }
      }

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles_with_auth_emails')
        .select('id, first_name, last_name, email, default_currency_id')
        .eq('role', 'client');

      if (clientsError) {
        toast.error('Failed to load clients: ' + clientsError.message);
      } else {
        setClients(clientsData as Profile[]);
      }

      // Fetch currencies
      const { data: currenciesData, error: currenciesError } = await supabase
        .from('currencies')
        .select('id, code, name, symbol')
        .order('code', { ascending: true });
      if (currenciesError) {
        toast.error('Failed to load currencies: ' + currenciesError.message);
      } else {
        setCurrencies(currenciesData);
      }

      // Fetch exchange rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('*');
      if (ratesError) {
        toast.error('Failed to load exchange rates: ' + ratesError.message);
      } else {
        setExchangeRates(ratesData);
      }
    };
    fetchData();
  }, [supabase, initialData, form]);

  // Update currency_id when client_id changes, if client has a default currency
  useEffect(() => {
    const selectedClient = clients.find(client => client.id === form.watch('client_id'));
    if (selectedClient?.default_currency_id) {
      form.setValue('currency_id', selectedClient.default_currency_id);
    } else if (!initialData?.currency_id) {
      form.setValue('currency_id', appDefaultCurrencyId || ''); // Fallback to app default
    }
  }, [form.watch('client_id'), clients, appDefaultCurrencyId, form, initialData]);


  const getExchangeRate = (fromCurrencyId: string, toCurrencyId: string): number => {
    if (fromCurrencyId === toCurrencyId) return 1;
    const rate = exchangeRates.find(
      (r) => r.from_currency_id === fromCurrencyId && r.to_currency_id === toCurrencyId
    );
    return rate ? rate.rate : 0; // Return 0 if no direct rate found, handle error appropriately
  };

  const convertPrice = (price: number, productCurrencyId: string, targetCurrencyId: string): number => {
    if (!productCurrencyId || !targetCurrencyId || productCurrencyId === targetCurrencyId) {
      return price;
    }

    const rate = getExchangeRate(productCurrencyId, targetCurrencyId);
    if (rate === 0) {
      toast.warning(`No exchange rate found from product's currency to selected invoice currency. Using original price.`);
      return price; // Fallback to original price if no rate
    }
    return price * rate;
  };

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
      currency_id: values.currency_id, // Save the selected currency with the invoice
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
        // Convert unit_price to the invoice's selected currency if it came from a service
        unit_price: item.service_id
          ? convertPrice(item.unit_price, appDefaultCurrencyId || '', values.currency_id)
          : item.unit_price, // Custom items are assumed to be in the invoice's currency
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

  const currentInvoiceCurrencyId = form.watch('currency_id');
  const currentCurrencySymbol = getCurrencySymbol(currentInvoiceCurrencyId);

  function getCurrencySymbol(currencyId: string | null): string {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : '$';
  }

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
        <FormField
          control={form.control}
          name="currency_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Currency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.name} ({currency.symbol})
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
              invoiceCurrencyId={currentInvoiceCurrencyId} // Pass invoice currency
              appDefaultCurrencyId={appDefaultCurrencyId} // Pass app default currency
              exchangeRates={exchangeRates} // Pass exchange rates
              currencies={currencies} // Pass currencies for symbol lookup
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