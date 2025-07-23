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
import api from '@/lib/api'; // Import novog API klijenta

const financialSettingsSchema = z.object({
  default_vat_rate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0).max(1, { message: 'VAT rate must be between 0 and 1 (e.g., 0.17 for 17%).' })
  ),
});

type FinancialSettingsFormValues = z.infer<typeof financialSettingsSchema>;

interface FinancialSettingsFormProps {
  initialData?: FinancialSettingsFormValues;
  onSuccess?: () => void;
}

const FinancialSettingsForm: React.FC<FinancialSettingsFormProps> = ({ initialData, onSuccess }) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno

  const form = useForm<FinancialSettingsFormValues>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      default_vat_rate: initialData?.default_vat_rate || 0.17,
    },
  });

  const onSubmit = async (values: FinancialSettingsFormValues) => {
    try {
      // Pretpostavljena ruta za ažuriranje finansijskih postavki
      await api.put('/app-settings/financial', values); // Pretpostavljamo da postoji fiksni ID ili da se ažurira jedinstveni red
      toast.success('Financial settings saved successfully!');
      onSuccess?.();
    } catch (err: any) {
      toast.error('Failed to save financial settings: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="default_vat_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default VAT Rate (e.g., 0.17 for 17%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.17" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Financial Settings</Button>
      </form>
    </Form>
  );
};

export default FinancialSettingsForm;