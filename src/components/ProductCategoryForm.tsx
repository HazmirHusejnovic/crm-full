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

const productCategoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Category name is required.' }),
  description: z.string().optional(),
});

type ProductCategoryFormValues = z.infer<typeof productCategoryFormSchema>;

interface ProductCategoryFormProps {
  initialData?: ProductCategoryFormValues & { id?: string };
  onSuccess?: () => void;
}

const ProductCategoryForm: React.FC<ProductCategoryFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();

  const form = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(productCategoryFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: ProductCategoryFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    let error = null;
    if (initialData?.id) {
      // Update existing category
      const { error: updateError } = await supabase
        .from('product_categories')
        .update(values)
        .eq('id', initialData.id);
      error = updateError;
    } else {
      // Create new category
      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(values);
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save category: ' + error.message);
    } else {
      toast.success('Category saved successfully!');
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input id={field.name} placeholder="e.g., Electronics" {...field} />
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
                <Textarea id={field.name} placeholder="Description of the product category" {...field} />
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

export default ProductCategoryForm;