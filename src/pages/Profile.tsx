import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Camera, Edit2, Check, X, Mail, AtSign, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { NotificationSettings } from '../components/NotificationSettings';
import { updateUserProfile, uploadProfilePhoto } from '../services/auth';

export function Profile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    display_name: profile?.display_name || '',
    status_message: profile?.status_message || '',
  });

  const handleSave = async () => {
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
    setIsEditing(false);
    setSuccess('Profile updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCancel = () => {
    setEditForm({
      display_name: profile?.display_name || '',
      status_message: profile?.status_message || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    setError(null);

    const result = await uploadProfilePhoto(user.id, file);

    setIsUploadingPhoto(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refreshProfile();
    setSuccess('Profile photo updated successfully');
    setTimeout(() => setSuccess(null), 3000);

    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6">
            <Alert type="success" message={success} onClose={() => setSuccess(null)} />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-12">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30 overflow-hidden">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  ) : profile?.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.display_name || 'Profile'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-white" />
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Camera className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">
                {profile?.display_name || profile?.username || 'User'}
              </h2>
              <p className="text-white/80">@{profile?.username}</p>
            </div>
          </div>

          <div className="p-8">
            {isEditing ? (
              <div className="space-y-6">
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
                    onClick={handleSave}
                    isLoading={isSaving}
                    leftIcon={<Check size={18} />}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    leftIcon={<X size={18} />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Profile Information
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    leftIcon={<Edit2 size={16} />}
                  >
                    Edit
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{profile?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <AtSign className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium text-gray-900">@{profile?.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">
                        {profile?.status_message || 'No status set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden p-8">
          <NotificationSettings />
        </div>
      </main>
    </div>
  );
}
