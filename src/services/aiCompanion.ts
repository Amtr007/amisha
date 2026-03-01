import { supabase } from '../lib/supabase';
import type { MessageWithDetails } from '../types/database';

export const AMISHA_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface AICompanionSettings {
  id: string;
  conversation_id: string;
  user_id: string;
  is_enabled: boolean;
}

export interface TriggerPayload {
  conversation_id: string;
  trigger_type: 'new_message' | 'user_online' | 'fight_detected' | 'unread_delay' | 'silence' | 'amisha_invoked';
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
  messages: {
    sender_id: string;
    sender_name: string;
    content: string | null;
    message_type: string;
    created_at: string;
  }[];
  target_user_id?: string | null;
  unread_wait_minutes?: number;
  invoking_user_id?: string | null;
  invocation_question?: string | null;
}

export interface AmishaMetadata {
  is_amisha: boolean;
  trigger_type: string;
  emotion_analysis: string | null;
  reply_suggestions: {
    mature: string;
    romantic: string;
    light_funny: string;
  } | null;
  private_for: string | null;
}

const EMOTION_KEYWORDS = [
  'gussa', 'angry', 'hurt', 'miss', 'missing', 'wait', 'waiting', 'please',
  'sorry', 'galti', 'bura', 'sad', 'rona', 'roti', 'rota', 'kyu', 'kyun',
  'chod', 'chalo', 'zyada', 'kab', 'samajh', 'samajhta', 'samajhti',
  'problem', 'ignore', 'baat', 'feel', 'dard', 'takleef',
  '😢', '😡', '😤', '💔', '🥺', '😔', '😒', '🙄', '😭',
];

const FIGHT_KEYWORDS = [
  'nahi', 'mat', 'band', 'chup', 'jao', 'bye', 'whatever', 'fine',
  'thik', 'ok', 'haan', 'nope', 'shut', 'leave', 'stop',
];

const AMISHA_INVOCATION_PATTERNS = [
  /\bamisha\b/i,
  /\bamish\b/i,
];

export function isAmishaMessage(message: MessageWithDetails): boolean {
  return message.sender_id === AMISHA_USER_ID;
}

export function getAmishaMetadata(message: MessageWithDetails): AmishaMetadata | null {
  const meta = message.media_metadata as unknown as AmishaMetadata;
  if (meta?.is_amisha) return meta;
  return null;
}

export function detectAmishaInvocation(content: string, replyToSenderName?: string | null): boolean {
  if (AMISHA_INVOCATION_PATTERNS.some((pattern) => pattern.test(content))) return true;
  if (replyToSenderName && /amisha/i.test(replyToSenderName)) return true;
  return false;
}

export function detectEmotionInMessages(messages: MessageWithDetails[]): boolean {
  const recent = messages.filter((m) => m.sender_id !== AMISHA_USER_ID).slice(-10);
  return recent.some((m) => {
    if (!m.content) return false;
    const lower = m.content.toLowerCase();
    return EMOTION_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

export function detectFightPattern(messages: MessageWithDetails[]): boolean {
  const recent = messages.filter((m) => m.sender_id !== AMISHA_USER_ID).slice(-8);
  if (recent.length < 4) return false;

  const shortAngryCount = recent.filter((m) => {
    if (!m.content) return false;
    const lower = m.content.toLowerCase();
    const isShort = m.content.length < 25;
    const hasFightWord = FIGHT_KEYWORDS.some((kw) => lower.includes(kw));
    return isShort && hasFightWord;
  }).length;

  const altSenders = recent.filter((m, i, arr) => i > 0 && m.sender_id !== arr[i - 1].sender_id).length;

  return shortAngryCount >= 3 && altSenders >= 2;
}

export function buildMessagePayloads(
  messages: MessageWithDetails[],
  userA: { id: string; name: string },
  userB: { id: string; name: string }
) {
  return messages
    .filter((m) => m.sender_id !== AMISHA_USER_ID)
    .slice(-50)
    .map((m) => ({
      sender_id: m.sender_id,
      sender_name: m.sender_id === userA.id ? userA.name : userB.name,
      content: m.content,
      message_type: m.message_type,
      created_at: m.created_at,
    }));
}

export interface TriggerResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function triggerAICompanion(payload: TriggerPayload): Promise<TriggerResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'no_session' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-companion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({ error: 'invalid json' }));

    if (!response.ok) {
      return { success: false, error: result.error || `HTTP ${response.status}` };
    }

    return {
      success: true,
      messageId: result.message_id || undefined,
    };
  } catch (err) {
    console.error('[amisha] trigger error:', err);
    return { success: false, error: String(err) };
  }
}

export async function getAICompanionSettings(
  conversationId: string,
  userId: string
): Promise<AICompanionSettings | null> {
  const { data } = await supabase
    .from('ai_companion_settings')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  return data as AICompanionSettings | null;
}

export async function setAICompanionEnabled(
  conversationId: string,
  userId: string,
  isEnabled: boolean
): Promise<void> {
  await supabase.from('ai_companion_settings').upsert(
    { conversation_id: conversationId, user_id: userId, is_enabled: isEnabled, updated_at: new Date().toISOString() },
    { onConflict: 'conversation_id,user_id' }
  );
}
