/*
  # Automatic Notification Trigger using pg_net

  1. Overview
    - Creates a database trigger that automatically calls the Edge Function
    - Uses pg_net extension for async HTTP requests
    - Fires on INSERT to messages table
    - More reliable than manual webhook configuration

  2. How it works
    - When a new message is inserted, trigger fires immediately
    - Trigger uses pg_net.http_post to call the Edge Function
    - Request is sent asynchronously (non-blocking)
    - Edge Function processes notifications as before

  3. Benefits
    - No manual Dashboard configuration needed
    - Automatically deployed with migrations
    - Guaranteed to fire on every message insert
*/

-- Create trigger function that calls the Edge Function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
  function_url text;
  auth_header text;
BEGIN
  -- Construct the Edge Function URL
  function_url := current_setting('app.settings.api_url', true) || '/functions/v1/send-message-notification';
  
  -- If custom setting not available, use default Supabase URL format
  IF function_url IS NULL OR function_url = '' THEN
    function_url := 'https://bheuaxjzksshnpejopkb.supabase.co/functions/v1/send-message-notification';
  END IF;
  
  -- Construct authorization header
  auth_header := 'Bearer ' || current_setting('app.settings.anon_key', true);
  
  -- If custom setting not available, use the anon key
  IF auth_header = 'Bearer ' OR auth_header IS NULL THEN
    auth_header := 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZXVheGp6a3NzaG5wZWpvcGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTk1NzIsImV4cCI6MjA4MTc5NTU3Mn0.BDk1Qra9yhiN3TkQwUJbQJ0apoJewixY8sq74bqwycQ';
  END IF;

  -- Make async HTTP POST request to Edge Function
  SELECT INTO request_id net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', jsonb_build_object(
        'id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content,
        'attachment_url', NEW.media_url,
        'attachment_type', NEW.message_type,
        'voice_url', CASE WHEN NEW.message_type = 'voice' THEN NEW.media_url ELSE NULL END,
        'created_at', NEW.created_at,
        'deleted_for_everyone', NEW.deleted_for_everyone
      )
    )
  );

  -- Log the request (optional, for debugging)
  RAISE LOG 'Sent notification request % for message %', request_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;

-- Create trigger on messages table
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Add comment
COMMENT ON FUNCTION notify_new_message() IS 'Automatically calls send-message-notification Edge Function using pg_net when a new message is inserted';
