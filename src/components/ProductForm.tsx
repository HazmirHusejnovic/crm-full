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
import api from '@/lib/api'; // Import novog API klijenta

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
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState<number>(0.17); // Default fallback

  useEffect(() => {
    const fetchSettingsAndCategories = async () => {
      // Fetch default VAT rate
      try {
        const { data: settingsData } = await api.get('/app-settings'); // Pretpostavljena ruta
        if (settingsData) {
          setDefaultVatRate(settingsData.default_vat_rate);
        }
      } catch (error: any) {
        console.error('Failed to load default VAT rate from settings:', error.response?.data || error.message);
      }

      // Fetch categories
      try {
        const { data } = await api.get('/product-categories'); // Pretpostavljena ruta
        setCategories(data);
      } catch (error: any) {
        toast.error('Failed to load product categories: ' + (error.response?.data?.message || error.message));
      }
    };

    fetchSettingsAndCategories();
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      stock_quantity: initialData?.stock_quantity || 0,
      category_id: initialData?.category_id || null,
      sku: initialData?.sku || '',
      vat_rate: initialData?.vat_rate ?? defaultVatRate, // Use fetched default or initialData
    },
  });

  // Update form default value for vat_rate if defaultVatRate changes and it's a new product
  useEffect(() => {
    if (!initialData?.id && defaultVatRate !== form.getValues('vat_rate')) {
      form.setValue('vat_rate', defaultVatRate);
    }
  }, [defaultVatRate, initialData, form]);


  const onSubmit = async (values: ProductFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    const productData = {
      ...values,
      category_id: values.category_id === 'null-value' ? null : values.category_id, // Handle null-value for category
    };

    try {
      if (initialData?.id) {
        // Update existing product
        await api.put(`/products/${initialData.id}`, productData); // Pretpostavljena ruta
      } else {
        // Create new product
        await api.post('/products', productData); // Pretpostavljena ruta
      }
      toast.success('Product saved successfully!');
      form.reset();
      onSuccess?.();
    } catch (err: any) {
      toast.error('Failed to save product: ' + (err.response?.data?.message || err.message));
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