/*
  # Storage Buckets for Chat Media

  1. New Buckets
    - `chat-images` - For image uploads (jpg, png, gif, webp)
    - `chat-videos` - For video uploads (mp4, webm, mov)
    - `chat-files` - For document uploads (pdf, doc, docx, xls, xlsx, txt)
    - `chat-voice` - For voice message uploads (webm, mp3, ogg, wav)

  2. Security
    - Only authenticated users can upload
    - Users can only access media from conversations they participate in
    - File size limits enforced via policies
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('chat-images', 'chat-images', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('chat-videos', 'chat-videos', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('chat-files', 'chat-files', false, 26214400, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']),
  ('chat-voice', 'chat-voice', false, 5242880, ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for chat-images
CREATE POLICY "Users can upload images to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view images from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Storage policies for chat-videos
CREATE POLICY "Users can upload videos to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-videos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view videos from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-videos'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Storage policies for chat-files
CREATE POLICY "Users can upload files to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view files from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Storage policies for chat-voice
CREATE POLICY "Users can upload voice messages to their conversations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-voice'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view voice messages from their conversations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-voice'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );