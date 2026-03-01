import { useState, useEffect } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getChatNotificationSettings,
  updateChatNotificationSettings,
  deleteChatNotificationSettings,
  getNotificationPreferences,
} from '../../services/notifications';
import { Alert } from '../ui/Alert';

interface ChatNotificationModalProps {
  conversationId: string;
  conversationName: string;
  onClose: () => void;
}

export function ChatNotificationModal({
  conversationId,
  conversationName,
  onClose,
}: ChatNotificationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, [conversationId]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const [globalPrefs, chatSettings] = await Promise.all([
        getNotificationPreferences(user.id),
        getChatNotificationSettings(user.id, conversationId),
      ]);

      setGlobalEnabled(globalPrefs.email_notifications_enabled);
      setChatEnabled(chatSettings?.email_notifications_enabled ?? null);
    } catch (err) {
      setError('Failed to load notification settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (chatEnabled === null) {
        await updateChatNotificationSettings(user.id, conversationId, false);
        setChatEnabled(false);
      } else if (chatEnabled === false) {
        await deleteChatNotificationSettings(user.id, conversationId);
        setChatEnabled(null);
      } else {
        await updateChatNotificationSettings(user.id, conversationId, false);
        setChatEnabled(false);
      }
      setSuccess('Notification settings updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnable = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateChatNotificationSettings(user.id, conversationId, true);
      setChatEnabled(true);
      setSuccess('Notifications enabled for this chat');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateChatNotificationSettings(user.id, conversationId, false);
      setChatEnabled(false);
      setSuccess('Notifications disabled for this chat');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUseDefault = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteChatNotificationSettings(user.id, conversationId);
      setChatEnabled(null);
      setSuccess('Using default notification settings');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const effectiveStatus = chatEnabled === null ? globalEnabled : chatEnabled;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
              <p className="text-sm text-gray-600 mt-1">{conversationName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {effectiveStatus ? (
                    <Bell className="h-5 w-5 text-teal-600" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {effectiveStatus ? 'Notifications Enabled' : 'Notifications Disabled'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {chatEnabled === null
                        ? `Using default settings (${globalEnabled ? 'enabled' : 'disabled'})`
                        : chatEnabled
                        ? 'Custom: Enabled for this chat'
                        : 'Custom: Disabled for this chat'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Email Notifications</p>

                <button
                  onClick={handleUseDefault}
                  disabled={saving || chatEnabled === null}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                    chatEnabled === null
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-gray-900">Use Default Settings</div>
                  <div className="text-sm text-gray-600">
                    Follow your global notification preferences ({globalEnabled ? 'enabled' : 'disabled'})
                  </div>
                </button>

                <button
                  onClick={handleEnable}
                  disabled={saving || chatEnabled === true}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                    chatEnabled === true
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-gray-900">Always Notify</div>
                  <div className="text-sm text-gray-600">
                    Receive notifications for this chat even if globally disabled
                  </div>
                </button>

                <button
                  onClick={handleDisable}
                  disabled={saving || chatEnabled === false}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                    chatEnabled === false
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium text-gray-900">Mute Notifications</div>
                  <div className="text-sm text-gray-600">
                    Don't receive notifications for this chat even if globally enabled
                  </div>
                </button>
              </div>

              {!globalEnabled && chatEnabled !== true && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Email notifications are globally disabled. To receive notifications for this
                    chat, either enable global notifications in your profile settings or select
                    "Always Notify" above.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
