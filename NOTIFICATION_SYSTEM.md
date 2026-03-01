# Email Notification System Documentation

This document provides complete implementation details for the real-time email notification system integrated into the WhatsApp-style messaging application.

## Overview

The notification system sends instant email alerts to users when they receive new messages in one-to-one or group conversations. The system respects user preferences, implements rate limiting, and follows security best practices.

## Architecture

### Components

1. **Database Tables** - Store user preferences and notification logs
2. **Edge Function** - Serverless function that processes new messages and sends emails
3. **Database Webhook** - Triggers the Edge Function on new message inserts
4. **Frontend UI** - User interface for managing notification settings
5. **Email Service** - Resend API for transactional email delivery

### Flow Diagram

```
New Message Insert
       ↓
Database Webhook Trigger
       ↓
Edge Function (send-message-notification)
       ↓
   ┌──────────────────────────┐
   │ 1. Check if deleted      │
   │ 2. Fetch recipients      │
   │ 3. Check preferences     │
   │ 4. Apply rate limiting   │
   │ 5. Send email via Resend │
   │ 6. Log delivery attempt  │
   └──────────────────────────┘
       ↓
Email delivered to recipient
```

## Database Schema

### notification_preferences

Stores global notification preferences for each user.

```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email_notifications_enabled boolean DEFAULT true,
  notification_sound_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

### chat_notification_settings

Stores per-chat notification overrides.

```sql
CREATE TABLE chat_notification_settings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  conversation_id uuid REFERENCES conversations(id),
  email_notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
