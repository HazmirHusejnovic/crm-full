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
  const { supabase, session } = useSession();
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

      const { data, error } = await supabase
        .from('profiles_with_auth_emails')
        .select('id, first_name, last_name, email')
        .neq('id', session.user.id) // Exclude current user
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Failed to load users for new chat form:', error.message);
        toast.error('Failed to load users: ' + error.message);
      } else {
        setUsers(data as Profile[]);
      }
      setLoadingUsers(false);
    };

    fetchUsers();
  }, [supabase, session]);

  const onSubmit = async (values: NewChatFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    const currentUserId = session.user.id;
    const otherParticipantId = values.participant_id;

    console.log('Attempting to create chat with:', otherParticipantId);

    try {
      // Check if a private chat already exists between these two users
      // Fetch chats where both currentUserId and otherParticipantId are participants.
      const { data: potentialPrivateChats, error: potentialPrivateChatsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId)
        .in('chat_id', supabase.from('chat_participants').select('chat_id').eq('user_id', otherParticipantId));

      if (potentialPrivateChatsError) {
        console.error('Error finding potential private chats:', potentialPrivateChatsError.message);
        toast.error('Error finding potential private chats: ' + potentialPrivateChatsError.message);
        return;
      }

      let existingPrivateChatId: string | null = null;
      for (const chat of potentialPrivateChats) {
        const { count: participantCount, error: countError } = await supabase
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.chat_id);

        if (countError) {
          console.error('Error counting participants for chat:', chat.chat_id, countError.message);
          continue;
        }

        if (participantCount === 2) {
          existingPrivateChatId = chat.chat_id;
          break;
        }
      }

      if (existingPrivateChatId) {
        toast.info('A private chat with this user already exists.');
        onSuccess?.(existingPrivateChatId); // Select existing chat
        return;
      }

      // Create new chat
      const { data: newChatData, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private', name: null }) // Private chats don't need a name initially
        .select('id')
        .single();

      if (chatError) {
        console.error('Failed to create chat:', chatError.message);
        toast.error('Failed to create chat: ' + chatError.message);
        return;
      }

      const newChatId = newChatData.id;
      console.log('New chat created with ID:', newChatId);

      // Add participants to the new chat
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChatId, user_id: currentUserId },
          { chat_id: newChatId, user_id: otherParticipantId },
        ]);

      if (participantsError) {
        console.error('Failed to add participants to chat:', participantsError.message);
        toast.error('Failed to add participants to chat: ' + participantsError.message);
        // Consider rolling back chat creation here if this is critical
        return;
      }

      toast.success('New private chat created successfully!');
      form.reset();
      onSuccess?.(newChatId);
    } catch (e: any) {
      console.error('Unexpected error during chat creation:', e.message);
      toast.error('An unexpected error occurred: ' + e.message);
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