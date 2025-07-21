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

    // Check if a private chat already exists between these two users
    const { data: existingChats, error: existingChatError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .in('user_id', [currentUserId, otherParticipantId])
      .in('chat_id', supabase.from('chat_participants').select('chat_id').eq('user_id', currentUserId))
      .in('chat_id', supabase.from('chat_participants').select('chat_id').eq('user_id', otherParticipantId));

    if (existingChatError) {
      toast.error('Error checking for existing chat: ' + existingChatError.message);
      return;
    }

    // Filter for chats that have exactly two participants (private chats)
    const privateChatIds = existingChats.map(c => c.chat_id);
    const { data: chatCounts, error: chatCountsError } = await supabase
      .from('chat_participants')
      .select('chat_id', { count: 'exact' })
      .in('chat_id', privateChatIds)
      .not('user_id', 'in', [currentUserId, otherParticipantId]); // Ensure no other participants

    if (chatCountsError) {
      toast.error('Error checking chat participant count: ' + chatCountsError.message);
      return;
    }

    const existingPrivateChat = chatCounts.find(c => c.count === 2); // Check for exactly 2 participants

    if (existingPrivateChat) {
      toast.info('A private chat with this user already exists.');
      onSuccess?.(existingPrivateChat.chat_id); // Select existing chat
      return;
    }

    // Create new chat
    const { data: newChatData, error: chatError } = await supabase
      .from('chats')
      .insert({ type: 'private', name: null }) // Private chats don't need a name initially
      .select('id')
      .single();

    if (chatError) {
      toast.error('Failed to create chat: ' + chatError.message);
      return;
    }

    const newChatId = newChatData.id;

    // Add participants to the new chat
    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_id: newChatId, user_id: currentUserId },
        { chat_id: newChatId, user_id: otherParticipantId },
      ]);

    if (participantsError) {
      toast.error('Failed to add participants to chat: ' + participantsError.message);
      // Consider rolling back chat creation here if this is critical
      return;
    }

    toast.success('New private chat created successfully!');
    form.reset();
    onSuccess?.(newChatId);
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