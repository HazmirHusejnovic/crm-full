import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import NewChatForm from '@/components/NewChatForm';
import { usePermissions } from '@/hooks/usePermissions'; // Import usePermissions

interface Chat {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  last_message_at: string | null;
}

// Define an enriched chat type to include participant details for display
interface EnrichedChat extends Chat {
  participants: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
}

interface AppSettings {
  module_permissions: Record<string, Record<string, string[]>> | null;
}

const ChatPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<EnrichedChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isNewChatFormOpen, setIsNewChatFormOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null); // State for app settings

  // Pozivanje usePermissions hooka na vrhu komponente
  const { canViewModule, canCreate } = usePermissions(appSettings, currentUserRole as 'client' | 'worker' | 'administrator');

  const fetchConversations = async () => {
    setLoading(true);
    let currentRole: string | null = null;
    let currentSettings: AppSettings | null = null;

    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    // Fetch user role
    const { data: roleData, error: roleError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (roleError) {
      console.error('Error fetching user role:', roleError.message);
      toast.error('Failed to fetch your user role.');
    } else {
      currentRole = roleData.role;
      setCurrentUserRole(roleData.role);
    }

    // Fetch app settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('module_permissions')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (settingsError) {
      console.error('Error fetching app settings:', settingsError.message);
      toast.error('Failed to load app settings.');
    } else {
      currentSettings = settingsData as AppSettings;
      setAppSettings(settingsData as AppSettings);
    }

    if (!currentRole || !currentSettings) {
      setLoading(false);
      return;
    }

    // Provjera dozvola se sada radi preko `canViewModule` koji je definisan na vrhu komponente
    if (!canViewModule('chat')) { // Koristimo canViewModule direktno
      setLoading(false);
      return;
    }

    // First, fetch all chat IDs the current user is a part of
    const { data: userChatParticipants, error: userParticipantsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', session.user.id);

    if (userParticipantsError) {
      toast.error('Failed to load user chat memberships: ' + userParticipantsError.message);
      setConversations([]);
      setLoading(false);
      return;
    }

    const chatIds = userChatParticipants.map(p => p.chat_id);
    if (chatIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Now fetch all chat details and their participants for these chat IDs
    const { data: chatsWithParticipants, error: chatsError } = await supabase
      .from('chats')
      .select(`
        id,
        type,
        name,
        last_message_at,
        chat_participants(
          user_id,
          profiles(id, first_name, last_name)
        )
      `)
      .in('id', chatIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (chatsError) {
      toast.error('Failed to load conversations: ' + chatsError.message);
      setConversations([]);
    } else {
      const fetchedConversations: EnrichedChat[] = chatsWithParticipants.map((chat: any) => ({
        id: chat.id,
        type: chat.type,
        name: chat.name,
        last_message_at: chat.last_message_at,
        participants: chat.chat_participants.map((cp: any) => ({
          id: cp.user_id,
          first_name: cp.profiles?.first_name,
          last_name: cp.profiles?.last_name,
        })),
      }));
      setConversations(fetchedConversations);
      if (fetchedConversations.length > 0 && !selectedChatId) {
        setSelectedChatId(fetchedConversations[0].id);
      } else if (fetchedConversations.length === 0) {
        setSelectedChatId(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Real-time listener for new messages to update last_message_at and re-sort
    const channel = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new as any;
          setConversations(prevConversations => {
            const updatedConversations = prevConversations.map(chat => {
              if (chat.id === newMessage.chat_id) {
                return { ...chat, last_message_at: newMessage.created_at };
              }
              return chat;
            });
            // Sort by last_message_at, most recent first
            return updatedConversations.sort((a, b) => {
              if (!a.last_message_at) return 1;
              if (!b.last_message_at) return -1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, session, selectedChatId, appSettings, currentUserRole]); // Dodati appSettings i currentUserRole kao zavisnosti

  const handleNewChatSuccess = (newChatId: string) => {
    setIsNewChatFormOpen(false);
    fetchConversations();
    setSelectedChatId(newChatId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('chat')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row h-[calc(100vh-8rem)]">
      <Card className="w-full lg:w-1/3 flex-shrink-0 lg:mr-4 mb-4 lg:mb-0 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversations</CardTitle>
          {canCreate('chat') && (
            <Dialog open={isNewChatFormOpen} onOpenChange={setIsNewChatFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Start New Chat</DialogTitle>
                </DialogHeader>
                <NewChatForm onSuccess={handleNewChatSuccess} />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
          />
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>
            {selectedChatId
              ? conversations.find(c => c.id === selectedChatId)?.name || 'Chat'
              : 'Select a Chat'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {selectedChatId ? (
            <ChatWindow chatId={selectedChatId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              No chat selected. Click '+' to start a new conversation.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatPage;