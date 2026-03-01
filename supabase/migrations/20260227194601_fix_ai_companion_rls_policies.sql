/*
  # Fix AI Companion RLS Policies

  ## Problem
  The SELECT policy on ai_companion_messages calls is_conversation_participant(conversation_id)
  with ONE argument, but the function signature requires TWO arguments:
    is_conversation_participant(conv_id uuid, check_user_id uuid)
  
  This causes the policy to error silently, blocking ALL reads from the table including
  realtime subscriptions — so Amisha's messages are inserted but never visible to users.

  ## Fix
  Drop the broken policy and recreate it with the correct 2-argument call, passing
  auth.uid() as the second argument explicitly.

  Also add a simpler inline EXISTS check as a fallback approach.
*/

DROP POLICY IF EXISTS "Participants see public AI messages" ON ai_companion_messages;

CREATE POLICY "Participants see public AI messages"
  ON ai_companion_messages FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = ai_companion_messages.conversation_id
          AND cp.user_id = auth.uid()
      )
    )
    AND (
      ai_message_public IS NOT NULL
      OR private_recipient_id = auth.uid()
    )
  );
