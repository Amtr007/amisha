/*
  # Fix delete_message_for_everyone for AI Messages

  Allows conversation participants to delete AI (Amisha) messages for everyone,
  not just their own messages. The function now checks if the user is the sender
  OR if the message was sent by an AI user.
*/

CREATE OR REPLACE FUNCTION delete_message_for_everyone(message_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_sender uuid;
  msg_conversation_id uuid;
  is_ai boolean;
  is_participant boolean;
BEGIN
  -- Get message details
  SELECT sender_id, conversation_id INTO msg_sender, msg_conversation_id
  FROM messages
  WHERE id = message_id_input;

  IF msg_sender IS NULL THEN
    RETURN false;
  END IF;

  -- Check if the message sender is an AI user
  SELECT COALESCE(u.is_ai_user, false) INTO is_ai
  FROM users u
  WHERE u.id = msg_sender;

  -- If sender is current user → allow (original behavior)
  IF msg_sender = auth.uid() THEN
    UPDATE messages
    SET
      deleted_for_everyone = true,
      deleted_at = now(),
      content = NULL,
      media_url = NULL,
      updated_at = now()
    WHERE id = message_id_input;
    RETURN true;
  END IF;

  -- If sender is AI and current user is a participant → allow
  IF is_ai THEN
    SELECT EXISTS(
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = msg_conversation_id
      AND user_id = auth.uid()
      AND left_at IS NULL
    ) INTO is_participant;

    IF is_participant THEN
      UPDATE messages
      SET
        deleted_for_everyone = true,
        deleted_at = now(),
        content = NULL,
        media_url = NULL,
        updated_at = now()
      WHERE id = message_id_input;
      RETURN true;
    END IF;
  END IF;

  -- Otherwise deny
  RETURN false;
END;
$$;
