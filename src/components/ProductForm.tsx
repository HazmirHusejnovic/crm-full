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

const productFormSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required.' }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, { message: 'Price must be non-negative.' })
  ),
  stock_quantity: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().int().min(0, { message: 'Stock quantity must be a non-negative integer.' })
  ),
  category_id: z.string().uuid().nullable().optional(), // Allow null for no category
  sku: z.string().optional().nullable(),
  vat_rate: z.preprocess( // New VAT rate field
    (val) => parseFloat(String(val)),
    z.number().min(0).max(1, { message: 'VAT rate must be between 0 and 1 (e.g., 0.17 for 17%).' })
  ),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: ProductFormValues & { id?: string };
  onSuccess?: () => void;
}

interface ProductCategory {
  id: string;
  name: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      stock_quantity: initialData?.stock_quantity || 0,
      category_id: initialData?.category_id || null,
      sku: initialData?.sku || '',
      vat_rate: initialData?.vat_rate || 0.17, // Default VAT rate
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name');

      if (error) {
        toast.error('Failed to load product categories: ' + error.message);
      } else {
        setCategories(data);
      }
    };

    fetchCategories();
  }, [supabase]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    const productData = {
      ...values,
      category_id: values.category_id === 'null-value' ? null : values.category_id, // Handle null-value for category
    };

    let error = null;
    if (initialData?.id) {
      // Update existing product
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', initialData.id);
      error = updateError;
    } else {
      // Create new product
      const { error: insertError } = await supabase
        .from('products')
        .insert(productData);
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save product: ' + error.message);
    } else {
      toast.success('Product saved successfully!');
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
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Laptop Pro" {...field} />
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
                <Textarea placeholder="Detailed description of the product" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">No Category</SelectItem>
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
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock_quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Quantity</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.value)} />
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
                <Input type="number" step="0.01" placeholder="0.17" {...field} onChange={e => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., LP-001" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Product</Button>
      </form>
    </Form>
  );
};

export default ProductForm;