```

### email_notification_logs

Tracks all email notification attempts for monitoring and debugging.

```sql
CREATE TABLE email_notification_logs (
  id uuid PRIMARY KEY,
  message_id uuid REFERENCES messages(id),
  recipient_user_id uuid REFERENCES auth.users(id),
  recipient_email text NOT NULL,
  sender_name text NOT NULL,
  chat_name text NOT NULL,
  message_preview text NOT NULL,
  status text CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

## Setup Instructions

### 1. Environment Variables

The following environment variables are automatically configured in Supabase:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `APP_URL` - Frontend application URL (e.g., https://yourapp.com)

**Required Manual Configuration:**

You need to set up a Resend API key:

1. Sign up for Resend at https://resend.com
2. Generate an API key from your Resend dashboard
3. Add the API key to your Supabase project:
   - Go to Project Settings > Edge Functions > Environment Variables
   - Add: `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`

### 2. Database Setup

The database migrations have already been applied:

- `create_notification_system.sql` - Creates tables and functions
- `create_message_notification_webhook.sql` - Documents webhook setup

### 3. Configure Database Webhook

To trigger the Edge Function on new messages:

1. Go to Supabase Dashboard > Database > Webhooks
2. Click "Enable Webhooks" if not already enabled
3. Create a new webhook with these settings:
   - **Name**: `send_message_notification`
   - **Table**: `messages`
   - **Events**: `INSERT` (only)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://[your-project-ref].supabase.co/functions/v1/send-message-notification`
   - **HTTP Headers**:
     - `Authorization`: `Bearer [your-anon-key]`
     - `Content-Type`: `application/json`
4. Save the webhook

### 4. Email Service Configuration

The system uses Resend for sending emails. To customize the sender:

1. Verify your domain in Resend (recommended for production)
2. Update the `from` field in the Edge Function:

```typescript
// In supabase/functions/send-message-notification/index.ts
from: "Chat Notifications <notifications@yourdomain.com>",
```

For development, you can use the default Resend sandbox domain:
```typescript
from: "Chat Notifications <notifications@resend.dev>",
```

## Features

### 1. Global Notification Preferences

Users can enable or disable email notifications globally from their profile settings.

**Location**: Profile page > Notification Settings section

**Options**:
- Email Notifications (on/off)
- Sound Notifications (on/off) - for future use

### 2. Per-Chat Notification Settings

Users can customize notifications for individual chats:

**Location**: Chat window > Menu (⋮) > Notification Settings

**Options**:
- **Use Default Settings** - Follow global preference
- **Always Notify** - Receive emails even if globally disabled
- **Mute Notifications** - Don't receive emails even if globally enabled

### 3. Rate Limiting

Prevents email spam during rapid message bursts:

- **Window**: 5 minutes
- **Limit**: Maximum 5 emails per conversation per user
- **Behavior**: Additional messages are logged as "skipped" with reason "Rate limit exceeded"

You can adjust these limits in the Edge Function:

```typescript
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_EMAILS_PER_WINDOW = 5; // max emails per window
```

### 4. Smart Message Previews

Email content adapts based on message type:

- **Text messages**: Shows first 100 characters
- **Photos**: "📷 Photo"
- **Videos**: "🎥 Video"
- **Voice messages**: "🎤 Voice message"
- **Other attachments**: "📎 Attachment"

### 5. Security Features

- ✅ Respects Row Level Security (RLS) policies
- ✅ Only sends to authorized conversation participants
- ✅ Validates message permissions before sending
- ✅ Excludes sender from receiving notification
- ✅ Skips deleted-for-everyone messages
- ✅ Secure environment variable handling

### 6. Delivery Logging

All notification attempts are logged with:

- Message ID and recipient details
- Sender name and chat name
- Message preview
- Status (pending/sent/failed/skipped)
- Error messages (if any)
- Timestamp

**View logs**: Profile page > Notification Settings > Recent Email Notifications

## Email Template

The email template is production-ready with:

- Responsive HTML design
- Professional gradient header
- Clear message preview
- Direct link to open the chat
- Footer with unsubscribe context

Example email structure:

```
┌─────────────────────────────────┐
│   🗨 New Message                │  (Header)
├─────────────────────────────────┤
│ Hi [Recipient Name],            │
│                                 │
│ You have a new message from     │
│ [Sender Name]:                  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [Sender Name]               │ │
│ │ [Chat Name]                 │ │
│ │ [Message Preview]           │ │
│ │ [Timestamp]                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Open Chat] (Button)            │
│                                 │
│ To manage notification settings │
│ visit your profile.             │
├─────────────────────────────────┤
│ This is an automated            │  (Footer)
│ notification from your          │
│ messaging app.                  │
└─────────────────────────────────┘
```

## Troubleshooting

### Emails Not Being Sent

1. **Check webhook configuration**:
   - Verify webhook is enabled in Supabase Dashboard
   - Confirm URL and headers are correct
   - Check webhook logs for errors

2. **Check environment variables**:
   - Ensure `RESEND_API_KEY` is set
   - Verify `APP_URL` points to your frontend

3. **Check user preferences**:
   - User must have email notifications enabled globally OR for specific chat
   - Check `notification_preferences` table

4. **Check rate limiting**:
   - User may have hit rate limit (5 emails per 5 minutes)
   - Check `email_notification_logs` for "skipped" status

5. **Check Edge Function logs**:
   ```bash
   # View logs in Supabase Dashboard
   # Go to Edge Functions > send-message-notification > Logs
   ```

### Failed Email Deliveries

Check `email_notification_logs` table for error messages:

```sql
SELECT *
FROM email_notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

Common issues:
- Invalid recipient email address
- Resend API key expired or invalid
- Domain not verified (for custom domains)
- Rate limits on Resend side

### Testing the System

1. **Test email sending manually**:
   ```bash
   # Use Supabase Edge Function test feature
   # Or send a test message in the app
   ```

2. **Check notification logs**:
   - Go to Profile > Notification Settings
   - View "Recent Email Notifications" section

3. **Test different scenarios**:
   - Send message with notifications enabled
   - Send message with notifications disabled
   - Test rate limiting (send 6+ messages quickly)
   - Test per-chat settings (mute specific chat)

## API Reference

### Functions

#### should_send_email_notification

Database function that checks if a user should receive email notification.

```sql
SELECT should_send_email_notification(user_id, conversation_id);
-- Returns: boolean
```

**Logic**:
1. Check global preference (default: true)
2. If global is disabled, return false
3. Check chat-specific setting (if exists)
4. Return chat setting or global setting

### Edge Function Endpoint

**URL**: `/functions/v1/send-message-notification`

**Method**: POST (via webhook)

**Payload**:
```json
{
  "type": "INSERT",
  "table": "messages",
  "record": {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "content": "Message text",
    "attachment_url": "url or null",
    "voice_url": "url or null",
    "created_at": "timestamp",
    "deleted_for_everyone": false
  }
}
```

**Response**:
```json
{
  "message": "Notifications processed"
}
```

## Production Considerations

### 1. Email Domain Verification

For production, verify your sending domain in Resend:

1. Add your domain in Resend dashboard
2. Configure DNS records (SPF, DKIM, DMARC)
3. Update the `from` address in Edge Function
4. Test email deliverability

### 2. Monitoring

Set up monitoring for:

- Email delivery success rate
- Failed notification attempts
- Rate limiting hits
- Edge Function errors
- Database webhook failures

Query for monitoring:

```sql
-- Email delivery success rate (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM email_notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### 3. Performance Optimization

The system is designed for scale:

- **Async processing**: Edge Function runs independently
- **Rate limiting**: In-memory cache for fast checks
- **Efficient queries**: Indexed columns for fast lookups
- **Batch processing**: Single function handles multiple recipients

### 4. Cost Considerations

**Resend Pricing** (as of 2024):
- Free tier: 3,000 emails/month
- Paid plans: Starting at $20/month for 50,000 emails

**Supabase Edge Functions**:
- Free tier: 500,000 invocations/month
- Paid plans: Additional invocations at $2 per 1M

**Database Storage**:
- Logs grow over time
- Consider archiving old logs:

```sql
-- Archive logs older than 90 days
DELETE FROM email_notification_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('sent', 'skipped');
```

## Future Enhancements

Potential improvements:

1. **Email digest mode** - Batch multiple messages into single email
2. **Quiet hours** - Don't send emails during user-defined hours
3. **Email templates** - Customizable email designs
4. **Push notifications** - Browser/mobile push in addition to email
5. **SMS notifications** - Alternative delivery channel
6. **Webhook retries** - Automatic retry for failed deliveries
7. **Analytics dashboard** - Visual insights into notification metrics

## Support

For issues or questions:

1. Check Supabase Dashboard logs
2. Review `email_notification_logs` table
3. Test with simple message first
4. Verify all configuration steps completed

## Security Best Practices

✅ **Implemented**:
- RLS policies on all tables
- Service role key secured
- Email validation
- Rate limiting
- Message permission checks

⚠️ **Recommendations**:
- Rotate API keys regularly
- Monitor for unusual activity
- Set up alerts for high failure rates
- Implement CAPTCHA for signup (prevent spam accounts)
- Consider implementing unsubscribe link (required for marketing, optional for transactional)

## Compliance

The system is designed for **transactional emails** (notifications about application activity), which typically don't require explicit opt-in under most regulations.

However, consider:

- **GDPR**: Users can disable notifications (data processing consent)
- **CAN-SPAM**: System identifies sender and includes app context
- **CASL**: Transactional exemption likely applies

Consult legal counsel for specific compliance requirements in your jurisdiction.

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Status**: Production Ready ✅
