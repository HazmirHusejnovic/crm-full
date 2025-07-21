import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form'; // Use useFormContext for nested forms
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form, // Keep Form for context, but individual fields use FormField
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

export const invoiceItemFormSchema = z.object({
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
  onRemove: (index: number) => void;
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({ index, onRemove }) => {
  const { supabase } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState<number>(0.17); // Default fallback
  const { control, setValue, trigger, getValues } = useFormContext(); // Get control from parent context

  useEffect(() => {
    const fetchSettingsAndServices = async () => {
      // Fetch default VAT rate
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('default_vat_rate')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (settingsError) {
        console.error('Failed to load default VAT rate from settings:', settingsError.message);
        // Fallback to hardcoded default if settings not found
      } else if (settingsData) {
        setDefaultVatRate(settingsData.default_vat_rate);
      }

      // Fetch services
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, default_price, vat_rate');

      if (error) {
        toast.error('Failed to load services: ' + error.message);
      } else {
        setServices(data);
      }
    };
    fetchSettingsAndServices();
  }, [supabase]);

  // Set default VAT rate for new items if it changes
  useEffect(() => {
    const currentVatRate = getValues(`items.${index}.vat_rate`);
    // Only set if it's a new item (no service_id selected yet) and current VAT is 0 or default
    if (!getValues(`items.${index}.service_id`) && (currentVatRate === 0 || currentVatRate === 0.17)) {
      setValue(`items.${index}.vat_rate`, defaultVatRate);
    }
  }, [defaultVatRate, index, setValue, getValues]);


  const handleServiceChange = (serviceId: string) => {
    if (serviceId === 'custom') {
      setValue(`items.${index}.service_id`, null);
      setValue(`items.${index}.description`, '');
      setValue(`items.${index}.quantity`, 1);
      setValue(`items.${index}.unit_price`, 0);
      setValue(`items.${index}.vat_rate`, defaultVatRate); // Use default VAT for custom
    } else {
      const selectedService = services.find(s => s.id === serviceId);
      if (selectedService) {
        setValue(`items.${index}.service_id`, selectedService.id);
        setValue(`items.${index}.description`, selectedService.name || '');
        setValue(`items.${index}.unit_price`, selectedService.default_price || 0);
        setValue(`items.${index}.vat_rate`, selectedService.vat_rate || 0);
        setValue(`items.${index}.quantity`, 1);
      }
    }
    // Trigger validation for the updated fields
    trigger([
      `items.${index}.service_id`,
      `items.${index}.description`,
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.vat_rate`,
    ]);
  };

  return (
    <div className="border p-4 rounded-md space-y-3 bg-muted/20">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <FormField
        control={control}
        name={`items.${index}.service_id`}
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
        control={control}
        name={`items.${index}.description`}
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
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.unit_price`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.vat_rate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
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