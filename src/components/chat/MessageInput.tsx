import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Paperclip, Image, Video, FileText, Mic, X, Loader2, Camera } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import type { MessageWithDetails } from '../../types/database';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia: (file: File) => Promise<void>;
  onSendVoice: (blob: Blob, duration: number) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  replyTo: MessageWithDetails | null;
  onCancelReply: () => void;
  editingMessage: { id: string; content: string } | null;
  onSaveEdit: (newContent: string) => void;
  onCancelEdit: () => void;
  disabled?: boolean;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export function MessageInput({
  onSendMessage,
  onSendMedia,
  onSendVoice,
  onTyping,
  replyTo,
  onCancelReply,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  disabled = false,
  prefillText,
  onPrefillConsumed,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefillText) {
      setMessage(prefillText);
      onPrefillConsumed?.();
    }
  }, [prefillText, onPrefillConsumed]);

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
    }
  }, [editingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    onTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      if (editingMessage) {
        onSaveEdit(message.trim());
      } else {
        onSendMessage(message.trim());
      }
      setMessage('');
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, acceptedTypes: string[]) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      alert('File type not supported');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setShowAttachMenu(false);

    try {
      await onSendMedia(file);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleVoiceComplete = async (blob: Blob, duration: number) => {
    setShowVoiceRecorder(false);
    setIsUploading(true);

    try {
      await onSendVoice(blob, duration);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = (acceptedTypes: string[]) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptedTypes.join(',');
      fileInputRef.current.click();
    }
  };

  const handleCameraCapture = () => {
    setShowAttachMenu(false);
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleCameraFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onSendMedia(file);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  if (showVoiceRecorder) {
    return (
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <VoiceRecorder
          onRecordingComplete={handleVoiceComplete}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      {editingMessage && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex-1 min-w-0 border-l-2 border-amber-500 pl-2">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Editing message
            </p>
          </div>
          <button
            onClick={onCancelEdit}
            className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-700/50 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {replyTo && !editingMessage && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex-1 min-w-0 border-l-2 border-teal-500 pl-2">
            <p className="text-xs font-medium text-teal-600 dark:text-teal-400">
              Replying to {replyTo.sender.display_name || replyTo.sender.username}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {replyTo.content || `[${replyTo.message_type}]`}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
          <Loader2 className="animate-spin text-teal-600 dark:text-teal-400" size={18} />
          <span className="text-sm text-teal-700 dark:text-teal-300">Uploading...</span>
          <div className="flex-1 h-1.5 bg-teal-100 dark:bg-teal-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 dark:bg-teal-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            disabled={disabled || isUploading}
          >
            <Paperclip size={20} />
          </button>

          {showAttachMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAttachMenu(false)}
              />
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-20">
                <button
                  onClick={handleCameraCapture}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <Camera size={16} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Camera</span>
                </button>
                <button
                  onClick={() => triggerFileInput(ACCEPTED_IMAGE_TYPES)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Image size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Photo</span>
                </button>
                <button
                  onClick={() => triggerFileInput(ACCEPTED_VIDEO_TYPES)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                    <Video size={16} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Video</span>
                </button>
                <button
                  onClick={() => triggerFileInput(ACCEPTED_FILE_TYPES)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <FileText size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Document</span>
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const accepted = fileInputRef.current?.accept.split(',') || [];
            handleFileSelect(e, accepted);
          }}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraFileSelect}
        />

        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all max-h-32"
            rows={1}
            disabled={disabled || isUploading}
            style={{
              minHeight: '44px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
        </div>

        {message.trim() ? (
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
            disabled={disabled || isUploading}
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            onClick={() => setShowVoiceRecorder(true)}
            className="w-10 h-10 rounded-full bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
            disabled={disabled || isUploading}
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
