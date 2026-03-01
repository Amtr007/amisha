/*
  # Create batch function for fetching last messages

  1. New Functions
    - `get_last_messages_for_conversations(uuid[])`: Returns the most recent
      non-deleted message for each conversation in a single query, avoiding
      N+1 query pattern from the frontend

  2. Important Notes
    - Uses DISTINCT ON to efficiently pick one message per conversation
    - Filters out messages deleted for the requesting user
    - Filters out messages deleted for everyone
*/

CREATE OR REPLACE FUNCTION get_last_messages_for_conversations(conv_ids uuid[])
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  message_type text,
  media_url text,
  media_metadata jsonb,
  reply_to_id uuid,
  deleted_for uuid[],
  deleted_for_everyone boolean,
  deleted_at timestamptz,
  edited_at timestamptz,
  original_content text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  sender_username text,
  sender_display_name text,
  sender_profile_photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type::text,
    m.media_url,
    m.media_metadata,
    m.reply_to_id,
    m.deleted_for,
    m.deleted_for_everyone,
    m.deleted_at,
    m.edited_at,
    m.original_content,
    m.status::text,
    m.created_at,
    m.updated_at,
    u.username as sender_username,
    u.display_name as sender_display_name,
    u.profile_photo_url as sender_profile_photo_url
  FROM messages m
  LEFT JOIN users u ON u.id = m.sender_id
  WHERE m.conversation_id = ANY(conv_ids)
    AND m.deleted_for_everyone = false
    AND NOT (auth.uid() = ANY(m.deleted_for))
  ORDER BY m.conversation_id, m.created_at DESC;
$$;
