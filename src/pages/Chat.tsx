import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatHeader } from '../components/chat/ChatHeader';
import type { ConversationWithDetails } from '../types/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getConversations } from '../services/messaging';

export function Chat() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  const loadConversationFromUrl = useCallback(async () => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && user?.id && !selectedConversation) {
      const conversations = await getConversations(user.id);
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, user?.id, selectedConversation]);

  useEffect(() => {
    loadConversationFromUrl();
  }, [loadConversationFromUrl]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateLastSeen = async () => {
      await supabase.rpc('update_last_seen');
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setSearchParams({ conversation: conversation.id });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSearchParams({});
  };

  const handleConversationUpdate = async () => {
    if (user?.id && selectedConversation) {
      const conversations = await getConversations(user.id);
      const updated = conversations.find((c) => c.id === selectedConversation.id);
      if (updated) {
        setSelectedConversation(updated);
      }
    }
  };

  const showChatList = !isMobileView || !selectedConversation;
  const showChatWindow = !isMobileView || selectedConversation;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <ChatHeader />

      <div className="flex-1 flex overflow-hidden">
        {showChatList && (
          <div className={`${isMobileView ? 'w-full' : 'w-80 border-r border-gray-100 dark:border-gray-800'} flex-shrink-0`}>
            <ChatList
              selectedConversationId={selectedConversation?.id || null}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        )}

        {showChatWindow && (
          <div className="flex-1 min-w-0">
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                onBack={handleBack}
                onConversationUpdate={handleConversationUpdate}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="text-center max-w-sm px-4">
                  <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-10 h-10 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Your Messages
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a conversation from the list or start a new chat by clicking the + button
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
