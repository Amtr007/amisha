/*
  # Add Message Editing Support

  1. Changes
    - Add `edited_at` timestamp column to `messages` table to track when a message was last edited
    - Add `original_content` column to preserve the original message content for audit purposes
  
  2. Notes
    - Messages can be edited multiple times
    - The `edited_at` timestamp will be null for messages that have never been edited
    - Original content is stored for transparency and audit trail
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'original_content'
  ) THEN
    ALTER TABLE messages ADD COLUMN original_content text DEFAULT NULL;
  END IF;
END $$;