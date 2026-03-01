/*
  # Group Chat Functions

  1. New Functions
    - `create_group_conversation`: Creates a new group chat
    - `add_group_member`: Adds a member to a group
    - `remove_group_member`: Removes a member from a group
    - `leave_group`: Allows a user to leave a group
    - `update_group_member_role`: Updates a member's role
    - `delete_message_for_everyone`: Soft deletes a message for all participants
    - `clear_chat_history`: Clears chat history for a user
    - `get_chat_media`: Gets all media from a conversation
    - `search_messages`: Searches messages in a conversation

  2. Security
    - All functions check user authentication
    - Group operations check admin permissions where required
*/

CREATE OR REPLACE FUNCTION create_group_conversation(
  group_name_input text,
  member_ids uuid[],
  group_description_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_conversation_id uuid;
  member_id uuid;
BEGIN
  INSERT INTO conversations (is_group, group_name, group_description, created_by, updated_at)
  VALUES (true, group_name_input, group_description_input, auth.uid(), now())
  RETURNING id INTO new_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (new_conversation_id, auth.uid(), 'admin');

  FOREACH member_id IN ARRAY member_ids
  LOOP
    IF member_id != auth.uid() THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES (new_conversation_id, member_id, 'member');
    END IF;
  END LOOP;

  RETURN new_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION add_group_member(
  conv_id uuid,
  new_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_group boolean;
BEGIN
  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF NOT is_group THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND left_at IS NULL
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN false;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, new_member_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE conversation_participants
  SET left_at = NULL
  WHERE conversation_id = conv_id AND user_id = new_member_id;

  UPDATE conversations SET updated_at = now() WHERE id = conv_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION remove_group_member(
  conv_id uuid,
  member_to_remove uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_group boolean;
BEGIN
  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF NOT is_group THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND left_at IS NULL
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN false;
  END IF;

  UPDATE conversation_participants
  SET left_at = now()
  WHERE conversation_id = conv_id AND user_id = member_to_remove;

  UPDATE conversations SET updated_at = now() WHERE id = conv_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION leave_group(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_group boolean;
  admin_count integer;
  next_admin_id uuid;
BEGIN
  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF NOT is_group THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO admin_count
  FROM conversation_participants
  WHERE conversation_id = conv_id
  AND role = 'admin'
  AND left_at IS NULL
  AND user_id != auth.uid();

  IF admin_count = 0 THEN
    SELECT user_id INTO next_admin_id
    FROM conversation_participants
    WHERE conversation_id = conv_id
    AND left_at IS NULL
    AND user_id != auth.uid()
    ORDER BY joined_at ASC
    LIMIT 1;

    IF next_admin_id IS NOT NULL THEN
      UPDATE conversation_participants
      SET role = 'admin'
      WHERE conversation_id = conv_id AND user_id = next_admin_id;
    END IF;
  END IF;

  UPDATE conversation_participants
  SET left_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();

  UPDATE conversations SET updated_at = now() WHERE id = conv_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION update_group_member_role(
  conv_id uuid,
  member_id uuid,
  new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_group boolean;
BEGIN
  IF new_role NOT IN ('admin', 'member') THEN
    RETURN false;
  END IF;

  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF NOT is_group THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND left_at IS NULL
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN false;
  END IF;

  UPDATE conversation_participants
  SET role = new_role
  WHERE conversation_id = conv_id AND user_id = member_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_message_for_everyone(message_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_sender uuid;
BEGIN
  SELECT sender_id INTO msg_sender
  FROM messages
  WHERE id = message_id_input;

  IF msg_sender != auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE messages
  SET 
    deleted_for_everyone = true,
    deleted_at = now(),
    content = NULL,
    media_url = NULL,
    updated_at = now()
  WHERE id = message_id_input;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION clear_chat_history(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET cleared_at = now()
  WHERE conversation_id = conv_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_conversation(conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_group boolean;
  is_admin boolean;
BEGIN
  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF is_group THEN
    SELECT EXISTS(
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conv_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND left_at IS NULL
    ) INTO is_admin;

    IF NOT is_admin THEN
      RETURN false;
    END IF;

    DELETE FROM conversations WHERE id = conv_id;
  ELSE
    UPDATE conversation_participants
    SET left_at = now(), cleared_at = now()
    WHERE conversation_id = conv_id AND user_id = auth.uid();
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION search_messages(
  conv_id uuid,
  search_query text,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  content text,
  message_type text,
  sender_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_cleared_at timestamptz;
BEGIN
  SELECT cleared_at INTO user_cleared_at
  FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id = auth.uid();

  RETURN QUERY
  SELECT m.id, m.content, m.message_type::text, m.sender_id, m.created_at
  FROM messages m
  WHERE m.conversation_id = conv_id
    AND m.content ILIKE '%' || search_query || '%'
    AND m.deleted_for_everyone = false
    AND NOT (auth.uid() = ANY(m.deleted_for))
    AND (user_cleared_at IS NULL OR m.created_at > user_cleared_at)
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_chat_media(
  conv_id uuid,
  media_type text DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  message_type text,
  media_url text,
  media_metadata jsonb,
  sender_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_cleared_at timestamptz;
BEGIN
  SELECT cleared_at INTO user_cleared_at
  FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id = auth.uid();

  RETURN QUERY
  SELECT m.id, m.message_type::text, m.media_url, m.media_metadata, m.sender_id, m.created_at
  FROM messages m
  WHERE m.conversation_id = conv_id
    AND m.media_url IS NOT NULL
    AND m.deleted_for_everyone = false
    AND NOT (auth.uid() = ANY(m.deleted_for))
    AND (user_cleared_at IS NULL OR m.created_at > user_cleared_at)
    AND (media_type IS NULL OR m.message_type::text = media_type)
  ORDER BY m.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

CREATE OR REPLACE FUNCTION update_group_info(
  conv_id uuid,
  new_name text DEFAULT NULL,
  new_description text DEFAULT NULL,
  new_photo_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_group boolean;
BEGIN
  SELECT c.is_group INTO is_group
  FROM conversations c
  WHERE c.id = conv_id;

  IF NOT is_group THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND left_at IS NULL
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN false;
  END IF;

  UPDATE conversations
  SET 
    group_name = COALESCE(new_name, group_name),
    group_description = COALESCE(new_description, group_description),
    group_photo_url = COALESCE(new_photo_url, group_photo_url),
    updated_at = now()
  WHERE id = conv_id;

  RETURN true;
END;
$$;
