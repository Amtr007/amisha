import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import type { MessageWithDetails } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { getStarredMessages, unstarMessage } from '../../services/messaging';
import { UserAvatar } from './UserAvatar';

interface StarredMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage?: (messageId: string, conversationId: string) => void;
}

export function StarredMessagesModal({ isOpen, onClose, onNavigateToMessage }: StarredMessagesModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadStarredMessages();
    }
  }, [isOpen, user?.id]);

  const loadStarredMessages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const data = await getStarredMessages(user.id);
    setMessages(data);
    setIsLoading(false);
  };

  const handleUnstar = async (messageId: string) => {
    if (!user?.id) return;
    await unstarMessage(messageId, user.id);
    setMessages(messages.filter((m) => m.id !== messageId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  const getMessagePreview = (message: MessageWithDetails) => {
    if (message.content) {
      return message.content.length > 100
        ? message.content.substring(0, 100) + '...'
        : message.content;
    }

    switch (message.message_type) {
      case 'image':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'voice':
        return 'Voice message';
      case 'file':
        return message.media_metadata?.filename || 'File';
      default:
        return 'Message';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Starred Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Star size={48} className="mb-3 opacity-30" />
              <p>No starred messages</p>
              <p className="text-sm mt-1">Tap the star icon on any message to save it here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onNavigateToMessage?.(message.id, message.conversation_id)}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={message.sender} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {message.sender.display_name || message.sender.username}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {getMessagePreview(message)}
                      </p>
                      {message.message_type === 'image' && message.media_url && (
                        <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={message.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstar(message.id);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
                    >
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
