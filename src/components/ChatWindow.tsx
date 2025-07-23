import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';
import MessageInput from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import api from '@/lib/api'; // Import novog API klijenta
import io from 'socket.io-client'; // Import Socket.IO klijenta

const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'; // URL vašeg Express API-ja

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // Sender profile
}

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { session, token } = useSession(); // Session context sada pruža token
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/chats/${chatId}/messages`); // Pretpostavljena ruta
        setMessages(data as ChatMessage[]);
      } catch (error: any) {
        toast.error('Failed to load messages: ' + (error.response?.data?.message || error.message));
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Postavljanje Socket.IO veze
    if (token) {
      socketRef.current = io(SOCKET_SERVER_URL, {
        query: { token }, // Proslijedite token za autentifikaciju
      });

      socketRef.current.emit('joinChat', chatId);

      socketRef.current.on('newMessage', (newMessage: ChatMessage) => {
        if (newMessage.chat_id === chatId) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          // Ažurirajte last_message_at za chat putem API-ja
          api.put(`/chats/${chatId}`, { last_message_at: newMessage.created_at })
            .catch(err => console.error('Failed to update chat last_message_at:', err.response?.data || err.message));
        }
      });

      socketRef.current.on('connect_error', (err: any) => {
        console.error('Socket.IO connection error:', err.message);
        toast.error('Chat connection error. Please refresh.');
      });

      return () => {
        socketRef.current.emit('leaveChat', chatId);
        socketRef.current.disconnect();
      };
    }
  }, [chatId, token]); // Dodajte token kao zavisnost

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll to bottom whenever messages change

  const handleSendMessage = async (content: string) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to send messages.');
      return;
    }
    if (!content.trim()) return;

    try {
      // Šaljite poruku putem Socket.IO
      socketRef.current.emit('sendMessage', {
        chat_id: chatId,
        sender_id: session.user.id,
        content: content.trim(),
      });
    } catch (error: any) {
      toast.error('Failed to send message: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-end gap-3',
                  message.sender_id === session?.user?.id ? 'justify-end' : 'justify-start'
                )}
              >
                {message.sender_id !== session?.user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.profiles?.first_name || 'U'}`} />
                    <AvatarFallback>{message.profiles?.first_name?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'flex flex-col max-w-[70%]',
                    message.sender_id === session?.user?.id
                      ? 'items-end'
                      : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm',
                      message.sender_id === session?.user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {message.content}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {message.sender_id === session?.user?.id ? 'You' : `${message.profiles?.first_name || 'Unknown'}`} - {format(new Date(message.created_at), 'p')}
                  </span>
                </div>
                {message.sender_id === session?.user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=You`} />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;