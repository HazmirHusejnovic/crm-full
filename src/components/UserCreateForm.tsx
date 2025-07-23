"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Dodato: Import Input komponente
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
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import api from '@/lib/api'; // Import novog API klijenta

const userCreateFormSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role: z.enum(['client', 'worker', 'administrator'], { message: 'Role is required.' }),
});

type UserCreateFormValues = z.infer<typeof userCreateFormSchema>;

interface UserCreateFormProps {
  onSuccess?: () => void;
}

const UserCreateForm: React.FC<UserCreateFormProps> = ({ onSuccess }) => {
  const { user } = useSession(); // Get current user from session context

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'client', // Default role
    },
  });

  const onSubmit = async (values: UserCreateFormValues) => {
    if (!user?.id) {
      toast.error('Current user not authenticated.');
      return;
    }

    try {
      // Poziv na vaš Express API za kreiranje korisnika
      const response = await api.post('/users', { // Pretpostavljena ruta za kreiranje korisnika
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        role: values.role,
      });

      if (response.status === 201) { // Pretpostavljamo da API vraća 201 Created
        toast.success('User created successfully!');
        form.reset();
        onSuccess?.();
      } else {
        toast.error('Failed to create user: ' + (response.data?.message || 'Unknown error.'));
      }
    } catch (error: any) {
      toast.error('Error creating user: ' + (error.response?.data?.message || error.message));
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
              <FormLabel>Password</Label>
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
              <FormLabel>First Name</Label>
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
              <FormLabel>Last Name</Label>
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
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Create User</Button>
      </form>
    </Form>
  );
};

export default UserCreateForm;