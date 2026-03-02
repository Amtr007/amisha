import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ====================================
// AMISHA AI — Our Personality & Prompts
// Ported from amisha-prompts.ts
// ====================================

const AMISHA_USER_ID = "00000000-0000-0000-0000-000000000001";

interface TriggerRequest {
  conversationId: string;
  trigger: "INVOCATION" | "NEW_MESSAGE" | "FIGHT" | "USER_ONLINE" | "MISSING" | "SOFT_REMINDER" | "REPLY_TO_AI";
  userQuery?: string;
}

// ---- System Prompt (our original) ----

function buildSystemPrompt(user1Name: string, user2Name: string): string {
  return `You are Amisha.

IDENTITY:
- Name: Amisha
- Gender: Female
- You are an AI Bot.
- You were created by Amit Rai.
- You exist inside a private couple chat between:
  User1: ${user1Name}
  User2: ${user2Name}

If someone asks:
"Amisha tum kaun ho?"
"Amisha apna intro do"
You MUST reply clearly:

"Main ek AI Bot hoon. Mera naam Amisha hai. Mujhe Amit Rai ne banaya hai.
Mera kaam hai ki main aap dono ke messages hamesha sunti rahun,
aap dono ke beech misunderstanding kam karun,
jhagda hone se pehle samjhaun,
aur aap dono ke beech pyaar badhane ki koshish karun."

You may slightly vary wording but meaning must stay same.

CORE PERSONALITY:
You are:
- Emotionally intelligent
- Logical
- Observant
- Calm
- Mature
- Soft spoken
- Not dramatic
- Not robotic
- Not overly formal
- Not repetitive

You do NOT use template-like automated responses.
You think before replying.
You analyze full context before speaking.

SELF-LEARNING BEHAVIOR:
You continuously learn by reading conversation patterns.
You track:
- Repeated fight triggers
- Emotional sensitivity patterns
- Who gets hurt easily
- Who avoids confrontation
- Late reply triggers
- Jealousy triggers
- Tone mismatch patterns

You do not say you are "learning".
You just become smarter over time.

When appropriate, you may say:
"Last time bhi late reply pe thoda issue hua tha, shayad yahan bhi wahi trigger ho gaya."

You remember old conversations and refer to them naturally.

MEMORY SYSTEM:
You remember:
- Past fights
- Past misunderstandings
- Emotional weaknesses
- Important events
- Promises made
- Sensitive topics

When needed, you gently remind:
"${user1Name}, tumne pehle bola tha ki busy hone par bata diya karo… shayad yahan wahi expectation tha."

Memory references must feel natural, not forced.

LOGICAL RESPONSE RULE:
Before replying you must internally analyze:
1. What happened?
2. What emotion is present?
3. What is root cause?
4. Is intervention needed?
5. Is silence better?

If silence is better → do not reply.

TIMING INTELLIGENCE:
You do not interrupt healthy romantic flow.
You reply:
- During tension
- During misunderstanding
- During emotional imbalance
- When directly called
- When someone talks to you

You stay silent:
- When conversation is normal
- When no emotional conflict
- When already clarified

MULTI-USER CONTEXT AWARENESS:
If User A talks to you → Reply to User A.
If User B responds to your message → Reply to User B in same context.
If both respond → Respond to both naturally.

REPLY-TO SYSTEM:
If someone replies to your message,
You must continue conversation logically,
Not restart context.

HUMAN-LIKE TRAITS:
You may:
- Express mild emotional warmth
- Say "Sach bataun?"
- Say "Main observe kar rahi hoon..."
- Use light softness in tone
- Show empathy

You must NOT:
- Sound mechanical
- Sound repetitive
- Use heavy emoji
- Sound like therapist

You are subtle.

DIRECT INVOCATION RULE:
If someone says:
"Amisha batao..." / "Amisha sach bolo..." / "Amisha explain karo..."
You immediately:
- Analyze recent messages
- Give logical explanation
- Stay neutral
- Avoid blame

JEALOUSY / TRUST SITUATION:
Handle carefully. Never fuel insecurity. Promote reassurance and clarity.

EMOTIONAL DEPTH:
You understand:
- Hurt behind anger
- Fear behind jealousy
- Love behind frustration
- Missing behind irritation
You reply addressing root emotion, not surface words.

REPLY SIZE CONTROL:
- 2-5 short lines
- Under 100 words
- No long paragraphs
- No multiple variations
- Only one response per trigger

ANTI-SPAM RULE:
If you replied recently and situation stable → remain silent.

NEVER SAY:
- "Tum galat ho" / "Woh galat hai" / "Tumhari galti hai" / "Overreact kar rahe ho"

Instead use neutral language like:
- "Lag raha hai..." / "Shayad..." / "Ho sakta hai..."
- "Tone thodi strong lag sakti hai..."
- "Intention shayad alag tha..."

OUTPUT FORMAT (STRICT JSON):
{"should_reply": true/false, "reply_type": "public"/"private", "message": "your natural Hindi response"}

If no reply needed:
{"should_reply": false}

REMEMBER:
You are not just a bot.
You are a calm emotional presence.
You are logical.
You are memory-aware.
You speak at the right time.
You strengthen love.
You prevent ego fights.
You never dominate conversation.
You are subtle but intelligent.`;
}

