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
import NewChatForm from '@/components/NewChatForm'; // Import the new form

interface Chat {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  last_message_at: string | null;
}

const ChatPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isNewChatFormOpen, setIsNewChatFormOpen] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
          chat_id,
          chats(id, type, name, last_message_at)
        `)
      .eq('user_id', session.user.id)
      .order('last_message_at', { foreignTable: 'chats', ascending: false, nullsFirst: false });

    if (error) {
      toast.error('Failed to load conversations: ' + error.message);
    } else {
      const fetchedChats = data.map(p => p.chats).filter(chat => chat !== null) as Chat[];
      setConversations(fetchedChats);
      if (fetchedChats.length > 0 && !selectedChatId) {
        setSelectedChatId(fetchedChats[0].id);
      } else if (fetchedChats.length === 0) {
        setSelectedChatId(null); // No chats, so no selected chat
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

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
  }, [supabase, session, selectedChatId]);

  const handleNewChatSuccess = (newChatId: string) => {
    setIsNewChatFormOpen(false);
    fetchConversations(); // Re-fetch conversations to include the new one
    setSelectedChatId(newChatId); // Automatically select the new chat
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row h-[calc(100vh-8rem)]">
      <Card className="w-full lg:w-1/3 flex-shrink-0 lg:mr-4 mb-4 lg:mb-0 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversations</CardTitle>
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