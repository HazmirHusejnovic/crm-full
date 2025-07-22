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
    console.log('--- NewChatForm onSubmit started ---');
    console.log('Current session object:', session);

    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      console.error('User not authenticated. Session or user ID is missing.');
      return;
    }

    console.log('Current User ID:', session.user.id);
    console.log('Current Session Access Token (first 10 chars):', session.access_token ? session.access_token.substring(0, 10) + '...' : 'N/A');

    const currentUserId = session.user.id;
    const otherParticipantId = values.participant_id;

    console.log('Attempting to create chat with participant ID:', otherParticipantId);

    try {
      // 1. Fetch chat IDs for the current user
      console.log('Step 1: Fetching current user chat participants...');
      const { data: currentUserChatParticipants, error: currentUserChatsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId);

      if (currentUserChatsError) {
        console.error('Error fetching current user chat memberships:', currentUserChatsError);
        throw new Error('Error fetching current user chat memberships: ' + currentUserChatsError.message);
      }
      const currentUserChatIds = currentUserChatParticipants.map(p => p.chat_id);
      console.log('Current user chat IDs:', currentUserChatIds);

      // 2. Fetch chat IDs for the other participant
      console.log('Step 2: Fetching other user chat participants...');
      const { data: otherUserChatParticipants, error: otherUserChatsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', otherParticipantId);

      if (otherUserChatsError) {
        console.error('Error fetching other user chat memberships:', otherUserChatsError);
        throw new Error('Error fetching other user chat memberships: ' + otherUserChatsError.message);
      }
      const otherUserChatIds = otherUserChatParticipants.map(p => p.chat_id);
      console.log('Other user chat IDs:', otherUserChatIds);

      // 3. Find common chat IDs (potential private chats)
      const commonChatIds = currentUserChatIds.filter(chatId => otherUserChatIds.includes(chatId));
      console.log('Common chat IDs (potential existing private chats):', commonChatIds);

      let existingPrivateChatId: string | null = null;

      if (commonChatIds.length > 0) {
        // 4. For each common chat ID, check if it's a 'private' chat with exactly two participants
        console.log('Step 4: Checking common chats for existing private chat details...');
        const { data: chatsDetails, error: chatsDetailsError } = await supabase
          .from('chats')
          .select(`
            id,
            type,
            chat_participants(user_id)
          `)
          .in('id', commonChatIds)
          .eq('type', 'private'); // Only consider private chats

        if (chatsDetailsError) {
          console.error('Error fetching chat details for common IDs:', chatsDetailsError);
          throw new Error('Error fetching chat details for common IDs: ' + chatsDetailsError.message);
        }

        const foundChat = chatsDetails.find(chat =>
          chat.chat_participants.length === 2 &&
          chat.chat_participants.some((p: { user_id: string }) => p.user_id === otherParticipantId)
        );

        if (foundChat) {
          existingPrivateChatId = foundChat.id;
          console.log('Found existing private chat:', existingPrivateChatId);
        }
      }

      if (existingPrivateChatId) {
        toast.info('A private chat with this user already exists.');
        onSuccess?.(existingPrivateChatId); // Select existing chat
        console.log('--- NewChatForm onSubmit finished (existing chat) ---');
        return;
      }

      // If no existing private chat, create a new one
      console.log('Step 5: No existing private chat found. Creating new one...');
      const { data: newChatData, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private', name: null }) // Private chats don't need a name initially
        .select('id')
        .single();

      if (chatError) {
        console.error('Supabase insert error for chats:', chatError); // Log full error object
        toast.error('Failed to create chat: ' + chatError.message);
        console.error('--- NewChatForm onSubmit failed (chat creation) ---');
        return;
      }

      const newChatId = newChatData.id;
      console.log('New chat created with ID:', newChatId);

      // Add participants to the new chat
      console.log('Step 6: Adding participants to new chat...');
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChatId, user_id: currentUserId },
          { chat_id: newChatId, user_id: otherParticipantId },
        ]);

      if (participantsError) {
        console.error('Failed to add participants to chat:', participantsError); // Log full error object
        toast.error('Failed to add participants to chat: ' + participantsError.message);
        // Consider rolling back chat creation here if this is critical
        console.error('--- NewChatForm onSubmit failed (add participants) ---');
        return;
      }

      toast.success('New private chat created successfully!');
      form.reset();
      onSuccess?.(newChatId);
      console.log('--- NewChatForm onSubmit finished (success) ---');
    } catch (e: any) {
      console.error('Unexpected error during chat creation process:', e); // Log full error object
      toast.error('An unexpected error occurred: ' + e.message);
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