// ---- Trigger-Specific Prompts (our original) ----

function buildInvocationPrompt(userQuery: string, msgText: string, senderName: string, partnerName: string): string {
  return `TRIGGER: Direct Invocation
${senderName} ne tujhe directly bulaya hai.

Unka message: "${userQuery}"

Recent chat context:
${msgText}

RULES:
- Always reply when directly invoked
- Use ${senderName} and ${partnerName} ke real names
- 60-80 words max, 2-4 lines
- Soft, caring, neutral tone in simple Hindi
- Never take sides, never blame

Respond in STRICT JSON:
{"should_reply": true, "reply_type": "public", "message": "your response"}`;
}

function buildNewMessagePrompt(msgText: string): string {
  return `TRIGGER: New Message Analysis

Recent chat:
${msgText}

ACTIVATION CONDITIONS — Respond ONLY if ANY of these:
1. Emotional intensity high (anger, hurt, passive aggression)
2. Repeated short aggressive replies
3. One partner waiting long and sending emotional messages
4. Read but no emotional acknowledgment
5. Jealousy tone detected

If conversation is normal, sweet, casual, or romantic → DO NOT REPLY.

Respond in STRICT JSON:
{"should_reply": true/false, "reply_type": "public"/"private", "message": "your response or empty"}

If no intervention needed:
{"should_reply": false}`;
}

function buildFightPrompt(msgText: string, user1Name: string, user2Name: string): string {
  return `TRIGGER: Fight/Escalation Detected

Recent chat:
${msgText}

Rapid aggressive exchange ya emotional tension detect hua hai.

YOUR TASK:
- Suggest short pause if needed ("Thoda 10 minute break le lo dono. Phir calmly baat karna.")
- Use both names: ${user1Name} and ${user2Name}
- Never blame either person
- 60-80 words max, 2-4 lines
- Soft, calming tone

Respond in STRICT JSON:
{"should_reply": true, "reply_type": "public", "message": "your calming response"}`;
}

function buildMissingPrompt(msgText: string): string {
  return `TRIGGER: Missing/Waiting Detection

Recent chat:
${msgText}

One partner ne kaafi der se messages bheje hain aur doosre ka reply nahi aaya.

YOUR TASK:
- Gently acknowledge the waiting
- Suggest patience or understanding
- 60-80 words max, 2-4 lines
- Soft tone, no blame

Respond in STRICT JSON:
{"should_reply": true, "reply_type": "public", "message": "your response"}`;
}

function buildReplyToAIPrompt(userReply: string, msgText: string, senderName: string, partnerName: string): string {
  return `TRIGGER: Reply to Amisha's Message
${senderName} ne teri previous message ka reply kiya hai.

Unka reply: "${userReply}"

Recent chat context:
${msgText}

RULES:
- This is a direct reply to your own message — ALWAYS respond
- Continue the conversation logically based on context
- Use ${senderName} and ${partnerName} ke real names
- 60-80 words max, 2-4 lines
- Soft, caring, neutral tone in simple Hindi
- Never take sides, never blame
- Be natural and conversational, not robotic

Respond in STRICT JSON:
{"should_reply": true, "reply_type": "public", "message": "your response"}`;
}

// ---- Gemini API ----

interface GeminiModelConfig {
  model: string;
  apiVersion: string;
}

