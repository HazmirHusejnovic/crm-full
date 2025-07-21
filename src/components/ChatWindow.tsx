import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import LoadingSpinner from './LoadingSpinner';
import MessageInput from './MessageInput'; // Will create this
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  const { supabase, session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          created_at,
          profiles(first_name, last_name)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Failed to load messages: ' + error.message);
        setMessages([]);
      } else {
        setMessages(data as ChatMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();

    // Set up real-time listener for new messages in this chat
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          // Update last_message_at for the chat
          supabase.from('chats').update({ last_message_at: newMessage.created_at }).eq('id', chatId).then(({ error }) => {
            if (error) console.error('Failed to update chat last_message_at:', error.message);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll to bottom whenever messages change

  const handleSendMessage = async (content: string) => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to send messages.');
      return;
    }
    if (!content.trim()) return;

    const { error } = await supabase.from('chat_messages').insert({
      chat_id: chatId,
      sender_id: session.user.id,
      content: content.trim(),
    });

    if (error) {
      toast.error('Failed to send message: ' + error.message);
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