/*
  # Real-time Messaging System Schema

  1. New Tables
    - `conversations` - Chat conversations between users
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz) - Last activity timestamp
      
    - `conversation_participants` - Links users to conversations
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `user_id` (uuid, references users)
      - `joined_at` (timestamptz)
      - `last_read_at` (timestamptz) - For read receipts
      - `is_typing` (boolean) - Typing indicator
      - `typing_updated_at` (timestamptz)
      
    - `messages` - Individual messages
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `sender_id` (uuid, references users)
      - `content` (text) - Text content
      - `message_type` (text) - text, image, video, file, voice
      - `media_url` (text) - URL to media in storage
      - `media_metadata` (jsonb) - File size, duration, dimensions, etc.
      - `reply_to_id` (uuid, references messages) - For reply feature
      - `status` (text) - sent, delivered, read
      - `is_deleted` (boolean) - Soft delete for "delete for me"
      - `deleted_for` (uuid[]) - Array of user IDs who deleted this message
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `message_reactions` - Reactions to messages
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `user_id` (uuid, references users)
      - `emoji` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS policies ensuring users can only access their own conversations
    - Participants can only see messages in conversations they belong to

  3. Indexes
    - conversation_id on participants and messages for fast lookups
    - created_at on messages for ordering
    - user_id on participants for user's conversation list
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_typing boolean DEFAULT false,
  typing_updated_at timestamptz,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'voice')),
  media_url text,
  media_metadata jsonb DEFAULT '{}',
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  is_deleted boolean DEFAULT false,
  deleted_for uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
    AND NOT (auth.uid() = ANY(deleted_for))
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Find existing conversation between these two users
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
  AND cp2.user_id = other_user_id
  AND (
    SELECT COUNT(*) FROM conversation_participants cp3 
    WHERE cp3.conversation_id = cp1.conversation_id
  ) = 2;
  
  -- If no conversation exists, create one
  IF conv_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, current_user_id), (conv_id, other_user_id);
  END IF;
  
  RETURN conv_id;
END;
$$;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(conv_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread integer;
  last_read timestamptz;
BEGIN
  SELECT last_read_at INTO last_read
  FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id = auth.uid();
  
  SELECT COUNT(*) INTO unread
  FROM messages
  WHERE conversation_id = conv_id
  AND sender_id != auth.uid()
  AND created_at > COALESCE(last_read, '1970-01-01'::timestamptz)
  AND NOT (auth.uid() = ANY(deleted_for));
  
  RETURN unread;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update participant's last_read_at
  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();
  
  -- Update message status to 'read' for messages sent by other users
  UPDATE messages
  SET status = 'read', updated_at = now()
  WHERE conversation_id = conv_id
  AND sender_id != auth.uid()
  AND status != 'read';
END;
$$;

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(conv_id uuid, typing boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversation_participants
  SET is_typing = typing, typing_updated_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();
END;
$$;

-- Function to update conversation timestamp when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;