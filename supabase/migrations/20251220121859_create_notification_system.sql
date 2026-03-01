/*
  # Email Notification System

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email_notifications_enabled` (boolean) - Global toggle
      - `notification_sound_enabled` (boolean) - For future use
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `chat_notification_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `conversation_id` (uuid, references conversations)
      - `email_notifications_enabled` (boolean) - Per-chat override
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, conversation_id)
    
    - `email_notification_logs`
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `recipient_user_id` (uuid, references auth.users)
      - `recipient_email` (text)
      - `sender_name` (text)
      - `chat_name` (text)
      - `message_preview` (text)
      - `status` (text) - 'pending', 'sent', 'failed'
      - `error_message` (text, nullable)
      - `sent_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only manage their own notification preferences
    - Only system can write to email_notification_logs
    - Users can read their own email notification logs

  3. Functions
    - Auto-create default notification preferences for new users
    - Helper function to check if user should receive email notification
*/

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_notifications_enabled boolean DEFAULT true NOT NULL,
  notification_sound_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create chat_notification_settings table
CREATE TABLE IF NOT EXISTS chat_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  email_notifications_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, conversation_id)
);

ALTER TABLE chat_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat notification settings"
  ON chat_notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat notification settings"
  ON chat_notification_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create email_notification_logs table
CREATE TABLE IF NOT EXISTS email_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  sender_name text NOT NULL,
  chat_name text NOT NULL,
  message_preview text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email notification logs"
  ON email_notification_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Service role can manage email notification logs"
  ON email_notification_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient 
  ON email_notification_logs(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_message 
  ON email_notification_logs(message_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
  ON email_notification_logs(status, created_at);

-- Function to auto-create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when user is created
DROP TRIGGER IF EXISTS on_user_created_notification_preferences ON users;
CREATE TRIGGER on_user_created_notification_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to check if user should receive email notification
CREATE OR REPLACE FUNCTION should_send_email_notification(
  p_user_id uuid,
  p_conversation_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_global_enabled boolean;
  v_chat_enabled boolean;
BEGIN
  -- Get global preference (default to true if not set)
  SELECT COALESCE(email_notifications_enabled, true)
  INTO v_global_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If global is disabled, return false
  IF v_global_enabled = false THEN
    RETURN false;
  END IF;
  
  -- Check chat-specific setting (if exists)
  SELECT email_notifications_enabled
  INTO v_chat_enabled
  FROM chat_notification_settings
  WHERE user_id = p_user_id
    AND conversation_id = p_conversation_id;
  
  -- If chat setting exists, use it; otherwise use global setting
  RETURN COALESCE(v_chat_enabled, v_global_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;