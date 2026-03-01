# Email Notification System - Quick Setup Guide

Follow these steps to enable email notifications in your messaging application.

## Prerequisites

- ✅ Supabase project set up
- ✅ Database migrations applied
- ✅ Edge Function deployed
- ✅ Frontend built and deployed

## Setup Checklist

### Step 1: Get Resend API Key (Required)

1. Go to https://resend.com and create an account
2. Navigate to API Keys section
3. Click "Create API Key"
4. Give it a name (e.g., "Chat Notifications")
5. Copy the API key (starts with `re_`)

### Step 2: Configure Environment Variables

1. Open your Supabase Dashboard
2. Go to **Project Settings** > **Edge Functions**
3. Scroll to **Environment Variables** section
4. Click **Add variable**
5. Add the following:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxxxxxxxxx` (your key from Step 1)
6. Click **Save**

Optionally, set your app URL if different from localhost:
   - **Name**: `APP_URL`
   - **Value**: `https://yourapp.com`

### Step 3: Configure Database Webhook

1. In Supabase Dashboard, go to **Database** > **Webhooks**
2. Click **Enable Webhooks** (if not already enabled)
3. Click **Create a new hook**
4. Configure the webhook:

   ```
   Name: send_message_notification
   Table: messages
   Events: ☑ Insert (uncheck Update and Delete)
   Type: HTTP Request
   HTTP Method: POST
   URL: https://[YOUR-PROJECT-REF].supabase.co/functions/v1/send-message-notification
   ```

   Replace `[YOUR-PROJECT-REF]` with your actual Supabase project reference.

5. Add HTTP Headers:
   - Click **Add header**
   - Header 1:
     - **Name**: `Authorization`
     - **Value**: `Bearer [YOUR-ANON-KEY]`
   - Header 2:
     - **Name**: `Content-Type`
     - **Value**: `application/json`

   Replace `[YOUR-ANON-KEY]` with your Supabase anon key (found in Project Settings > API)

6. Click **Create webhook**

### Step 4: Verify Email Domain (Production Only)

For production use with custom domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourapp.com`)
4. Add the provided DNS records to your domain:
   - **SPF** record (TXT)
   - **DKIM** records (TXT)
   - **DMARC** record (TXT)
5. Wait for verification (usually 5-15 minutes)
6. Update the Edge Function `from` address:

   Edit `supabase/functions/send-message-notification/index.ts`:
   ```typescript
   from: "Chat Notifications <notifications@yourapp.com>",
   ```

   For development, you can skip this step and use:
   ```typescript
   from: "Chat Notifications <notifications@resend.dev>",
   ```

### Step 5: Test the System

1. **Send a test message**:
   - Open your app
   - Log in with two different accounts (use incognito window for second account)
   - Send a message from Account A to Account B
   - Check Account B's email inbox

2. **Check notification logs**:
   - Log in to Account B
   - Go to Profile > Notification Settings
   - Scroll to "Recent Email Notifications"
   - Verify the status is "sent"

3. **Test different scenarios**:
   - ✅ Message with notifications enabled (should receive)
   - ✅ Message with notifications disabled (should not receive)
   - ✅ Multiple messages in quick succession (rate limiting)
   - ✅ Group chat message (all members receive)

### Step 6: Troubleshooting

If emails are not being sent:

**Check 1: Webhook Status**
```sql
-- In Supabase SQL Editor
SELECT * FROM email_notification_logs
ORDER BY created_at DESC
LIMIT 5;
```
- If no rows: Webhook not firing
- If status = 'failed': Check error_message column

**Check 2: Edge Function Logs**
1. Go to **Edge Functions** > **send-message-notification**
2. Click **Logs** tab
3. Look for errors or warnings

**Check 3: User Preferences**
```sql
-- Verify user has notifications enabled
SELECT * FROM notification_preferences
WHERE user_id = '[USER-ID]';
```

**Check 4: Resend API Key**
- Verify key is correctly set in environment variables
- Check key has not expired
- Test key with Resend CLI or API directly

**Check 5: Webhook Configuration**
- Verify URL is correct (check project ref)
- Verify anon key is correct
- Check webhook is enabled

## Configuration Options

### Rate Limiting

Default: 5 emails per 5 minutes per conversation

To change, edit `supabase/functions/send-message-notification/index.ts`:

```typescript
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // Change to 10 minutes
const MAX_EMAILS_PER_WINDOW = 10; // Change to 10 emails
```

Then redeploy the function.

### Email Template

To customize the email design, edit the `emailHtml` variable in:
`supabase/functions/send-message-notification/index.ts`

### Sender Address

Change the `from` field in the `sendEmail` function:

```typescript
from: "Your App Name <notifications@yourdomain.com>",
```

## Common Issues

### Issue: "RESEND_API_KEY not configured"

**Solution**: Add the API key to Edge Function environment variables (Step 2)

### Issue: "Webhook not triggering"

**Solution**:
1. Verify webhook is enabled in Database > Webhooks
2. Check webhook configuration matches Step 3
3. Test by inserting a message manually

### Issue: "Email sent but not received"

**Solution**:
1. Check spam/junk folder
2. Verify recipient email is correct
3. Check Resend dashboard for delivery logs
4. For custom domain, verify DNS records are correct

### Issue: "Rate limit exceeded"

**Solution**: This is expected behavior. Wait 5 minutes or increase rate limits.

### Issue: "Failed to send email: 403"

**Solution**:
1. Resend API key is invalid or expired
2. Domain not verified (for custom domains)
3. Generate new API key in Resend

## Maintenance

### Monitor Email Deliveries

```sql
-- Success rate (last 24 hours)
SELECT
  status,
  COUNT(*) as count
FROM email_notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Clean Old Logs (Optional)

```sql
-- Delete logs older than 90 days
DELETE FROM email_notification_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('sent', 'skipped');
```

### Update Edge Function

After making changes to the Edge Function:

```bash
# Deploy the updated function
# This is done automatically in your development environment
```

## Cost Estimates

### Resend (Email Service)

- **Free Tier**: 3,000 emails/month
- **Usage**: ~1 email per message (with rate limiting)
- **Cost**: Free for small apps, ~$20/month for 50K emails

### Supabase Edge Functions

- **Free Tier**: 500,000 invocations/month
- **Usage**: 1 invocation per message
- **Cost**: Effectively free for most apps

### Typical Usage Examples

- **Small app** (100 users, 50 messages/day): ~1,500 emails/month → FREE
- **Medium app** (1,000 users, 500 messages/day): ~15,000 emails/month → $20/month
- **Large app** (10,000 users, 5,000 messages/day): ~150,000 emails/month → $60/month

## Next Steps

Once setup is complete:

1. ✅ Test with real users
2. ✅ Monitor delivery success rate
3. ✅ Set up alerts for high failure rates
4. ✅ Consider adding quiet hours feature
5. ✅ Implement email digest mode (optional)

## Support

Need help? Check:

1. **Full Documentation**: See `NOTIFICATION_SYSTEM.md`
2. **Supabase Docs**: https://supabase.com/docs
3. **Resend Docs**: https://resend.com/docs

---

**Setup Complete!** 🎉

Your users can now receive instant email notifications for new messages.
