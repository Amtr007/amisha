import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MessagePayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    attachment_url: string | null;
    attachment_type: string | null;
    voice_url: string | null;
    created_at: string;
    deleted_for_everyone: boolean;
  };
}

interface NotificationData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  chatName: string;
  messagePreview: string;
  timestamp: string;
  chatLink: string;
}

const RATE_LIMIT_WINDOW = 5 * 60 * 1000;
const MAX_EMAILS_PER_WINDOW = 5;
const recentEmails = new Map<string, number[]>();

function cleanupRateLimitCache() {
  const now = Date.now();
  for (const [key, timestamps] of recentEmails.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (validTimestamps.length === 0) {
      recentEmails.delete(key);
    } else {
      recentEmails.set(key, validTimestamps);
    }
  }
}

function checkRateLimit(userId: string, conversationId: string): boolean {
  cleanupRateLimitCache();
  const key = `${userId}:${conversationId}`;
  const now = Date.now();
  const timestamps = recentEmails.get(key) || [];
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_EMAILS_PER_WINDOW) {
    return false;
  }
  
  recentTimestamps.push(now);
  recentEmails.set(key, recentTimestamps);
  return true;
}

async function sendEmail(data: NotificationData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #14b8a6 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .message-box { background: #f9fafb; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .sender { font-weight: 600; color: #14b8a6; margin-bottom: 5px; }
          .chat-name { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
          .preview { color: #374151; font-size: 15px; }
          .timestamp { color: #9ca3af; font-size: 12px; margin-top: 10px; }
          .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .button:hover { background: #0d9488; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Message</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>You have a new message from <strong>${data.senderName}</strong>:</p>
            
            <div class="message-box">
              <div class="sender">${data.senderName}</div>
              <div class="chat-name">${data.chatName}</div>
              <div class="preview">${data.messagePreview}</div>
              <div class="timestamp">${data.timestamp}</div>
            </div>
            
            <a href="${data.chatLink}" class="button">Open Chat</a>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              To manage your notification settings, visit your profile settings.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from your messaging app.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Chat Notifications <notifications@resend.dev>",
        to: [data.recipientEmail],
        subject: `New message from ${data.senderName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return { success: false, error: `Resend error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

async function logNotification(
  supabase: any,
  messageId: string,
  recipientUserId: string,
  recipientEmail: string,
  senderName: string,
  chatName: string,
  messagePreview: string,
  status: string,
  errorMessage?: string
) {
  await supabase.from("email_notification_logs").insert({
    message_id: messageId,
    recipient_user_id: recipientUserId,
    recipient_email: recipientEmail,
    sender_name: senderName,
    chat_name: chatName,
    message_preview: messagePreview,
    status: status,
    error_message: errorMessage,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MessagePayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "messages") {
      return new Response(JSON.stringify({ message: "Not a message insert" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const message = payload.record;

    if (message.deleted_for_everyone) {
      console.log("Message deleted for everyone, skipping notification");
      return new Response(JSON.stringify({ message: "Message deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("*, conversation_participants(user_id, users(id, email, display_name))")
      .eq("id", message.conversation_id)
      .single();

    if (!conversation) {
      console.error("Conversation not found");
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const { data: sender } = await supabase
      .from("users")
      .select("display_name, email")
      .eq("id", message.sender_id)
      .single();

    const senderName = sender?.display_name || sender?.email || "Someone";
    const chatName = conversation.name || "Direct Message";

    let messagePreview = "";
    if (message.content) {
      messagePreview = message.content.length > 100 
        ? message.content.substring(0, 100) + "..." 
        : message.content;
    } else if (message.voice_url) {
      messagePreview = "🎤 Voice message";
    } else if (message.attachment_url) {
      const type = message.attachment_type || "file";
      if (type.startsWith("image")) messagePreview = "📷 Photo";
      else if (type.startsWith("video")) messagePreview = "🎥 Video";
      else messagePreview = "📎 Attachment";
    } else {
      messagePreview = "New message";
    }

    const timestamp = new Date(message.created_at).toLocaleString();
    const chatLink = `${appUrl}/?conversation=${message.conversation_id}`;

    const recipients = conversation.conversation_participants
      .map((p: any) => p.users)
      .filter((u: any) => u && u.id !== message.sender_id);

    for (const recipient of recipients) {
      try {
        const { data: shouldNotify } = await supabase
          .rpc("should_send_email_notification", {
            p_user_id: recipient.id,
            p_conversation_id: message.conversation_id,
          });

        if (!shouldNotify) {
          await logNotification(
            supabase,
            message.id,
            recipient.id,
            recipient.email,
            senderName,
            chatName,
            messagePreview,
            "skipped",
            "User disabled notifications"
          );
          continue;
        }

        if (!checkRateLimit(recipient.id, message.conversation_id)) {
          await logNotification(
            supabase,
            message.id,
            recipient.id,
            recipient.email,
            senderName,
            chatName,
            messagePreview,
            "skipped",
            "Rate limit exceeded"
          );
          continue;
        }

        const recipientName = recipient.display_name || recipient.email.split("@")[0];

        const emailResult = await sendEmail({
          recipientEmail: recipient.email,
          recipientName,
          senderName,
          chatName,
          messagePreview,
          timestamp,
          chatLink,
        });

        await logNotification(
          supabase,
          message.id,
          recipient.id,
          recipient.email,
          senderName,
          chatName,
          messagePreview,
          emailResult.success ? "sent" : "failed",
          emailResult.error
        );
      } catch (error) {
        console.error(`Error processing notification for ${recipient.email}:`, error);
        await logNotification(
          supabase,
          message.id,
          recipient.id,
          recipient.email,
          senderName,
          chatName,
          messagePreview,
          "failed",
          error.message
        );
      }
    }

    return new Response(
      JSON.stringify({ message: "Notifications processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});