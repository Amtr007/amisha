import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Phone, Video, Users, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ChatMenu } from './ChatMenu';
import { ChatSearch } from './ChatSearch';
import { MediaGallery } from './MediaGallery';
import { StarredMessagesModal } from './StarredMessagesModal';
import { ImportantDatesModal } from './ImportantDatesModal';
import { GroupInfoModal } from './GroupInfoModal';
import { ProfilePictureModal } from './ProfilePictureModal';
import { ChatNotificationModal } from './ChatNotificationModal';
import type { ConversationWithDetails, MessageWithDetails, User } from '../../types/database';
import {
  getMessages,
  getOlderMessages,
  getMessageByIdForUser,
  sendMessage,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  addReaction,
  starMessage,
  markAsRead,
  markAsDelivered,
  updateTypingStatus,
  clearChatHistory,
  deleteConversation,
  leaveGroup,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToReactions,
  uploadMedia,
  getMessageTypeFromMime,
} from '../../services/messaging';
import { getUserProfile } from '../../services/auth';
import {
  triggerAmisha,
  detectAmishaInvocation,
  detectFight,
  detectMissing,
  isAmishaMessage,
} from '../../services/aiCompanion';

interface ChatWindowProps {
  conversation: ConversationWithDetails;
  onBack: () => void;
  onConversationUpdate: () => void;
}

