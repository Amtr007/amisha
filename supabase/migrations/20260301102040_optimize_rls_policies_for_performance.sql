/*
  # Optimize RLS policies for performance

  1. Changes
    - Replace per-row `is_conversation_participant(conversation_id)` function calls
      with `IN (SELECT ...)` subqueries that Postgres can optimize to execute once
    - Affects: messages (SELECT, INSERT, UPDATE), conversations (SELECT, UPDATE)
    - This fixes the continuous loading issue after login caused by thousands of
      per-row function evaluations on the messages table

  2. Security
    - All policies maintain the same access control logic
    - Authenticated users can only see messages/conversations they participate in
    - Message deletion visibility (deleted_for) check preserved
    - Ownership checks on INSERT preserved
*/

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    AND NOT (auth.uid() = ANY(deleted_for))
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;
CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );
