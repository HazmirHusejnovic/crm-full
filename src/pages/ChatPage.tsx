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
import api from '@/lib/api'; // Import novog API klijenta
import io from 'socket.io-client'; // Import Socket.IO klijenta

const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'; // URL vašeg Express API-ja

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

const ChatPage: React.FC = () => {
  const { session, token } = useSession(); // Session context sada pruža token
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<EnrichedChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isNewChatFormOpen, setIsNewChatFormOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  const fetchConversations = async () => {
    setLoading(true);
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: roleData } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
      setCurrentUserRole(roleData.role);

      const { data: chatsWithParticipants } = await api.get(`/chats/user/${session.user.id}`); // Pretpostavljena ruta
      const fetchedConversations: EnrichedChat[] = chatsWithParticipants.map((chat: any) => ({
        id: chat.id,
        type: chat.type,
        name: chat.name,
        last_message_at: chat.last_message_at,
        participants: chat.chat_participants.map((cp: any) => ({
          id: cp.user_id,
          first_name: cp.profile?.first_name, // Prilagodite ako se struktura razlikuje
          last_name: cp.profile?.last_name, // Prilagodite ako se struktura razlikuje
        })),
      }));
      setConversations(fetchedConversations);
      if (fetchedConversations.length > 0 && !selectedChatId) {
        setSelectedChatId(fetchedConversations[0].id);
      } else if (fetchedConversations.length === 0) {
        setSelectedChatId(null);
      }
    } catch (error: any) {
      toast.error('Failed to load conversations: ' + (error.response?.data?.message || error.message));
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Postavljanje Socket.IO veze za ažuriranja chata
    if (token) {
      socketRef.current = io(SOCKET_SERVER_URL, {
        query: { token },
      });

      socketRef.current.on('connect_error', (err: any) => {
        console.error('Socket.IO connection error:', err.message);
        toast.error('Chat connection error. Please refresh.');
      });

      socketRef.current.on('newMessage', (newMessage: any) => {
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
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [session, selectedChatId, token]); // Dodajte token kao zavisnost

  const handleNewChatSuccess = (newChatId: string) => {
    setIsNewChatFormOpen(false);
    fetchConversations();
    setSelectedChatId(newChatId);
  };

  const canCreateNewChat = currentUserRole === 'worker' || currentUserRole === 'administrator';

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
          {canCreateNewChat && (
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