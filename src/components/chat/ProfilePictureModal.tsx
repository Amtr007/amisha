import { X, Download } from 'lucide-react';
import type { User } from '../../types/database';

interface ProfilePictureModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePictureModal({ user, isOpen, onClose }: ProfilePictureModalProps) {
  if (!isOpen || !user) return null;

  const handleDownload = () => {
    if (user.profile_photo_url) {
      window.open(user.profile_photo_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 sm:px-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {user.display_name || user.username}
            </h3>
            <p className="text-sm text-gray-300">@{user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            {user.profile_photo_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Download"
              >
                <Download size={20} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          className="max-w-4xl max-h-[80vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {user.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={user.display_name || user.username}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="w-80 h-80 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <span className="text-9xl font-bold text-white">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-sm text-gray-400">Click anywhere to close</p>
        </div>
      </div>
    </div>
  );
}
