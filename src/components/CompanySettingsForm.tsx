import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea for bank details
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
import { UploadCloud, Image, XCircle } from 'lucide-react'; // Icons for upload and image preview
import LoadingSpinner from './LoadingSpinner'; // Assuming you have a LoadingSpinner component

const companySettingsSchema = z.object({
  company_name: z.string().min(1, { message: 'Company name is required.' }).optional().nullable(),
  company_address: z.string().optional().nullable(),
  company_email: z.string().email({ message: 'Invalid email address.' }).optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_logo_url: z.string().url({ message: 'Invalid URL format.' }).optional().nullable(), // New field
  bank_account_details: z.string().optional().nullable(), // New field
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

interface CompanySettingsFormProps {
  initialData?: CompanySettingsFormValues;
  onSuccess?: () => void;
}

const CompanySettingsForm: React.FC<CompanySettingsFormProps> = ({ initialData, onSuccess }) => {
  const { supabase } = useSession();
  const [uploading, setUploading] = useState(false);

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      company_name: initialData?.company_name || '',
      company_address: initialData?.company_address || '',
      company_email: initialData?.company_email || '',
      company_phone: initialData?.company_phone || '',
      company_logo_url: initialData?.company_logo_url || '', // Initialize with existing URL
      bank_account_details: initialData?.bank_account_details || '',
    },
  });

  // Removed the problematic useEffect that caused re-renders.
  // The defaultValues in useForm are sufficient for initial load and updates.

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.error('You must select an image to upload.');
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Store in a 'public' folder within the bucket

    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('app-logos') // Ensure this bucket exists and has RLS policies
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Error uploading logo: ' + uploadError.message);
    } else {
      const { data } = supabase.storage.from('app-logos').getPublicUrl(filePath);
      if (data?.publicUrl) {
        form.setValue('company_logo_url', data.publicUrl);
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error('Failed to get public URL for logo.');
      }
    }
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    form.setValue('company_logo_url', null);
    // Optionally, you could also delete the file from Supabase Storage here
    // but that would require a server-side function for security.
    toast.info('Logo removed from settings. It might still exist in storage.');
  };

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

        {/* Company Logo Upload */}
        <FormField
          control={form.control}
          name="company_logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Logo</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-4">
                  {field.value ? (
                    <div className="relative group">
                      <img src={field.value} alt="Company Logo" className="h-20 w-20 object-contain rounded-md border p-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80 text-red-500 hover:bg-background group-hover:opacity-100 opacity-0 transition-opacity"
                        onClick={handleRemoveLogo}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-md cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                      {uploading ? (
                        <LoadingSpinner size={20} />
                      ) : (
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      )}
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                  {!field.value && (
                    <span className="text-sm text-muted-foreground">Upload a logo (max 2MB)</span>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bank_account_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Account Details</FormLabel>
              <FormControl>
                <Textarea placeholder="Bank Name, Account Number, SWIFT/BIC, IBAN" {...field} value={field.value || ''} />
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