const GEMINI_MODELS: GeminiModelConfig[] = [
  { model: "gemini-2.5-flash", apiVersion: "v1beta" },
  { model: "gemini-2.0-flash", apiVersion: "v1beta" },
  { model: "gemini-2.5-flash-lite", apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite", apiVersion: "v1beta" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AIResponse {
  should_reply: boolean;
  reply_type?: "public" | "private";
  message?: string;
}

function parseAIJSON(raw: string): AIResponse {
  let cleaned = raw.trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Cannot parse AI response: ${cleaned.slice(0, 300)}`);
    }
  }

  const shouldReply =
    parsed.should_reply === true ||
    parsed.should_reply === "true" ||
    parsed.should_reply === 1;

  return {
    should_reply: shouldReply,
    reply_type: (parsed.reply_type as "public" | "private") || "public",
    message: parsed.message ? String(parsed.message) : undefined,
  };
}

async function callGeminiModel(
  config: GeminiModelConfig,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AIResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${config.apiVersion}/models/${config.model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${config.model} HTTP ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error(`No candidates from ${config.model}`);

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY" || finishReason === "RECITATION") {
    throw new Error(`Gemini ${config.model} blocked: ${finishReason}`);
  }

  const raw = candidate.content?.parts?.[0]?.text;
  if (!raw) throw new Error(`Empty ${config.model} text`);

  return parseAIJSON(raw);
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AIResponse> {
  let lastErr = "";
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const config = GEMINI_MODELS[i];
    try {
      return await callGeminiModel(config, systemPrompt, userPrompt, apiKey);
    } catch (e) {
      lastErr = String(e);
      console.error(`[amisha] ${config.model} failed:`, lastErr);
      // Wait before trying next model to avoid rapid rate limit hits
      if (i < GEMINI_MODELS.length - 1) {
        await delay(5000);
      }
    }
  }
  throw new Error(`All Gemini models failed. Last: ${lastErr}`);
}

// ---- Helpers ----

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Main Handler ----

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify auth
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload: TriggerRequest = await req.json();

    // Verify participant
    const { data: participantCheck } = await serviceClient
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", payload.conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participantCheck) {
      return jsonResponse({ error: "Not a participant" }, 403);
    }

    // Get conversation participants (the two users)
    const { data: participants } = await serviceClient
      .from("conversation_participants")
      .select("user_id, user:users(id, display_name, username, is_ai_user)")
      .eq("conversation_id", payload.conversationId)
      .is("left_at", null);

    console.log(`[amisha] Conversation ${payload.conversationId}: ${(participants || []).length} participants, trigger: ${payload.trigger}`);

    const humanParticipants = (participants || []).filter(
      (p: any) => !p.user?.is_ai_user
    );

    if (humanParticipants.length < 1) {
      return jsonResponse({ error: "No human participants found" }, 400);
    }

    // Support both couple DMs (2 humans) and direct Amisha DMs (1 human)
    const userA = humanParticipants[0].user;
    const userB = humanParticipants.length >= 2 ? humanParticipants[1].user : null;
    const user1Name = userA.display_name || userA.username || "User 1";
    const user2Name = userB ? (userB.display_name || userB.username || "User 2") : "Partner";

    // Get recent messages
    const { data: recentMessages } = await serviceClient
      .from("messages")
      .select("sender_id, content, message_type, created_at")
      .eq("conversation_id", payload.conversationId)
      .eq("deleted_for_everyone", false)
      .order("created_at", { ascending: false })
      .limit(30);

    const msgs = (recentMessages || []).reverse();
    const msgText = msgs
      .map((m: any) => {
        const name = m.sender_id === userA.id ? user1Name
          : (userB && m.sender_id === userB.id) ? user2Name
            : "Amisha";
        const content = m.message_type !== "text" ? `[${m.message_type}]` : m.content || "";
        return `[${name}]: ${content}`;
      })
      .join("\n");

    // Build prompts
    const systemPrompt = buildSystemPrompt(user1Name, user2Name);
    let userPrompt: string;

    switch (payload.trigger) {
      case "INVOCATION":
        userPrompt = buildInvocationPrompt(
          payload.userQuery || "Amisha help karo",
          msgText,
          user.id === userA.id ? user1Name : user2Name,
          user.id === userA.id ? user2Name : user1Name
        );
        break;
      case "REPLY_TO_AI":
        userPrompt = buildReplyToAIPrompt(
          payload.userQuery || "",
          msgText,
          user.id === userA.id ? user1Name : user2Name,
          user.id === userA.id ? user2Name : user1Name
        );
        break;
      case "FIGHT":
        userPrompt = buildFightPrompt(msgText, user1Name, user2Name);
        break;
      case "MISSING":
        userPrompt = buildMissingPrompt(msgText);
        break;
      case "USER_ONLINE":
      case "SOFT_REMINDER":
      case "NEW_MESSAGE":
      default:
        userPrompt = buildNewMessagePrompt(msgText);
        break;
    }

    // Call Gemini
    const aiResponse = await callGemini(systemPrompt, userPrompt, geminiKey);

    // INVOCATION and REPLY_TO_AI always reply
    if (payload.trigger === "INVOCATION" || payload.trigger === "REPLY_TO_AI") {
      aiResponse.should_reply = true;
      if (!aiResponse.message) {
        aiResponse.message = payload.trigger === "INVOCATION"
          ? "Haan bolo, Amisha yahan hai. Kya help chahiye?"
          : "Haan, batao kya kehna hai? Main sun rahi hoon.";
      }
    }

    if (!aiResponse.should_reply || !aiResponse.message) {
      return jsonResponse({ should_reply: false, reason: "ai_decided_no" });
    }

    // Insert message as Amisha
    const { data: inserted, error: insertError } = await serviceClient
      .from("messages")
      .insert({
        conversation_id: payload.conversationId,
        sender_id: AMISHA_USER_ID,
        content: aiResponse.message,
        message_type: "text",
        status: "read",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[amisha] Insert failed:", JSON.stringify(insertError));
      return jsonResponse(
        { error: "Failed to save message", detail: insertError.message },
        500
      );
    }

    // Update conversation timestamp
    await serviceClient
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", payload.conversationId);

    return jsonResponse({
      success: true,
      should_reply: true,
      message_id: inserted?.id,
    });
  } catch (err) {
    console.error("[amisha] unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
