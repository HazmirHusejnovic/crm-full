import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNowStrict } from 'date-fns';
import { useSession } from '@/contexts/SessionContext';

// Define an enriched chat type to include participant details for display
interface EnrichedChat {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  last_message_at: string | null;
  participants: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
}

interface ConversationListProps {
  conversations: EnrichedChat[]; // Use EnrichedChat type
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, selectedChatId, onSelectChat }) => {
  const { session } = useSession();

  const getChatDisplayName = (chat: EnrichedChat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    // For private chats, find the other participant's name
    const otherParticipant = chat.participants.find(p => p.id !== session?.user?.id);
    if (otherParticipant) {
      const fullName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim();
      return fullName || 'Unknown User';
    }
    return 'Private Chat'; // Fallback if no other participant found (shouldn't happen for valid private chats)
  };

  return (
    <div className="space-y-2">
      {conversations.length === 0 ? (
        <p className="text-center text-muted-foreground">No conversations yet.</p>
      ) : (
        conversations.map((chat) => (
          <Button
            key={chat.id}
            variant={selectedChatId === chat.id ? 'secondary' : 'ghost'}
            className="w-full justify-start h-auto p-3"
            onClick={() => onSelectChat(chat.id)}
          >
            <Avatar className="mr-3">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getChatDisplayName(chat)}`} />
              <AvatarFallback>{getChatDisplayName(chat).substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-semibold">{getChatDisplayName(chat)}</p>
              {chat.last_message_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(chat.last_message_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </Button>
        ))
      )}
    </div>
  );
};

export default ConversationList;