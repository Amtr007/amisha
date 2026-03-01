import { useState } from 'react';
import {
  MoreVertical,
  Search,
  Image,
  Star,
  Calendar,
  Trash2,
  LogOut,
  UserPlus,
  Settings,
  Users,
  X,
  Bell,
} from 'lucide-react';
import type { ConversationWithDetails } from '../../types/database';

interface ChatMenuProps {
  conversation: ConversationWithDetails;
  onOpenSearch: () => void;
  onOpenMediaGallery: () => void;
  onOpenStarredMessages: () => void;
  onOpenImportantDates: () => void;
  onOpenNotificationSettings: () => void;
  onClearHistory: () => void;
  onDeleteChat: () => void;
  onLeaveGroup?: () => void;
  onOpenGroupInfo?: () => void;
  onAddMembers?: () => void;
}

export function ChatMenu({
  conversation,
  onOpenSearch,
  onOpenMediaGallery,
  onOpenStarredMessages,
  onOpenImportantDates,
  onOpenNotificationSettings,
  onClearHistory,
  onDeleteChat,
  onLeaveGroup,
  onOpenGroupInfo,
  onAddMembers,
}: ChatMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isAdmin = conversation.currentUserRole === 'admin';
  const isGroup = conversation.is_group;

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-600"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
            <div className="py-1">
              <button
                onClick={() => handleAction(onOpenSearch)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Search size={18} />
                <span>Search</span>
              </button>

              <button
                onClick={() => handleAction(onOpenMediaGallery)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Image size={18} />
                <span>Media Gallery</span>
              </button>

              <button
                onClick={() => handleAction(onOpenStarredMessages)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Star size={18} />
                <span>Starred Messages</span>
              </button>

              <button
                onClick={() => handleAction(onOpenImportantDates)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Calendar size={18} />
                <span>Important Dates</span>
              </button>

              <button
                onClick={() => handleAction(onOpenNotificationSettings)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Bell size={18} />
                <span>Notification Settings</span>
              </button>
            </div>

            {isGroup && (
              <div className="border-t border-gray-100 py-1">
                {onOpenGroupInfo && (
                  <button
                    onClick={() => handleAction(onOpenGroupInfo)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Users size={18} />
                    <span>Group Info</span>
                  </button>
                )}

                {isAdmin && onAddMembers && (
                  <button
                    onClick={() => handleAction(onAddMembers)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus size={18} />
                    <span>Add Members</span>
                  </button>
                )}

                {isAdmin && onOpenGroupInfo && (
                  <button
                    onClick={() => handleAction(onOpenGroupInfo)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={18} />
                    <span>Group Settings</span>
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowClearConfirm(true);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Trash2 size={18} />
                <span>Clear Chat</span>
              </button>

              {isGroup && onLeaveGroup && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowLeaveConfirm(true);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Leave Group</span>
                </button>
              )}

              {(!isGroup || isAdmin) && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={18} />
                  <span>{isGroup ? 'Delete Group' : 'Delete Chat'}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Chat History"
          message="Are you sure you want to clear all messages? This action cannot be undone."
          confirmText="Clear"
          onConfirm={() => {
            onClearHistory();
            setShowClearConfirm(false);
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={isGroup ? 'Delete Group' : 'Delete Chat'}
          message={
            isGroup
              ? 'Are you sure you want to delete this group? All messages and members will be removed.'
              : 'Are you sure you want to delete this chat? This action cannot be undone.'
          }
          confirmText="Delete"
          variant="danger"
          onConfirm={() => {
            onDeleteChat();
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showLeaveConfirm && onLeaveGroup && (
        <ConfirmDialog
          title="Leave Group"
          message="Are you sure you want to leave this group?"
          confirmText="Leave"
          variant="danger"
          onConfirm={() => {
            onLeaveGroup();
            setShowLeaveConfirm(false);
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-teal-600 hover:bg-teal-700'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
