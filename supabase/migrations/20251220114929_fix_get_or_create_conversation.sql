/*
  # Fix get_or_create_conversation Function

  1. Changes
    - Update function to filter for non-group conversations only
    - Ensure new conversations are created with is_group = false
    - This fixes the issue where selecting a user doesn't create/find a direct chat properly
*/

CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF other_user_id IS NULL THEN
    RAISE EXCEPTION 'Other user ID is required';
  END IF;

  SELECT c.id INTO conv_id
  FROM conversations c
  JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
  JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
  WHERE cp1.user_id = current_user_id
  AND cp2.user_id = other_user_id
  AND cp1.left_at IS NULL
  AND cp2.left_at IS NULL
  AND c.is_group = false
  AND (
    SELECT COUNT(*) FROM conversation_participants cp3 
    WHERE cp3.conversation_id = c.id AND cp3.left_at IS NULL
  ) = 2
  LIMIT 1;
  
  IF conv_id IS NULL THEN
    INSERT INTO conversations (is_group) VALUES (false) RETURNING id INTO conv_id;
    
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES 
      (conv_id, current_user_id, 'member'),
      (conv_id, other_user_id, 'member');
  END IF;
  
  RETURN conv_id;
END;
$$;
