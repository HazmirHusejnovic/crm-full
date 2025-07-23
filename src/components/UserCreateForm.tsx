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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { api } from '@/lib/api'; // Import the new API client

const userCreateFormSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role: z.enum(['client', 'worker', 'admin'], { message: 'Role is required.' }), // Changed 'administrator' to 'admin' based on backend spec
  // skip_email_verification: z.boolean().optional().default(false), // This is a Supabase-specific field, remove for custom backend
});

type UserCreateFormValues = z.infer<typeof userCreateFormSchema>;

interface UserCreateFormProps {
  onSuccess?: () => void;
}

const UserCreateForm: React.FC<UserCreateFormProps> = ({ onSuccess }) => {
  const { token } = useSession(); // Get token from session context

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'client', // Default role
      // skip_email_verification: false, // Remove this field
    },
  });

  const onSubmit = async (values: UserCreateFormValues) => {
    if (!token) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      // Use the register endpoint for creating new users, passing name, email, password, and role
      // Assuming 'name' in register body can be derived from first_name and last_name, or is a combined field.
      // Based on your example: "name": "Admin", so we'll combine first_name and last_name.
      const fullName = `${values.first_name || ''} ${values.last_name || ''}`.trim();
      if (!fullName) {
        toast.error('First Name or Last Name is required for user name.');
        return;
      }

      await api.post(
        '/auth/register',
        {
          name: fullName,
          email: values.email,
          password: values.password,
          role: values.role,
        },
        token, // Pass the current admin's token for authorization
        false // This is not an auth endpoint for the *current* user, but for creating *another* user
      );

      toast.success('User created successfully!');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Error creating user: ' + error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Removed skip_email_verification as it's Supabase specific */}
        <Button type="submit" className="w-full">Create User</Button>
      </form>
    </Form>
  );
};

export default UserCreateForm;