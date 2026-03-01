import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Volume2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  getEmailNotificationLogs,
} from '../services/notifications';
import type { NotificationPreferences, EmailNotificationLog } from '../types/database';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

export function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [logs, setLogs] = useState<EmailNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
    loadLogs();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await getNotificationPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      setError('Failed to load notification preferences');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!user) return;

    try {
      const notificationLogs = await getEmailNotificationLogs(user.id, 20);
      setLogs(notificationLogs);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const handleToggleEmail = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateNotificationPreferences(user.id, {
        email_notifications_enabled: !preferences.email_notifications_enabled,
      });
      setPreferences(updated);
      setSuccess('Email notification settings updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSound = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateNotificationPreferences(user.id, {
        notification_sound_enabled: !preferences.notification_sound_enabled,
      });
      setPreferences(updated);
      setSuccess('Sound notification settings updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'skipped':
        return 'text-gray-500';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
        <p className="text-gray-600">Manage how you receive notifications</p>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Mail className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Email Notifications</h3>
                <p className="text-sm text-gray-600">
                  Receive email notifications when you get new messages
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleEmail}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                preferences?.email_notifications_enabled ? 'bg-teal-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences?.email_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Volume2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sound Notifications</h3>
                <p className="text-sm text-gray-600">Play a sound when you receive messages</p>
              </div>
            </div>
            <button
              onClick={handleToggleSound}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                preferences?.notification_sound_enabled ? 'bg-teal-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences?.notification_sound_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-teal-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Per-Chat Settings</h4>
            <p className="text-sm text-gray-700">
              You can also customize notification settings for individual chats. Open any chat, tap
              the menu, and select "Notification Settings" to control notifications for that
              specific conversation.
            </p>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Email Notifications</h3>
            <p className="text-sm text-gray-600 mt-1">Last 20 email notifications sent</p>
          </div>
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`flex items-center space-x-1 ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span className="text-xs font-medium uppercase">{log.status}</span>
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      From: {log.sender_name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">Chat: {log.chat_name}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{log.message_preview}</p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
