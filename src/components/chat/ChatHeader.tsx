import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Settings, LogOut, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserAvatar } from './UserAvatar';
import { ProfilePictureModal } from './ProfilePictureModal';

export function ChatHeader() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [showProfilePicture, setShowProfilePicture] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    setShowMenu(false);

    try {
      const { error } = await signOut();

      if (error) {
        console.error('Logout failed:', error);
        setLogoutError('Failed to sign out. Please try again.');
        setIsLoggingOut(false);
        return;
      }

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (err) {
      console.error('Unexpected logout error:', err);
      setLogoutError('An unexpected error occurred. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="flex-shrink-0 h-16 bg-teal-600 dark:bg-gray-900 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">Messages</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-white" />
          ) : (
            <Sun className="w-5 h-5 text-white" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <UserAvatar user={profile} size="sm" />
            <span className="text-sm font-medium text-white hidden sm:block">
              {profile?.display_name || profile?.username || 'User'}
            </span>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-20">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {profile?.display_name || profile?.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                </div>

                <div className="py-1">
                  {profile?.profile_photo_url && (
                    <button
                      onClick={() => {
                        setShowProfilePicture(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User size={18} />
                      <span>View Photo</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                  {logoutError && (
                    <div className="px-4 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                      {logoutError}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-2 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut size={18} />
                    <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ProfilePictureModal
        user={profile}
        isOpen={showProfilePicture}
        onClose={() => setShowProfilePicture(false)}
      />
    </header>
  );
}
