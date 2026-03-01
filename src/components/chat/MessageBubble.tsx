import { useState, useRef } from 'react';
import {
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Reply,
  FileText,
  Download,
  Star,
  Ban,
  Edit,
} from 'lucide-react';
import type { MessageWithDetails, MessageReaction } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { VoicePlayer } from './VoicePlayer';
import { isAmishaMessage } from '../../services/aiCompanion';

interface MessageBubbleProps {
  message: MessageWithDetails;
  onDelete: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: MessageWithDetails) => void;
  onStar?: (messageId: string) => void;
  onEdit?: (messageId: string, currentContent: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageBubble({
  message,
  onDelete,
  onDeleteForEveryone,
  onReaction,
  onReply,
  onStar,
  onEdit,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasSwipedRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const isAmisha = isAmishaMessage(message);

  const isOwn = message.sender_id === user?.id;
  const isDeleted = message.deleted_for_everyone;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const groupedReactions = message.reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const StatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'read':
        return <CheckCheck className="text-teal-500" size={14} />;
      case 'delivered':
        return <CheckCheck className="text-gray-400" size={14} />;
      default:
        return <Check className="text-gray-400" size={14} />;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    hasSwipedRef.current = false;
    isLongPressRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      setShowMenu(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    if (Math.abs(diffX) > 10 || diffY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (diffY > 20) {
      touchStartRef.current = null;
      setSwipeX(0);
      return;
    }

    const swipeDirection = isOwn ? diffX : -diffX;

    if (swipeDirection > 0 && swipeDirection < 80) {
      setSwipeX(isOwn ? diffX : diffX);
    }

    if (Math.abs(diffX) > 60 && !hasSwipedRef.current && !isLongPressRef.current) {
      hasSwipedRef.current = true;
      onReply(message);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
    setSwipeX(0);
  };

  const handleMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      setShowMenu(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderContent = () => {
    if (isDeleted) {
      return (
        <div className="flex items-center gap-2 text-gray-400 italic">
          <Ban size={14} />
          <span>This message was deleted</span>
        </div>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <div className="max-w-xs">
            {!imageError && message.media_url ? (
              <img
                src={message.media_url}
                alt="Shared image"
                className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.media_url!, '_blank')}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Image unavailable
              </div>
            )}
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="max-w-xs">
            <video
              src={message.media_url || undefined}
              controls
              className="rounded-lg max-w-full"
              preload="metadata"
            />
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'voice':
        return (
          <VoicePlayer
            src={message.media_url || ''}
            duration={message.media_metadata?.duration}
          />
        );

      case 'file':
        return (
          <a
            href={message.media_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-lg ${isOwn ? 'bg-teal-700/30' : 'bg-gray-100'
              }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwn ? 'bg-white/20' : 'bg-white'
              }`}>
              <FileText size={20} className={isOwn ? 'text-white' : 'text-gray-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                {message.media_metadata?.filename || 'Document'}
              </p>
              <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                {formatFileSize(message.media_metadata?.size)}
              </p>
            </div>
            <Download size={18} className={isOwn ? 'text-white/70' : 'text-gray-400'} />
          </a>
        );

      default:
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  if (isAmisha) {
    return (
      <div className="flex items-start gap-2 px-1 py-1 group mb-1">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-md text-white text-xs font-bold select-none mt-1">
          A
        </div>

        <div className="flex-1 min-w-0 max-w-[85%]">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Amisha</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(message.created_at)}</span>
          </div>

          <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/70 dark:to-cyan-950/70 border border-teal-200/70 dark:border-teal-700/40 shadow-sm">
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative max-w-[75%] ${isOwn ? 'order-2' : 'order-1'} transition-transform`}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        {swipeX !== 0 && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-12' : '-right-12'
              } w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center`}
          >
            <Reply size={18} className="text-teal-600" />
          </div>
        )}

        {message.replyTo && !isDeleted && (
          <div
            className={`text-xs px-3 py-2 mb-1 rounded-lg border-l-2 ${isOwn
                ? 'bg-teal-700/30 border-teal-300 text-teal-100'
                : 'bg-gray-100 border-gray-400 text-gray-600'
              }`}
          >
            <p className="font-medium text-xs">
              {message.replyTo.sender.display_name || message.replyTo.sender.username}
            </p>
            <p className="truncate">
              {message.replyTo.deleted_for_everyone
                ? 'Message deleted'
                : message.replyTo.content || `[${message.replyTo.message_type}]`}
            </p>
          </div>
        )}

        <div
          className={`px-4 py-2 rounded-2xl ${isOwn
              ? 'bg-teal-600 dark:bg-teal-700 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
            }`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {renderContent()}

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.isStarred && (
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            )}
            <span className={`text-[10px] ${isOwn ? 'text-teal-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatTime(message.created_at)}
              {message.edited_at && (
                <span className="ml-1 italic opacity-75">edited</span>
              )}
            </span>
            <StatusIcon />
          </div>
        </div>

        {Object.keys(groupedReactions).length > 0 && !isDeleted && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <button
                key={emoji}
                onClick={() => onReaction(message.id, emoji)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <span>{emoji}</span>
                {reactions.length > 1 && (
                  <span className="text-gray-500 dark:text-gray-400">{reactions.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {!isDeleted && (
          <>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-white dark:bg-gray-700 shadow-md flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white`}
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowMenu(false);
                    setShowReactions(false);
                  }}
                />
                <div
                  className={`fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden w-[180px] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 sm:absolute sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0 sm:w-[160px] ${isOwn ? 'sm:right-full sm:mr-2' : 'sm:left-full sm:ml-2'} sm:top-0`}
                >
                  <button
                    onClick={() => {
                      setShowReactions(!showReactions);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span>React</span>
                  </button>
                  <button
                    onClick={() => {
                      onReply(message);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Reply size={14} />
                    <span>Reply</span>
                  </button>
                  {isOwn && onEdit && message.message_type === 'text' && message.content && (
                    <button
                      onClick={() => {
                        onEdit(message.id, message.content || '');
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                  )}
                  {onStar && (
                    <button
                      onClick={() => {
                        onStar(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Star size={14} className={message.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                      <span>{message.isStarred ? 'Unstar' : 'Star'}</span>
                    </button>
                  )}
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      <span>Delete for me</span>
                    </button>
                    {isOwn && onDeleteForEveryone && (
                      <button
                        onClick={() => {
                          onDeleteForEveryone(message.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Delete for everyone</span>
                      </button>
                    )}
                  </div>

                  {showReactions && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-2 flex gap-1 flex-wrap justify-center">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onReaction(message.id, emoji);
                            setShowMenu(false);
                            setShowReactions(false);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
