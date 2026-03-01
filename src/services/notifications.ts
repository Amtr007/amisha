import { supabase } from '../lib/supabase';
import type { NotificationPreferences, ChatNotificationSettings } from '../types/database';

export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { data: newPrefs, error: createError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (createError) throw createError;
    return newPrefs;
  }

  return data;
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: { email_notifications_enabled?: boolean; notification_sound_enabled?: boolean }
) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getChatNotificationSettings(userId: string, conversationId: string) {
  const { data, error } = await supabase
    .from('chat_notification_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateChatNotificationSettings(
  userId: string,
  conversationId: string,
  emailNotificationsEnabled: boolean
) {
  const { data, error } = await supabase
    .from('chat_notification_settings')
    .upsert(
      {
        user_id: userId,
        conversation_id: conversationId,
        email_notifications_enabled: emailNotificationsEnabled,
      },
      { onConflict: 'user_id,conversation_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteChatNotificationSettings(userId: string, conversationId: string) {
  const { error } = await supabase
    .from('chat_notification_settings')
    .delete()
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);

  if (error) throw error;
}

export async function getEmailNotificationLogs(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('email_notification_logs')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
