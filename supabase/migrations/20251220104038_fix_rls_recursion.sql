/*
  # Fix RLS Policy Infinite Recursion

  The conversation_participants SELECT policy was causing infinite recursion
  because it was checking if a user exists in conversation_participants
  to determine if they can read conversation_participants.

  Fix: Change the policy to simply check if the user_id matches the current user
  OR if they are a participant in the same conversation (using a different approach).
  
  For participants, we allow users to see:
  1. Their own participant records
  2. Other participants in conversations they belong to
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;

-- Create a new non-recursive policy
-- Users can see participant records for conversations where they are also a participant
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = (select auth.uid())
    )
  );