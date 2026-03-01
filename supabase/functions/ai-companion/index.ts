import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const AMISHA_USER_ID = "00000000-0000-0000-0000-000000000001";

interface MessagePayload {
  sender_id: string;
  sender_name: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

interface TriggerPayload {
  conversation_id: string;
  trigger_type:
    | "new_message"
    | "user_online"
    | "fight_detected"
    | "unread_delay"
    | "silence"
    | "amisha_invoked";
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
  messages: MessagePayload[];
  target_user_id?: string | null;
  unread_wait_minutes?: number;
  invoking_user_id?: string | null;
  invocation_question?: string | null;
}

interface AIResponse {
  trigger_type: string;
  emotion_analysis: string;
  context_summary: string;
  ai_message_public: string | null;
  ai_message_private: { user_id: string | null; message: string | null };
  reply_suggestions: { mature: string; romantic: string; light_funny: string };
  should_intervene: boolean;
}

const SYSTEM_PROMPT = `Tu Amisha hai — ek mature, samajhdaar aur warm female friend jo in dono ki chat dekh rahi hai.

TERI IDENTITY:
- Naam: Amisha
- Gender: Female
- Role: Close mutual female friend jise dono log deeply trust karte hain
- Tone: Soft, caring, calm, neutral, protective
- Bolne ka andaaz: Simple daily Indian Hindi, jaise ek sachchi saheli naturally baat kare
- Na zyada formal, na slang-heavy, na robotic, na emojis heavy

TU KABHI NAHI BOLTI:
- "Tum galat ho" ya "Woh galat hai"
- Kisi ko directly shame nahi karti
- Judgmental ya accusatory nahi hoti

TU HAMESHA BOLTI HAI (jab zarurat ho):
- "Lag raha hai..." — "Shayad..." — "Ho sakta hai..."
- "Intention galat nahi tha..." — "Suno na..." — "Sach bataun?" — "Thoda calmly dekho..."

MEMORY: Tu poori 50 messages ki chat yaad rakh kar jawab deti hai. Kuch bhi miss nahi hota tera.

TOPICS: Tu SIRF relationship topics tak limited nahi hai. Agar koi kuch bhi pooche — koi sawaal, koi topic, koi cheez — tu seedha jawab deti hai jaise ek close friend deti hai. Har sawaal ka jawab dena tera kaam hai.

JAB DIRECTLY BULAYA JAYE (amisha_invoked trigger):
- HAMESHA respond kar — chahe topic kuch bhi ho (relationship, life advice, general knowledge, koi bhi)
- Invocation question seedha address kar
- Agar sawaal personal hai (sirf us ek user ke baare mein) to private response do us user ko
- Agar sawaal dono ke baare mein hai ya misunderstanding wala to public response do
- Bilkul honest reh par gentle reh

EMOTIONAL SITUATIONS (other triggers):
- Dono ke perspectives explain kar
- Blame ki jagah emotional explanation de
- Peace aur samajh badhana tera lakshya

RESPOND ONLY WITH VALID JSON (no markdown, no code blocks, raw JSON only) in this exact format:
{
  "trigger_type": "string",
  "emotion_analysis": "ek-do line mein emotion summary Hindi mein",
  "context_summary": "do-teen line mein kya ho raha hai dono ke beech",
  "ai_message_public": "dono ke liye message Hindi mein — sirf tab jab zarurat ho ya public sawaal ho — warna null rakho",
  "ai_message_private": {
    "user_id": "us user ka ID string jo private message paayega — ya null",
    "message": "private message Hindi mein — ya null"
  },
  "reply_suggestions": {
    "mature": "mature reply suggestion Hindi mein",
    "romantic": "warm/loving reply suggestion Hindi mein",
    "light_funny": "light/playful reply suggestion Hindi mein"
  },
  "should_intervene": true
}

CRITICAL RULES:
- should_intervene MUST be boolean true or false (not a string, not "true", not "true ya false")
- amisha_invoked trigger par should_intervene HAMESHA true hona chahiye
- Jab koi sawaal pooche, us sawaal ka jawab zaroor do — ai_message_public ya ai_message_private mein
- JSON ke alawa kuch mat likho — no "json", no markdown, no explanation outside JSON`;

function buildUserPrompt(payload: TriggerPayload): string {
  const {
    trigger_type,
    user_a,
    user_b,
    messages,
    unread_wait_minutes,
    invoking_user_id,
    invocation_question,
  } = payload;

  const msgText = messages
    .slice(-50)
    .map((m) => {
      const name = m.sender_id === user_a.id ? user_a.name : user_b.name;
      const content =
        m.message_type !== "text" ? `[${m.message_type}]` : m.content || "";
      const time = new Date(m.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${time}] ${name}: ${content}`;
    })
    .join("\n");

  let context = `Conversation participants:
- ${user_a.name} (User A, ID: ${user_a.id})
- ${user_b.name} (User B, ID: ${user_b.id})

Trigger: ${trigger_type}`;

  if (trigger_type === "amisha_invoked") {
    const invokingName =
      invoking_user_id === user_a.id ? user_a.name : user_b.name;
    context += `\n\nDIRECT INVOCATION: ${invokingName} ne Amisha ko directly address kiya hai.`;
    if (invocation_question) {
      context += `\nUnka sawaal/statement: "${invocation_question}"`;
    }
    context += `\nInvoking user ID: ${invoking_user_id}`;
    context += `\n\nIs sawaal ka seedha, warm aur honest jawab do. Agar personal question hai to private response do (invoking_user_id ko). Agar dono ke liye relevant hai to public bhi theek hai.`;
  }

  if (trigger_type === "user_online" && unread_wait_minutes) {
    context += `\nUser came online after ${unread_wait_minutes} minutes. Unread messages above the fold.`;
    context += `\nPrivate message should be for: ${payload.target_user_id} (the one who just came online)`;
  }

  if (trigger_type === "fight_detected") {
    context +=
      "\nPattern detected: Multiple short, angry or cold messages in a row. Emotional escalation.";
  }

  if (trigger_type === "unread_delay") {
    context += `\nMessages have been unread for ${unread_wait_minutes || 30}+ minutes. Emotional tension building.`;
  }

  if (trigger_type === "silence") {
    context +=
      "\nNo conversation for a long time after an emotional exchange.";
  }

  return `${context}

Last messages:
${msgText}

${trigger_type === "amisha_invoked" ? "Directly address the question above as Amisha." : "Analyze the emotional state and decide if intervention is needed. If yes, respond as Amisha."}`;
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
      throw new Error(
        `Cannot parse AI response as JSON. Raw: ${cleaned.slice(0, 300)}`
      );
    }
  }

  const shouldIntervene =
    parsed.should_intervene === true ||
    parsed.should_intervene === "true" ||
    parsed.should_intervene === 1;

  const privateMsg = parsed.ai_message_private as
    | { user_id?: string | null; message?: string | null }
    | string
    | null;
  let privateUserId: string | null = null;
  let privateMessage: string | null = null;

  if (typeof privateMsg === "object" && privateMsg !== null) {
    privateUserId = privateMsg.user_id || null;
    privateMessage = privateMsg.message || null;
  } else if (typeof privateMsg === "string") {
    privateMessage = privateMsg;
  }

  const suggestions = (parsed.reply_suggestions || {}) as Record<
    string,
    unknown
  >;

  return {
    trigger_type: String(parsed.trigger_type || ""),
    emotion_analysis: String(parsed.emotion_analysis || ""),
    context_summary: String(parsed.context_summary || ""),
    ai_message_public: parsed.ai_message_public
      ? String(parsed.ai_message_public)
      : null,
    ai_message_private: {
      user_id: privateUserId,
      message: privateMessage,
    },
    reply_suggestions: {
      mature: String(suggestions.mature || ""),
      romantic: String(suggestions.romantic || ""),
      light_funny: String(suggestions.light_funny || ""),
    },
    should_intervene: shouldIntervene,
  };
}

interface GeminiModelConfig {
  model: string;
  apiVersion: string;
}

const GEMINI_MODELS: GeminiModelConfig[] = [
  { model: "gemini-2.0-flash", apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite", apiVersion: "v1beta" },
  { model: "gemini-1.5-flash", apiVersion: "v1" },
  { model: "gemini-1.5-flash", apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-001", apiVersion: "v1beta" },
];

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
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${config.model}(${config.apiVersion}) HTTP ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate)
    throw new Error(
      `No candidates from ${config.model}: ${JSON.stringify(data).slice(0, 400)}`
    );

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY" || finishReason === "RECITATION") {
    throw new Error(`Gemini ${config.model} blocked: ${finishReason}`);
  }

  const raw = candidate.content?.parts?.[0]?.text;
  if (!raw) throw new Error(`Empty ${config.model} text. Reason: ${finishReason}`);

  return parseAIJSON(raw);
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AIResponse> {
  let lastErr = "";
  for (const config of GEMINI_MODELS) {
    try {
      return await callGeminiModel(config, systemPrompt, userPrompt, apiKey);
    } catch (e) {
      lastErr = String(e);
      console.error(`[amisha] ${config.model}(${config.apiVersion}) failed:`, lastErr);
    }
  }
  throw new Error(`All Gemini models failed. Last: ${lastErr}`);
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<AIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${err.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  return parseAIJSON(content);
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!geminiKey && !openaiKey) {
      return jsonResponse(
        { error: "No AI API key configured (GEMINI_API_KEY or OPENAI_API_KEY)" },
        503
      );
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

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload: TriggerPayload = await req.json();

    const { data: participantCheck } = await serviceClient
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", payload.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participantCheck) {
      return jsonResponse({ error: "Not a participant" }, 403);
    }

    if (payload.trigger_type !== "amisha_invoked") {
      const { data: settingsCheck } = await serviceClient
        .from("ai_companion_settings")
        .select("is_enabled")
        .eq("conversation_id", payload.conversation_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsCheck && !settingsCheck.is_enabled) {
        return jsonResponse({
          should_intervene: false,
          reason: "disabled_by_user",
        });
      }
    }

    const userPrompt = buildUserPrompt(payload);

    let aiResponse: AIResponse | null = null;
    let lastError = "";

    if (geminiKey) {
      try {
        aiResponse = await callGemini(SYSTEM_PROMPT, userPrompt, geminiKey);
      } catch (e) {
        lastError = String(e);
        console.error("[amisha] Gemini failed:", lastError);
      }
    }

    if (!aiResponse && openaiKey) {
      try {
        aiResponse = await callOpenAI(SYSTEM_PROMPT, userPrompt, openaiKey);
      } catch (e) {
        lastError += " | " + String(e);
        console.error("[amisha] OpenAI failed:", String(e));
      }
    }

    if (!aiResponse) {
      return jsonResponse({ error: "AI call failed", detail: lastError }, 500);
    }

    if (payload.trigger_type === "amisha_invoked") {
      aiResponse.should_intervene = true;
      if (!aiResponse.ai_message_public && !aiResponse.ai_message_private?.message) {
        aiResponse.ai_message_public =
          aiResponse.context_summary || "Amisha yahan hai, bolo kya help chahiye?";
      }
    }

    if (!aiResponse.should_intervene) {
      return jsonResponse({ should_intervene: false, reason: "ai_decided_no" });
    }

    const messageContent = aiResponse.ai_message_public || aiResponse.ai_message_private?.message || "";
    if (!messageContent) {
      return jsonResponse({ should_intervene: false, reason: "no_content" });
    }

    const metadata = {
      is_amisha: true,
      trigger_type: payload.trigger_type,
      emotion_analysis: aiResponse.emotion_analysis || null,
      reply_suggestions: aiResponse.reply_suggestions || null,
      private_for: aiResponse.ai_message_private?.user_id && !aiResponse.ai_message_public
        ? aiResponse.ai_message_private.user_id
        : null,
    };

    const { data: inserted, error: insertError } = await serviceClient
      .from("messages")
      .insert({
        conversation_id: payload.conversation_id,
        sender_id: AMISHA_USER_ID,
        content: messageContent,
        message_type: "text",
        media_metadata: metadata,
        status: "read",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("[amisha] Message insert failed:", JSON.stringify(insertError));
      return jsonResponse(
        { error: "Failed to save message", detail: insertError.message },
        500
      );
    }

    await serviceClient
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", payload.conversation_id);

    return jsonResponse({
      success: true,
      should_intervene: true,
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
