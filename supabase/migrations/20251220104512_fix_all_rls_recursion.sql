/*
  # Complete RLS Policy Fix - Resolve Infinite Recursion

  ## Problem
  The RLS policies on conversation_participants, messages, and storage.objects
  all query conversation_participants to check user access. This causes infinite
  recursion because:
  - When checking conversation_participants SELECT policy, it queries conversation_participants
  - This triggers the same policy check, creating an infinite loop

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check participation
  2. Drop all problematic policies
  3. Recreate policies using the new function

  ## Changes
  - New function: is_conversation_participant(conv_id, user_id)
  - Updated policies on: conversations, conversation_participants, messages, message_reactions
  - Updated storage policies for all chat buckets
*/

-- Step 1: Create helper function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id uuid, check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = COALESCE(check_user_id, auth.uid())
  );
$$;

-- Step 2: Create function to get user's conversation IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_conversation_ids(check_user_id uuid DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT conversation_id FROM conversation_participants
  WHERE user_id = COALESCE(check_user_id, auth.uid());
$$;

-- Step 3: Drop all existing policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Step 4: Recreate conversation_participants policies using helper function
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (SELECT get_user_conversation_ids())
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

-- Step 5: Drop all existing policies on conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;

-- Step 6: Recreate conversations policies
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  TO authenticated
  USING (is_conversation_participant(id));

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  TO authenticated
  USING (is_conversation_participant(id));

-- Step 7: Drop all existing policies on messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Step 8: Recreate messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    is_conversation_participant(conversation_id)
    AND NOT (auth.uid() = ANY(deleted_for))
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id)
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (is_conversation_participant(conversation_id));

-- Step 9: Drop all existing policies on message_reactions
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;

-- Step 10: Recreate message_reactions policies
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(m.conversation_id)
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(m.conversation_id)
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 11: Drop all existing storage policies
DROP POLICY IF EXISTS "Users can upload images to their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images from their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload videos to their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view videos from their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload voice messages to their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view voice messages from their conversations" ON storage.objects;

-- Step 12: Recreate storage policies using helper function
-- chat-images
CREATE POLICY "Users can upload images to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can view images from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

-- chat-videos
CREATE POLICY "Users can upload videos to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-videos'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can view videos from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-videos'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

-- chat-files
CREATE POLICY "Users can upload files to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can view files from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

-- chat-voice
CREATE POLICY "Users can upload voice messages to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-voice'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Users can view voice messages from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-voice'
    AND is_conversation_participant((storage.foldername(name))[1]::uuid)
  );