import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import LoadingSpinner from './LoadingSpinner';
import api from '@/lib/api'; // Import novog API klijenta

const newChatFormSchema = z.object({
  participant_id: z.string().uuid({ message: 'Please select a participant.' }),
});

type NewChatFormValues = z.infer<typeof newChatFormSchema>;

interface NewChatFormProps {
  onSuccess?: (newChatId: string) => void;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

const NewChatForm: React.FC<NewChatFormProps> = ({ onSuccess }) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const form = useForm<NewChatFormValues>({
    resolver: zodResolver(newChatFormSchema),
    defaultValues: {
      participant_id: '',
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      if (!session?.user?.id) {
        setLoadingUsers(false);
        return;
      }

      try {
        const { data } = await api.get('/profiles'); // Pretpostavljena ruta za dohvaćanje svih profila
        setUsers(data.filter((user: Profile) => user.id !== session.user.id) as Profile[]); // Exclude current user
      } catch (error: any) {
        console.error('Failed to load users for new chat form:', error.response?.data || error.message);
        toast.error('Failed to load users: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session]);

  const onSubmit = async (values: NewChatFormValues) => {
    console.log('--- NewChatForm onSubmit started ---');
    console.log('Current session object:', session);

    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      console.error('User not authenticated. Session or user ID is missing.');
      return;
    }

    console.log('Current User ID:', session.user.id);
    console.log('Current Session Access Token (first 10 chars):', session.token ? session.token.substring(0, 10) + '...' : 'N/A');

    const currentUserId = session.user.id;
    const otherParticipantId = values.participant_id;

    console.log('Attempting to create chat with participant ID:', otherParticipantId);

    try {
      // API poziv za provjeru i kreiranje chata
      const { data: chatResponse } = await api.post('/chats/private', {
        participant1_id: currentUserId,
        participant2_id: otherParticipantId,
      });

      const { chatId, message } = chatResponse;

      if (message === 'Chat already exists') {
        toast.info('A private chat with this user already exists.');
      } else {
        toast.success('New private chat created successfully!');
      }
      form.reset();
      onSuccess?.(chatId);
      console.log('--- NewChatForm onSubmit finished (success) ---');
    } catch (e: any) {
      console.error('Unexpected error during chat creation process:', e.response?.data || e.message);
      toast.error('An unexpected error occurred: ' + (e.response?.data?.message || e.message));
      console.error('--- NewChatForm onSubmit finished (unexpected error) ---');
    }
  };

  if (loadingUsers) {
    return <LoadingSpinner size={32} className="min-h-[150px]" />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="participant_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start chat with:</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.length === 0 ? (
                    <SelectItem value="" disabled>No other users found</SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={users.length === 0}>
          Start Chat
        </Button>
      </form>
    </Form>
  );
};

export default NewChatForm;