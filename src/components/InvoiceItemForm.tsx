import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Trash2 } from 'lucide-react';

const invoiceItemFormSchema = z.object({
  service_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1, { message: 'Description is required.' }),
  quantity: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0.01, { message: 'Quantity must be greater than 0.' })
  ),
  unit_price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, { message: 'Unit price must be non-negative.' })
  ),
  vat_rate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0).max(1, { message: 'VAT rate must be between 0 and 1 (e.g., 0.17 for 17%).' })
  ),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>;

interface Service {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  vat_rate: number;
}

interface InvoiceItemFormProps {
  index: number;
  item: InvoiceItemFormValues & { id?: string };
  onUpdate: (index: number, data: InvoiceItemFormValues) => void;
  onRemove: (index: number) => void;
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({ index, item, onUpdate, onRemove }) => {
  const { supabase } = useSession();
  const [services, setServices] = useState<Service[]>([]);

  const form = useForm<InvoiceItemFormValues>({
    resolver: zodResolver(invoiceItemFormSchema),
    defaultValues: {
      ...item,
      service_id: item.service_id || 'custom', // Use 'custom' for no service linked
    },
  });

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, default_price, vat_rate');

      if (error) {
        toast.error('Failed to load services: ' + error.message);
      } else {
        setServices(data);
      }
    };
    fetchServices();
  }, [supabase]);

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        onUpdate(index, value as InvoiceItemFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, index, onUpdate]);

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === 'custom') {
      form.setValue('service_id', null);
      form.setValue('description', '');
      form.setValue('quantity', 1);
      form.setValue('unit_price', 0);
      form.setValue('vat_rate', 0);
    } else {
      const selectedService = services.find(s => s.id === serviceId);
      if (selectedService) {
        form.setValue('service_id', selectedService.id);
        form.setValue('description', selectedService.name || '');
        form.setValue('unit_price', selectedService.default_price || 0);
        form.setValue('vat_rate', selectedService.vat_rate || 0);
        form.setValue('quantity', 1); // Reset quantity to 1 when service is selected
      }
    }
  };

  return (
    <div className="border p-4 rounded-md space-y-3 bg-muted/20">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <FormField
        control={form.control}
        name="service_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Link to Service</FormLabel>
            <Select onValueChange={handleServiceChange} value={field.value || 'custom'}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service or custom item" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="custom">Custom Item</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
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
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Item description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="1.00" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vat_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Rate</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default InvoiceItemForm;