export function ChatWindow({ conversation, onBack, onConversationUpdate }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<MessageWithDetails | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [currentConversation, setCurrentConversation] = useState(conversation);

  const [showSearch, setShowSearch] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showImportantDates, setShowImportantDates] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showProfilePicture, setShowProfilePicture] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const typingTimeoutRef = useRef<Map<string, number>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const wasNearBottom = isNearBottom();
      const isInitial = isInitialLoadRef.current;
      const msgs = await getMessages(conversation.id, user.id);

      const hasNewMessages = msgs.length > previousMessageCountRef.current;
      previousMessageCountRef.current = msgs.length;

      setMessages(msgs);
      setHasMoreMessages(msgs.length >= 100);
      setIsLoading(false);

      if (isInitial) {
        isInitialLoadRef.current = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom('auto');
          });
        });
      } else if (hasNewMessages && wasNearBottom && !isUserScrollingRef.current) {
        setTimeout(() => scrollToBottom('smooth'), 100);
      }

      await markAsDelivered(conversation.id, user.id);
      await markAsRead(conversation.id);
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  }, [conversation.id, user?.id, isNearBottom, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (!user?.id || isLoadingOlder || !hasMoreMessages || messages.length === 0) return;
    setIsLoadingOlder(true);

    const oldestMessage = messages[0];
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const { messages: older, hasMore } = await getOlderMessages(
        conversation.id,
        oldestMessage.created_at,
        user.id
      );

      setHasMoreMessages(hasMore);

      if (older.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const unique = older.filter((m) => !existingIds.has(m.id));
          previousMessageCountRef.current = prev.length + unique.length;
          return [...unique, ...prev];
        });

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [user?.id, isLoadingOlder, hasMoreMessages, messages, conversation.id]);

  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    setHasMoreMessages(true);
    setCurrentConversation(conversation);
    previousMessageCountRef.current = 0;
    isUserScrollingRef.current = false;
    isInitialLoadRef.current = true;
    loadMessages();
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    if (!conversation.is_group && conversation.otherUser?.id) {
      getUserProfile(conversation.otherUser.id).then((profile) => {
        if (profile) {
          setCurrentConversation((prev) => ({
            ...prev,
            otherUser: profile,
          }));
        }
      });
    }
  }, [conversation.is_group, conversation.otherUser?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let markReadTimer: ReturnType<typeof setTimeout> | null = null;
    const userId = user.id;
    const conversationId = conversation.id;

    const scheduleMarkRead = () => {
      if (markReadTimer) clearTimeout(markReadTimer);
      markReadTimer = setTimeout(async () => {
        await markAsDelivered(conversationId, userId);
        await markAsRead(conversationId);
      }, 2000);
    };

    const messageChannel = subscribeToMessages(
      conversationId,
      async (newMessage) => {
        if (!newMessage.id) return;

        let fullMessage = await getMessageByIdForUser(newMessage.id, userId);
        if (!fullMessage) {
          await new Promise((r) => setTimeout(r, 500));
          fullMessage = await getMessageByIdForUser(newMessage.id, userId);
        }
        if (!fullMessage) return;

        setMessages((prevMessages) => {
          if (prevMessages.some((m) => m.id === fullMessage.id)) return prevMessages;

          const updated = [...prevMessages, fullMessage];
          previousMessageCountRef.current = updated.length;

          if (
            !conversation.is_group &&
            fullMessage.sender_id !== userId &&
            !isAmishaMessage(fullMessage) &&
            fullMessage.content &&
            detectAmishaInvocation(fullMessage.content)
          ) {
            triggerAmisha(conversationId, 'INVOCATION', fullMessage.content);
          }

          setTimeout(() => {
            if (isNearBottom() && !isUserScrollingRef.current) {
              scrollToBottom('smooth');
            }
          }, 50);

          return updated;
        });

        scheduleMarkRead();
      },
      (updatedMessage) => {
        if (!updatedMessage.id) return;

        if (updatedMessage.deleted_for_everyone || updatedMessage.deleted_for?.includes(userId)) {
          setMessages((prevMessages) =>
            prevMessages.filter((m) => m.id !== updatedMessage.id)
          );
          return;
        }

        setMessages((prevMessages) =>
          prevMessages.map((m) =>
            m.id === updatedMessage.id
              ? {
                ...m,
                status: updatedMessage.status,
                content: updatedMessage.content,
                edited_at: updatedMessage.edited_at,
                original_content: updatedMessage.original_content,
                deleted_for: updatedMessage.deleted_for,
                deleted_for_everyone: updatedMessage.deleted_for_everyone,
                is_deleted: updatedMessage.is_deleted,
                updated_at: updatedMessage.updated_at,
              }
              : m
          )
        );
      },
      (deletedId) => {
        setMessages((prevMessages) =>
          prevMessages.filter((m) => m.id !== deletedId)
        );
      },
      () => {
        loadMessages();
      },
      () => {
        loadMessages();
      }
    );

    const typingChannel = subscribeToTyping(conversationId, userId, (typing, typingUserId) => {
      if (typing) {
        setTypingUsers((prev) => [...new Set([...prev, typingUserId])]);

        const existingTimeout = typingTimeoutRef.current.get(typingUserId);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeout = window.setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
        }, 5000);
        typingTimeoutRef.current.set(typingUserId, timeout);
      } else {
        setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
      }
    });

    const reactionChannel = subscribeToReactions(conversationId, async (messageId) => {
      const updatedMsg = await getMessageByIdForUser(messageId, userId);
      if (updatedMsg) {
        setMessages((prevMessages) =>
          prevMessages.map((m) => (m.id === messageId ? updatedMsg : m))
        );
      }
    });

    const syncInterval = setInterval(() => {
      if (!document.hidden) loadMessages();
    }, 30000);

    return () => {
      messageChannel.unsubscribe();
      typingChannel.unsubscribe();
      reactionChannel.unsubscribe();
      if (markReadTimer) clearTimeout(markReadTimer);
      clearInterval(syncInterval);
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [conversation.id, user?.id, isNearBottom, scrollToBottom, loadMessages]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isAtBottom) {
        isUserScrollingRef.current = false;
        shouldAutoScrollRef.current = true;
      } else {
        isUserScrollingRef.current = true;
        shouldAutoScrollRef.current = false;
      }

      if (scrollTop < 80 && hasMoreMessages && !isLoadingOlder) {
        loadOlderMessages();
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasMoreMessages, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        loadMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadMessages, user?.id]);

  const getOtherUser = useCallback(() => {
    if (conversation.is_group) return null;
    return currentConversation.otherUser || null;
  }, [conversation.is_group, currentConversation.otherUser]);

  const getUserDisplayName = useCallback((u: User | null | undefined) => {
    return u?.display_name || u?.username || 'User';
  }, []);



  const addMessageToState = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    const fullMessage = await getMessageByIdForUser(messageId, user.id);
    if (!fullMessage) return;
    setMessages((prevMessages) => {
      if (prevMessages.some((m) => m.id === fullMessage.id)) return prevMessages;
      const updated = [...prevMessages, fullMessage];
      previousMessageCountRef.current = updated.length;
      return updated;
    });
    setTimeout(() => {
      if (isNearBottom()) scrollToBottom('smooth');
    }, 50);
  }, [user?.id, isNearBottom, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    if (!user?.id) return;

    const newMsg = await sendMessage({
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
      message_type: 'text',
      reply_to_id: replyTo?.id || null,
    });

    if (newMsg?.id) {
      await addMessageToState(newMsg.id);
    }

    setReplyTo(null);

    if (!conversation.is_group) {
      const updatedMessages = await getMessages(conversation.id, user.id);

      if (detectAmishaInvocation(content)) {
        triggerAmisha(conversation.id, 'INVOCATION', content);
      } else if (detectFight(updatedMessages)) {
        triggerAmisha(conversation.id, 'FIGHT');
      } else if (detectMissing(updatedMessages)) {
        triggerAmisha(conversation.id, 'MISSING');
      }
    }
  };

  const handleSendMedia = async (file: File) => {
    if (!user?.id) return;

    const result = await uploadMedia(file, conversation.id);
    if (!result) return;

    const messageType = getMessageTypeFromMime(file.type);

    const newMsg = await sendMessage({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: null,
      message_type: messageType,
      media_url: result.url,
      media_metadata: result.metadata,
      reply_to_id: replyTo?.id || null,
    });

    if (newMsg?.id) {
      await addMessageToState(newMsg.id);
    }

    setReplyTo(null);
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!user?.id) return;

    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    const result = await uploadMedia(file, conversation.id);
    if (!result) return;

    const newMsg = await sendMessage({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: null,
      message_type: 'voice',
      media_url: result.url,
      media_metadata: { ...result.metadata, duration },
      reply_to_id: replyTo?.id || null,
    });

    if (newMsg?.id) {
      await addMessageToState(newMsg.id);
    }

    setReplyTo(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;
    await deleteMessageForMe(messageId, user.id);
    await loadMessages();
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    await deleteMessageForEveryone(messageId);
    await loadMessages();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    await addReaction(messageId, user.id, emoji);
    await loadMessages();
  };

  const handleStar = async (messageId: string) => {
    if (!user?.id) return;
    await starMessage(messageId, user.id);
    await loadMessages();
  };

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditingMessage({ id: messageId, content: currentContent });
  };

  const handleSaveEdit = async (newContent: string) => {
    if (!user?.id || !editingMessage) return;

    if (newContent.trim() === '') {
      setEditingMessage(null);
      return;
    }

    const success = await editMessage(editingMessage.id, newContent.trim(), user.id);
    if (success) {
      await loadMessages();
      setEditingMessage(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleTyping = (typing: boolean) => {
    updateTypingStatus(conversation.id, typing);
  };

  const handleClearHistory = async () => {
    await clearChatHistory(conversation.id);
    await loadMessages();
  };

  const handleDeleteChat = async () => {
    await deleteConversation(conversation.id);
    onConversationUpdate();
    onBack();
  };

  const handleLeaveGroup = async () => {
    await leaveGroup(conversation.id);
    onConversationUpdate();
    onBack();
  };

  const handleViewProfile = (u: User | null) => {
    if (u) {
      setSelectedUser(u);
      setShowProfilePicture(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMessages();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const navigateToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-teal-100/50');
      setTimeout(() => {
        element.classList.remove('bg-teal-100/50');
      }, 2000);
    }
  };

  const isOnline = (lastSeen: string) => {
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) {
      return 'offline';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'online';
    if (minutes < 60) return `last seen ${minutes}m ago`;
    if (minutes < 1440) return `last seen ${Math.floor(minutes / 60)}h ago`;
    return `last seen ${date.toLocaleDateString()}`;
  };

  const buildMessageGroups = (msgs: MessageWithDetails[]) => {
    const groups: { date: string; messages: MessageWithDetails[] }[] = [];
    msgs.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) {
        last.messages.push(msg);
      } else {
        groups.push({ date: dateKey, messages: [msg] });
      }
    });
    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const messageGroups = buildMessageGroups(messages);

  const getHeaderInfo = () => {
    if (conversation.is_group) {
      const memberCount = conversation.participants.length;
      return {
        name: conversation.group_name || 'Group',
        subtitle: typingUsers.length > 0
          ? `${typingUsers.length} typing...`
          : `${memberCount} member${memberCount !== 1 ? 's' : ''}`,
        photoUrl: conversation.group_photo_url,
        isGroup: true,
      };
    }

    const otherUser = currentConversation.otherUser;
    return {
      name: otherUser?.display_name || otherUser?.username || 'User',
      subtitle: typingUsers.length > 0
        ? 'typing...'
        : otherUser ? (isOnline(otherUser.last_seen) ? 'online' : formatLastSeen(otherUser.last_seen)) : '',
      photoUrl: otherUser?.profile_photo_url,
      isGroup: false,
      user: otherUser,
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 relative">
        {showSearch && (
          <ChatSearch
            conversationId={conversation.id}
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            onNavigateToMessage={navigateToMessage}
          />
        )}

        <button
          onClick={onBack}
          className="lg:hidden w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-900 dark:text-white"
        >
          <ArrowLeft size={20} />
        </button>

        {headerInfo.isGroup ? (
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            {headerInfo.photoUrl ? (
              <img
                src={headerInfo.photoUrl}
                alt={headerInfo.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            )}
          </div>
        ) : (
          <UserAvatar
            user={headerInfo.user}
            showOnlineStatus
            isOnline={headerInfo.user ? isOnline(headerInfo.user.last_seen) : false}
            clickable
            onClick={() => handleViewProfile(headerInfo.user)}
          />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{headerInfo.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {typingUsers.length > 0 ? (
              <span className="text-teal-600 dark:text-teal-400">{headerInfo.subtitle}</span>
            ) : headerInfo.subtitle.includes('online') ? (
              <span className="text-green-600 dark:text-green-400">{headerInfo.subtitle}</span>
            ) : (
              headerInfo.subtitle
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
            title="Refresh messages"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300">
            <Phone size={18} />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300">
            <Video size={18} />
          </button>
          <ChatMenu
            conversation={currentConversation}
            onOpenSearch={() => setShowSearch(true)}
            onOpenMediaGallery={() => setShowMediaGallery(true)}
            onOpenStarredMessages={() => setShowStarredMessages(true)}
            onOpenImportantDates={() => setShowImportantDates(true)}
            onOpenNotificationSettings={() => setShowNotificationSettings(true)}
            onClearHistory={handleClearHistory}
            onDeleteChat={handleDeleteChat}
            onLeaveGroup={conversation.is_group ? handleLeaveGroup : undefined}
            onOpenGroupInfo={conversation.is_group ? () => setShowGroupInfo(true) : undefined}
          />
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-teal-600 dark:border-teal-400 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {headerInfo.isGroup ? (
                <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                </div>
              ) : (
                <UserAvatar
                  user={headerInfo.user}
                  size="lg"
                  clickable
                  onClick={() => handleViewProfile(headerInfo.user)}
                />
              )}
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">{headerInfo.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {headerInfo.isGroup
                  ? 'Start a conversation in this group'
                  : `Start a conversation with @${headerInfo.user?.username}`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center py-3">
                {isLoadingOlder ? (
                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 size={14} className="animate-spin" />
                    Loading older messages...
                  </div>
                ) : (
                  <button
                    onClick={loadOlderMessages}
                    className="px-4 py-1.5 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-full transition-colors"
                  >
                    Load older messages
                  </button>
                )}
              </div>
            )}
            {messageGroups.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm dark:shadow-none dark:border dark:border-gray-700">
                    {formatDateHeader(group.date)}
                  </span>
                </div>
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current.set(msg.id, el);
                    }}
                    className="transition-colors duration-500"
                  >
                    <MessageBubble
                      message={msg}
                      onDelete={handleDeleteMessage}
                      onDeleteForEveryone={handleDeleteForEveryone}
                      onReaction={handleReaction}
                      onReply={setReplyTo}
                      onStar={handleStar}
                      onEdit={handleEdit}
                    />
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        onSendVoice={handleSendVoice}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        disabled={isLoading}
      />

      <MediaGallery
        conversationId={conversation.id}
        isOpen={showMediaGallery}
        onClose={() => setShowMediaGallery(false)}
      />

      <StarredMessagesModal
        isOpen={showStarredMessages}
        onClose={() => setShowStarredMessages(false)}
        onNavigateToMessage={(msgId, convId) => {
          if (convId === conversation.id) {
            setShowStarredMessages(false);
            navigateToMessage(msgId);
          }
        }}
      />

      <ImportantDatesModal
        conversationId={conversation.id}
        isOpen={showImportantDates}
        onClose={() => setShowImportantDates(false)}
      />

      {conversation.is_group && (
        <GroupInfoModal
          conversation={currentConversation}
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={() => {
            onConversationUpdate();
          }}
        />
      )}

      <ProfilePictureModal
        user={selectedUser}
        isOpen={showProfilePicture}
        onClose={() => {
          setShowProfilePicture(false);
          setSelectedUser(null);
        }}
      />

      {showNotificationSettings && (
        <ChatNotificationModal
          conversationId={conversation.id}
          conversationName={
            conversation.is_group
              ? conversation.group_name || 'Group Chat'
              : conversation.otherUser?.display_name ||
              conversation.otherUser?.username ||
              'Chat'
          }
          onClose={() => setShowNotificationSettings(false)}
        />
      )}
    </div>
  );
}
