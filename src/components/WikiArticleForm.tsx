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
  const { supabase, session } = useSession();
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
      const { data, error } = await supabase
        .from('wiki_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        toast.error('Failed to load wiki categories: ' + error.message);
      } else {
        setCategories(data);
      }
    };
    fetchCategories();
  }, [supabase]);

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

    let error = null;
    if (initialData?.id) {
      // Update existing article
      const { error: updateError } = await supabase
        .from('wiki_articles')
        .update(articleData)
        .eq('id', initialData.id);
      error = updateError;

      // Create a new version entry
      if (!error) {
        const { error: versionError } = await supabase
          .from('wiki_article_versions')
          .insert({
            article_id: initialData.id,
            content: values.content,
            edited_by: session.user.id,
          });
        if (versionError) {
          console.error('Failed to save article version:', versionError.message);
          toast.warning('Article updated, but failed to save version history.');
        }
      }
    } else {
      // Create new article
      const { data: newArticle, error: insertError } = await supabase
        .from('wiki_articles')
        .insert(articleData)
        .select('id')
        .single();
      error = insertError;

      // Create initial version entry for new article
      if (!error && newArticle) {
        const { error: versionError } = await supabase
          .from('wiki_article_versions')
          .insert({
            article_id: newArticle.id,
            content: values.content,
            edited_by: session.user.id,
          });
        if (versionError) {
          console.error('Failed to save initial article version:', versionError.message);
          toast.warning('Article created, but failed to save initial version history.');
        }
      }
    }

    if (error) {
      toast.error('Failed to save article: ' + error.message);
    } else {
      toast.success('Article saved successfully!');
      form.reset();
      onSuccess?.();
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