import React from 'react';
import { useForm } from 'react-hook-form';
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
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';

const companySettingsSchema = z.object({
  company_name: z.string().min(1, { message: 'Company name is required.' }).optional().nullable(),
  company_address: z.string().optional().nullable(),
  company_email: z.string().email({ message: 'Invalid email address.' }).optional().nullable(),
  company_phone: z.string().optional().nullable(),
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

interface CompanySettingsFormProps {
  initialData?: CompanySettingsFormValues;
  onSuccess?: () => void;
}

const CompanySettingsForm: React.FC<CompanySettingsFormProps> = ({ initialData, onSuccess }) => {
  const { supabase } = useSession();

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      company_name: initialData?.company_name || '',
      company_address: initialData?.company_address || '',
      company_email: initialData?.company_email || '',
      company_phone: initialData?.company_phone || '',
    },
  });

  const onSubmit = async (values: CompanySettingsFormValues) => {
    const { error } = await supabase
      .from('app_settings')
      .update(values)
      .eq('id', '00000000-0000-0000-0000-000000000001'); // Fixed ID for the single settings row

    if (error) {
      toast.error('Failed to save company settings: ' + error.message);
    } else {
      toast.success('Company settings saved successfully!');
      onSuccess?.();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Company Name" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Business Rd, City, Country" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="info@yourcompany.com" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1234567890" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Company Settings</Button>
      </form>
    </Form>
  );
};

export default CompanySettingsForm;