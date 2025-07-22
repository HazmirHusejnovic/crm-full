import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';
import NewChatForm from '@/components/NewChatForm';

const ChatPage: React.FC = () => {
  const { supabase, session } = useSession();
  const { dbConnectionError } = useAppContext();
  const [conversations, setConversations] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isNewChatFormOpen, setIsNewChatFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ... rest of your component logic ...

  if (dbConnectionError) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Database Connection Issue</h2>
          <p className="text-muted-foreground mb-4">
            We're unable to connect to the database. Please check your internet connection 
            and try again later.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r">
        <div className="p-4">
          <Button 
            onClick={() => setIsNewChatFormOpen(true)}
            className="w-full"
          >
            New Chat
          </Button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
        />
      </div>
      <div className="flex-1">
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Select a chat or start a new one</p>
          </div>
        )}
      </div>
      <NewChatForm
        isOpen={isNewChatFormOpen}
        onClose={() => setIsNewChatFormOpen(false)}
        onSuccess={(newChatId) => {
          setSelectedChatId(newChatId);
          setIsNewChatFormOpen(false);
        }}
      />
    </div>
  );
};

export default ChatPage;  // This is the crucial line that was missing