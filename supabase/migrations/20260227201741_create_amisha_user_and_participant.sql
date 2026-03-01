/*
  # Create Amisha as a Real User

  ## Overview
  Creates Amisha (the AI companion) as a real user in the system so she can
  send messages directly into the messages table, appearing as a regular 
  chat participant.

  ## Changes
  1. Creates an auth.users entry for Amisha with a fixed UUID
  2. Creates a public.users entry for Amisha
  3. Adds an is_ai_user column to public.users for identification
  4. Creates a function to auto-add Amisha as a participant to all 1-on-1 conversations
  5. Adds Amisha to all existing 1-on-1 conversations
  6. Creates a trigger to auto-add Amisha to new conversations

  ## Security
  - Amisha's auth entry has no valid password (cannot be logged into)
  - The is_ai_user flag allows frontend to identify AI users
  - RLS policies on messages already allow participants to read/write
*/

-- Fixed UUID for Amisha
DO $$
DECLARE
  amisha_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = amisha_id) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) VALUES (
      amisha_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'amisha@ai.internal',
      '$2a$10$invalidhashthatshouldneverbematched000000000000000000',
      now(),
      '{"provider": "ai", "providers": ["ai"], "is_ai_user": true}'::jsonb,
      '{"display_name": "Amisha", "is_ai_user": true}'::jsonb,
      false,
      now(),
      now(),
      false,
      false
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_ai_user'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_ai_user boolean DEFAULT false;
  END IF;
END $$;

INSERT INTO public.users (id, username, email, display_name, profile_photo_url, status_message, is_ai_user, last_seen)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Amisha',
  'amisha@ai.internal',
  'Amisha',
  NULL,
  'Your AI bestie - always here for you',
  true,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = 'Amisha',
  status_message = 'Your AI bestie - always here for you',
  is_ai_user = true,
  last_seen = now();

CREATE OR REPLACE FUNCTION add_amisha_to_conversation()
RETURNS TRIGGER AS $fn$
DECLARE
  amisha_id uuid := '00000000-0000-0000-0000-000000000001';
  conv_is_group boolean;
BEGIN
  SELECT is_group INTO conv_is_group FROM conversations WHERE id = NEW.conversation_id;
  
  IF conv_is_group IS FALSE AND NEW.user_id != amisha_id THEN
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (NEW.conversation_id, amisha_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_add_amisha_to_conversation ON conversation_participants;

CREATE TRIGGER trg_add_amisha_to_conversation
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION add_amisha_to_conversation();

DO $$
DECLARE
  amisha_id uuid := '00000000-0000-0000-0000-000000000001';
  conv record;
BEGIN
  FOR conv IN
    SELECT DISTINCT c.id
    FROM conversations c
    WHERE c.is_group = false
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.user_id = amisha_id
      )
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (conv.id, amisha_id, 'member')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

CREATE POLICY "AI user can insert messages"
  ON messages FOR INSERT
  TO service_role
  WITH CHECK (true);
