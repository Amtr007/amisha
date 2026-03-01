import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, MessageCircle, X, Users, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { CreateGroupModal } from './CreateGroupModal';
import type { ConversationWithDetails, User } from '../../types/database';
import {
  getConversations,
  searchUsers,
  getAllUsers,
  getOrCreateConversation,
  createGroupConversation,
  uploadGroupPhoto,
  subscribeToConversations,
} from '../../services/messaging';

interface ChatListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationWithDetails) => void;
}

export function ChatList({ selectedConversationId, onSelectConversation }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const convs = await getConversations(user.id);
      setConversations(convs);
    } catch (err) {
      console.error('[chat] Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const realtimeDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToConversations(user.id, () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = window.setTimeout(loadConversations, 2000);
    });

    const intervalId = setInterval(loadConversations, 60000);

    return () => {
      channel.unsubscribe();
      clearInterval(intervalId);
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    };
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!user?.id || !showNewChat) return;

    getAllUsers(user.id).then(setAllUsers);
  }, [user?.id, showNewChat]);

  useEffect(() => {
    if (!user?.id || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchUsers(searchQuery, user.id);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const handleStartConversation = async (otherUser: User) => {
    if (!user?.id) return;

    const conversationId = await getOrCreateConversation(otherUser.id);
    if (conversationId) {
      const newConvs = await getConversations(user.id);
      setConversations(newConvs);
      const newConv = newConvs.find((c) => c.id === conversationId);
      if (newConv) {
        onSelectConversation(newConv);
      }
      setShowNewChat(false);
      setSearchQuery('');
    }
  };

  const handleCreateGroup = async (name: string, memberIds: string[], description?: string, photoFile?: File) => {
    const conversationId = await createGroupConversation(name, memberIds, description);
    if (conversationId) {
      if (photoFile) {
        await uploadGroupPhoto(conversationId, photoFile);
      }
      const newConvs = await getConversations(user?.id || '');
      const newConv = newConvs.find((c) => c.id === conversationId);
      if (newConv) {
        onSelectConversation(newConv);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessagePreview = (conv: ConversationWithDetails) => {
    if (!conv.lastMessage) return 'No messages yet';

    if (conv.lastMessage.deleted_for_everyone) {
      return 'Message deleted';
    }

    const isOwn = conv.lastMessage.sender_id === user?.id;
    const prefix = conv.is_group
      ? isOwn
        ? 'You: '
        : `${conv.lastMessage.sender?.display_name || conv.lastMessage.sender?.username || ''}: `
      : isOwn
        ? 'You: '
        : '';

    let content = conv.lastMessage.content || '';

    switch (conv.lastMessage.message_type) {
      case 'image':
        content = 'Photo';
        break;
      case 'video':
        content = 'Video';
        break;
      case 'voice':
        content = 'Voice message';
        break;
      case 'file':
        content = 'Document';
        break;
    }

    return prefix + content;
  };

  const isOnline = (lastSeen: string) => {
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const displayedUsers = searchQuery.trim() ? searchResults : allUsers;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
              title="Create Group"
            >
              <Users size={18} />
            </button>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showNewChat
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50'
                }`}
            >
              {showNewChat ? <X size={20} /> : <UserPlus size={18} />}
            </button>
          </div>
        </div>

        {showNewChat && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-teal-500/20 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {showNewChat ? (
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {searchQuery.trim() ? 'Search Results' : 'All Users'}
            </p>
            {displayedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery.trim() ? 'No users found' : 'No users available'}
              </div>
            ) : (
              displayedUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartConversation(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <UserAvatar user={u} showOnlineStatus isOnline={isOnline(u.last_seen)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {u.display_name || u.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-teal-600 dark:border-teal-400 border-t-transparent rounded-full" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">No conversations yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tap the + button to start a new chat or create a group
            </p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => {
              const displayName = conv.is_group
                ? conv.group_name || 'Group'
                : conv.otherUser?.display_name || conv.otherUser?.username || 'User';

              const photoUrl = conv.is_group
                ? conv.group_photo_url
                : conv.otherUser?.profile_photo_url;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${selectedConversationId === conv.id
                    ? 'bg-teal-50 dark:bg-teal-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  {conv.is_group ? (
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <UserAvatar
                      user={conv.otherUser}
                      showOnlineStatus
                      isOnline={conv.otherUser ? isOnline(conv.otherUser.last_seen) : false}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(conv.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {getMessagePreview(conv)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 bg-teal-600 dark:bg-teal-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
      />
    </div>
  );
}
