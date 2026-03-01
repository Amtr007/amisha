/*
  # Database Webhook for Message Notifications

  1. Configuration
    - Creates a webhook configuration to trigger the Edge Function
    - Webhook fires on INSERT to messages table
    - Passes new message data to the Edge Function

  Note: The actual webhook needs to be configured in Supabase Dashboard:
  1. Go to Database > Webhooks
  2. Enable "Enable Webhooks" if not already enabled
  3. Create a new webhook:
     - Name: "send_message_notification"
     - Table: "messages"
     - Events: INSERT
     - Type: HTTP Request
     - Method: POST
     - URL: https://[project-ref].supabase.co/functions/v1/send-message-notification
     - HTTP Headers: 
       - Authorization: Bearer [anon-key]
       - Content-Type: application/json

  This migration adds a comment to document the webhook setup.
*/

-- Add comment to messages table documenting the webhook
COMMENT ON TABLE messages IS 'Messages table with webhook trigger for email notifications. Webhook should be configured to call send-message-notification Edge Function on INSERT events.';