/*
  # Fix AI Companion Realtime

  Sets REPLICA IDENTITY FULL on ai_companion_messages so that
  Supabase Realtime column filters (conversation_id=eq.X) work correctly.
  Without this, filtered subscriptions silently fail to deliver messages.
*/

ALTER TABLE ai_companion_messages REPLICA IDENTITY FULL;

DELETE FROM ai_companion_messages WHERE ai_message_public = 'Test: Amisha ka jawab aa gaya!';
