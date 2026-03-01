import { User as UserIcon } from 'lucide-react';
import type { User } from '../../types/database';

interface UserAvatarProps {
  user: User | null;
  size?: 'sm' | 'md' | 'lg';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

export function UserAvatar({
  user,
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  onClick,
  clickable = false
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const indicatorSizes = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center overflow-hidden ${
          clickable ? 'cursor-pointer hover:ring-2 hover:ring-teal-500 hover:ring-offset-2 dark:hover:ring-offset-gray-900 transition-all' : ''
        }`}
        onClick={handleClick}
      >
        {user?.profile_photo_url ? (
          <img
            src={user.profile_photo_url}
            alt={user.display_name || user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <UserIcon className="text-white" size={iconSizes[size]} />
        )}
      </div>
      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${indicatorSizes[size]} rounded-full border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
}
