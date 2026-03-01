/*
  # Enable Real-time Updates for Messaging

  1. Configuration Changes
    - Enable replica identity FULL for all messaging tables
    - This ensures real-time synchronization works properly across devices
    
  2. Tables Affected
    - `messages` - Real-time message delivery
    - `conversations` - Real-time conversation updates
    - `conversation_participants` - Real-time typing indicators and read receipts
    - `message_reactions` - Real-time reaction updates
    
  3. Purpose
    - Ensures messages appear instantly on all devices
    - Enables real-time typing indicators
    - Synchronizes read receipts across devices
    - Updates reactions in real-time
*/

-- Enable replica identity for real-time to work properly
-- This allows real-time to send the full row data for UPDATE and DELETE events
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;
