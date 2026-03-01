import { useState } from 'react';
import {
  MessageCircle,
  Settings,
  LogOut,
  User,
  Camera,
  Edit2,
  Check,
  X,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { updateUserProfile } from '../services/auth';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    status_message: profile?.status_message || '',
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);

    try {
      const { error: logoutError } = await signOut();

      if (logoutError) {
        console.error('Logout failed:', logoutError);
        setError('Failed to sign out. Please try again.');
        setIsLoggingOut(false);
        return;
      }

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
    } catch (err) {
      console.error('Unexpected logout error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      display_name: profile?.display_name || '',
      status_message: profile?.status_message || '',
    });
    setIsEditingProfile(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setError(null);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);

    const result = await updateUserProfile(user.id, {
      display_name: editForm.display_name || null,
      status_message: editForm.status_message || null,
    });

    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refreshProfile();
    setIsEditingProfile(false);
    setSuccess('Profile updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) {
      return 'Never';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditProfile}
              leftIcon={<Settings size={18} />}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              leftIcon={<LogOut size={18} />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6">
            <Alert type="success" message={success} onClose={() => setSuccess(null)} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-12">
            <div className="flex items-end gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                  {profile?.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.display_name || 'Profile'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 text-white pb-1">
                <h2 className="text-2xl font-bold">
                  {profile?.display_name || profile?.username || 'User'}
                </h2>
                <p className="text-white/80">@{profile?.username}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {isEditingProfile ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>

                {error && (
                  <Alert type="error" message={error} onClose={() => setError(null)} />
                )}

                <Input
                  label="Display Name"
                  value={editForm.display_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, display_name: e.target.value }))
                  }
                  placeholder="How you want to be called"
                  leftIcon={<User size={18} />}
                />

                <Input
                  label="Status Message"
                  value={editForm.status_message}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, status_message: e.target.value }))
                  }
                  placeholder="What's on your mind?"
                  leftIcon={<Edit2 size={18} />}
                />

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    isLoading={isSaving}
                    leftIcon={<Check size={18} />}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    leftIcon={<X size={18} />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Profile Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <p className="font-medium text-gray-900">{profile?.email || user?.email}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Username</p>
                      <p className="font-medium text-gray-900">@{profile?.username}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Status</p>
                      <p className="font-medium text-gray-900">
                        {profile?.status_message || 'No status set'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Clock size={14} />
                        Last Seen
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatLastSeen(profile?.last_seen)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Your Conversations
                  </h3>
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h4>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Start a conversation with someone to see your messages here.
                      Real-time chat features coming soon!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-white rounded-2xl shadow-xl shadow-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <MessageCircle className="w-8 h-8 text-teal-600 mb-3" />
              <h4 className="font-medium text-gray-900">Real-time Chat</h4>
              <p className="text-sm text-gray-600 mt-1">
                Instant messaging with read receipts
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <User className="w-8 h-8 text-emerald-600 mb-3" />
              <h4 className="font-medium text-gray-900">Group Chats</h4>
              <p className="text-sm text-gray-600 mt-1">
                Create groups with friends and family
              </p>
            </div>
            <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
              <Camera className="w-8 h-8 text-cyan-600 mb-3" />
              <h4 className="font-medium text-gray-900">Media Sharing</h4>
              <p className="text-sm text-gray-600 mt-1">
                Share photos, videos, and files
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
