import React from 'react';
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
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import api from '@/lib/api'; // Import novog API klijenta

const serviceCategoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Category name is required.' }),
  description: z.string().optional(),
});

type ServiceCategoryFormValues = z.infer<typeof serviceCategoryFormSchema>;

interface ServiceCategoryFormProps {
  initialData?: ServiceCategoryFormValues & { id?: string };
  onSuccess?: () => void;
}

const ServiceCategoryForm: React.FC<ServiceCategoryFormProps> = ({ initialData, onSuccess }) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno

  const form = useForm<ServiceCategoryFormValues>({
    resolver: zodResolver(serviceCategoryFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: ServiceCategoryFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    let error = null;
    try {
      if (initialData?.id) {
        // Update existing category
        await api.put(`/service-categories/${initialData.id}`, values); // Pretpostavljena ruta
      } else {
        // Create new category
        await api.post('/service-categories', values); // Pretpostavljena ruta
      }
      toast.success('Category saved successfully!');
      form.reset();
      onSuccess?.();
    } catch (err: any) {
      toast.error('Failed to save category: ' + (err.response?.data?.message || err.message));
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., IT Support" {...field} />
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
                <Textarea placeholder="Description of the service category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Category</Button>
      </form>
    </Form>
  );
};

export default ServiceCategoryForm;