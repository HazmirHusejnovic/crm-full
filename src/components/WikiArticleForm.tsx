import React, { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import api from '@/lib/api'; // Import novog API klijenta

const wikiArticleFormSchema = z.object({
  title: z.string().min(1, { message: 'Article title is required.' }),
  content: z.string().min(1, { message: 'Article content is required.' }),
  category_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(['admin', 'worker', 'public'], { message: 'Visibility is required.' }),
});

type WikiArticleFormValues = z.infer<typeof wikiArticleFormSchema>;

interface WikiArticleFormProps {
  initialData?: WikiArticleFormValues & { id?: string };
  onSuccess?: () => void;
}

interface WikiCategory {
  id: string;
  name: string;
}

const WikiArticleForm: React.FC<WikiArticleFormProps> = ({ initialData, onSuccess }) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [categories, setCategories] = useState<WikiCategory[]>([]);

  const form = useForm<WikiArticleFormValues>({
    resolver: zodResolver(wikiArticleFormSchema),
    defaultValues: initialData || {
      title: '',
      content: '',
      category_id: null,
      visibility: 'worker',
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/wiki-categories'); // Pretpostavljena ruta
        setCategories(data);
      } catch (error: any) {
        toast.error('Failed to load wiki categories: ' + (error.response?.data?.message || error.message));
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (values: WikiArticleFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    const articleData = {
      ...values,
      category_id: values.category_id === 'null-value' ? null : values.category_id,
      created_by: session.user.id,
      updated_by: session.user.id,
    };

    try {
      if (initialData?.id) {
        // Update existing article
        await api.put(`/wiki-articles/${initialData.id}`, articleData); // Pretpostavljena ruta
        // Create a new version entry (assuming API handles this or a separate endpoint)
        await api.post('/wiki-article-versions', {
          article_id: initialData.id,
          content: values.content,
          edited_by: session.user.id,
        });
      } else {
        // Create new article
        const { data: newArticle } = await api.post('/wiki-articles', articleData); // Pretpostavljena ruta
        // Create initial version entry for new article
        await api.post('/wiki-article-versions', {
          article_id: newArticle.id,
          content: values.content,
          edited_by: session.user.id,
        });
      }
      toast.success('Article saved successfully!');
      form.reset();
      onSuccess?.();
    } catch (err: any) {
      toast.error('Failed to save article: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Article title" {...field} />
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
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="public">Public (Everyone)</SelectItem>
                  <SelectItem value="worker">Worker (Employees & Admins)</SelectItem>
                  <SelectItem value="admin">Admin (Admins Only)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content (Markdown supported)</FormLabel>
              <FormControl>
                <ReactQuill
                  theme="snow"
                  value={field.value}
                  onChange={field.onChange}
                  className="h-64 mb-12" // Adjust height and add margin-bottom to prevent overlap
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-12">Save Article</Button>
      </form>
    </Form>
  );
};

export default WikiArticleForm;