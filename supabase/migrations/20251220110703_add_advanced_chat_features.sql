/*
  # Advanced Chat Features Migration

  1. Schema Changes
    - Add `deleted_at` and `deleted_for_everyone` to messages table
    - Create `starred_messages` table for per-user favorites
    - Create `important_dates` table for reminders/anniversaries
    - Update `conversations` table with group chat support
    - Create `group_photos` storage bucket
    - Add indexes for performance

  2. New Tables
    - `starred_messages`: Stores user's starred/favorite messages
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `message_id` (uuid, references messages)
      - `created_at` (timestamp)
    
    - `important_dates`: Stores important dates per conversation
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `user_id` (uuid, references users)
      - `title` (text)
      - `date` (date)
      - `notes` (text, optional)
      - `reminder_enabled` (boolean)
      - `created_at` (timestamp)

  3. Conversation Updates
    - Add `is_group` boolean flag
    - Add `group_name` for group chats
    - Add `group_photo_url` for group image
    - Add `created_by` to track group creator

  4. Participant Updates
    - Add `role` column (admin/member)
    - Add `left_at` for tracking when users leave
    - Add `muted_until` for muting conversations

  5. Security
    - Enable RLS on all new tables
    - Create appropriate policies for data access
*/

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean DEFAULT false;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS group_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS group_photo_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS group_description text DEFAULT NULL;

ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
ADD COLUMN IF NOT EXISTS left_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS muted_until timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cleared_at timestamptz DEFAULT NULL;

CREATE TABLE IF NOT EXISTS starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, message_id)
);

CREATE TABLE IF NOT EXISTS important_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  notes text DEFAULT NULL,
  reminder_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message ON starred_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_conversation ON important_dates(conversation_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_user ON important_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON conversations(is_group);
CREATE INDEX IF NOT EXISTS idx_participants_role ON conversation_participants(role);

ALTER TABLE starred_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own starred messages'
    AND tablename = 'starred_messages'
  ) THEN
    CREATE POLICY "Users can view own starred messages"
      ON starred_messages FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can star messages'
    AND tablename = 'starred_messages'
  ) THEN
    CREATE POLICY "Users can star messages"
      ON starred_messages FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can unstar messages'
    AND tablename = 'starred_messages'
  ) THEN
    CREATE POLICY "Users can unstar messages"
      ON starred_messages FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own important dates'
    AND tablename = 'important_dates'
  ) THEN
    CREATE POLICY "Users can view own important dates"
      ON important_dates FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create important dates'
    AND tablename = 'important_dates'
  ) THEN
    CREATE POLICY "Users can create important dates"
      ON important_dates FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own important dates'
    AND tablename = 'important_dates'
  ) THEN
    CREATE POLICY "Users can update own important dates"
      ON important_dates FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own important dates'
    AND tablename = 'important_dates'
  ) THEN
    CREATE POLICY "Users can delete own important dates"
      ON important_dates FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-photos',
  'group-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can upload group photos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can upload group photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'group-photos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view group photos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view group photos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'group-photos');
  END IF;
END $$;
