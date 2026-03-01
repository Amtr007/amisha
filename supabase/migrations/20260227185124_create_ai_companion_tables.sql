/*
  # AI Relationship Companion Tables

  ## Overview
  Adds tables to support the AI Relationship Companion feature, which monitors
  conversations between two users and provides emotional intelligence, conflict
  mediation, and empathetic guidance in simple Hindi.

  ## New Tables

  ### ai_companion_messages
  Stores AI-generated analysis and advisory messages for conversations.
  - id: unique message ID
  - conversation_id: which conversation this belongs to
  - trigger_type: what caused the AI to respond (new_message, user_online, fight_detected, unread_delay, silence)
  - emotion_analysis: AI's brief emotion summary
  - context_summary: AI's summary of what's happening
  - ai_message_public: message visible to ALL participants (for mediation)
  - private_recipient_id: user who receives the private message (nullable)
  - ai_message_private: message only visible to private_recipient (for private advice)
  - reply_suggestions: JSON with mature/romantic/light_funny reply options
  - should_intervene: whether AI decided to actually intervene
  - created_at: timestamp

  ### ai_companion_dismissals
  Tracks which users have dismissed which AI companion messages.
  - id, message_id, user_id, created_at
  - UNIQUE on (message_id, user_id) prevents double dismissal

  ### ai_companion_settings
  Per-user, per-conversation toggle for the AI companion.
  - id, conversation_id, user_id, is_enabled
  - UNIQUE on (conversation_id, user_id)

  ## Security
  - RLS enabled on all three tables
  - ai_companion_messages: participants can see public messages, private messages only visible to recipient
  - ai_companion_dismissals: users can only insert/view their own dismissals
  - ai_companion_settings: users can only manage their own settings
  - service_role can insert AI messages (used by edge function)

  ## Realtime
  - ai_companion_messages added to realtime publication for live delivery
*/

-- AI companion generated messages
CREATE TABLE IF NOT EXISTS ai_companion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'new_message',
  emotion_analysis text,
  context_summary text,
  ai_message_public text,
  private_recipient_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ai_message_private text,
  reply_suggestions jsonb DEFAULT '{}',
  should_intervene boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Track which users dismissed which AI messages
CREATE TABLE IF NOT EXISTS ai_companion_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES ai_companion_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Per-user, per-conversation AI companion toggle
CREATE TABLE IF NOT EXISTS ai_companion_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE ai_companion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_companion_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_companion_settings ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_companion_messages_conversation ON ai_companion_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_companion_dismissals_message ON ai_companion_dismissals(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_companion_dismissals_user ON ai_companion_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_companion_settings_user_conv ON ai_companion_settings(conversation_id, user_id);

-- RLS: ai_companion_messages
-- Participants can see public messages; private messages only visible to recipient
CREATE POLICY "Participants see public AI messages"
  ON ai_companion_messages FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(conversation_id)
    AND (
      ai_message_public IS NOT NULL
      OR private_recipient_id = auth.uid()
    )
  );

-- Only service role can insert AI messages (edge function uses service role key)
CREATE POLICY "Service role inserts AI messages"
  ON ai_companion_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS: ai_companion_dismissals
CREATE POLICY "Users view own dismissals"
  ON ai_companion_dismissals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own dismissals"
  ON ai_companion_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: ai_companion_settings
CREATE POLICY "Users view own AI settings"
  ON ai_companion_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own AI settings"
  ON ai_companion_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own AI settings"
  ON ai_companion_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for live AI message delivery
ALTER PUBLICATION supabase_realtime ADD TABLE ai_companion_messages;
