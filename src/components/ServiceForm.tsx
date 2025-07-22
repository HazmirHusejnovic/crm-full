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

const serviceFormSchema = z.object({
  name: z.string().min(1, { message: 'Service name is required.' }),
  description: z.string().optional(),
  category_id: z.string().uuid({ message: 'Category is required.' }),
  default_price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, { message: 'Price must be non-negative.' })
  ),
  duration_minutes: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, { message: 'Duration must be a non-negative integer.' })
  ).optional(),
  vat_rate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0).max(1, { message: 'VAT rate must be between 0 and 1 (e.g., 0.17 for 17%).' })
  ),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: ServiceFormValues & { id?: string };
  onSuccess?: () => void;
}

interface ServiceCategory {
  id: string;
  name: string;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState<number>(0.17); // Default fallback

  useEffect(() => {
    const fetchSettingsAndCategories = async () => {
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

      // Fetch categories
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name');

      if (error) {
        toast.error('Failed to load service categories: ' + error.message);
      } else {
        setCategories(data);
      }
    };

    fetchSettingsAndCategories();
  }, [supabase]);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category_id: initialData?.category_id || '',
      default_price: initialData?.default_price || 0,
      duration_minutes: initialData?.duration_minutes || 0,
      vat_rate: initialData?.vat_rate ?? defaultVatRate, // Use fetched default or initialData
    },
  });

  // Update form default value for vat_rate if defaultVatRate changes and it's a new service
  useEffect(() => {
    if (!initialData?.id && defaultVatRate !== form.getValues('vat_rate')) {
      form.setValue('vat_rate', defaultVatRate);
    }
  }, [defaultVatRate, initialData, form]);

  const onSubmit = async (values: ServiceFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    let error = null;
    if (initialData?.id) {
      // Update existing service
      const { error: updateError } = await supabase
        .from('services')
        .update(values)
        .eq('id', initialData.id);
      error = updateError;
    } else {
      // Create new service
      const { error: insertError } = await supabase
        .from('services')
        .insert(values);
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save service: ' + error.message);
    } else {
      toast.success('Service saved successfully!');
      form.reset();
      onSuccess?.();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name</FormLabel>
              <FormControl>
                <Input id={field.name} placeholder="e.g., Network Troubleshooting" {...field} />
              </FormControl>
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
                <Textarea id={field.name} placeholder="Detailed description of the service" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
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
          name="default_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Price</FormLabel>
              <FormControl>
                <Input id={field.name} type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input id={field.name} type="number" placeholder="60" {...field} onChange={e => field.onChange(e.target.value)} />
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
              <FormLabel>VAT Rate (e.g., 0.17 for 17%)</FormLabel>
              <FormControl>
                <Input id={field.name} type="number" step="0.01" placeholder="0.17" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Service</Button>
      </form>
    </Form>
  );
};

export default ServiceForm;