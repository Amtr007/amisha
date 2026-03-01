// ====================================
// AMISHA AI — Trigger System (Client-side)
// Ported from our original Amisha build
// ====================================

import { supabase } from '../lib/supabase';
import type { MessageWithDetails } from '../types/database';

// ---- Amisha Message Detection ----

export function isAmishaMessage(message: MessageWithDetails): boolean {
  // AI messages are identified by is_ai_user flag on sender
  return message.sender?.is_ai_user === true;
}

// ---- Invocation Detection ----

export function detectAmishaInvocation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /amish[a]?/i.test(lower);
}

// ---- Fight Detection ----
// Detects rapid short aggressive messages from 2 senders

export function detectFight(
  messages: MessageWithDetails[]
): boolean {
  const humanMsgs = messages.filter((m) => !m.sender?.is_ai_user);
  if (humanMsgs.length < 6) return false;

  const recent = humanMsgs.slice(-8);
  const avgLength =
    recent.reduce((acc, m) => acc + (m.content?.length || 0), 0) / recent.length;
  const senders = new Set(recent.map((m) => m.sender_id));

  if (avgLength < 30 && senders.size >= 2) {
    const negativeWords =
      /nahi|nath|mat kar|shut|byakar|chhod|ignore|hatao|seedha|jhooth|झूठ|ruk|kya matlab|mujhe mat|galat/i;
    return recent.some((m) => m.content && negativeWords.test(m.content));
  }

  return false;
}

// ---- Missing Detection ----
// Detects when one partner is waiting and sending emotional messages

export function detectMissing(
  messages: MessageWithDetails[]
): boolean {
  const humanMsgs = messages.filter((m) => !m.sender?.is_ai_user);
  const missingPatterns =
    /kahan ho|kaha ho|busy ho|theek hai rehne do|theek h rehne do|reply karo|kab aoge|kab aaoge|online nahi|dekh nahi/i;
  const recent = humanMsgs.slice(-5);
  return recent.filter((m) => m.content && missingPatterns.test(m.content)).length >= 2;
}

// ---- Trigger Types ----

export type AmishaTrigger =
  | 'INVOCATION'
  | 'NEW_MESSAGE'
  | 'FIGHT'
  | 'USER_ONLINE'
  | 'MISSING'
  | 'SOFT_REMINDER';

// ---- Debounce ----

const lastTriggerTime: Record<string, number> = {};
const DEBOUNCE_MS = 120_000; // 120 seconds between ANY trigger for same conversation (prevents duplicate replies)

// ---- Trigger Function ----

export function triggerAmisha(
  conversationId: string,
  trigger: AmishaTrigger,
  userQuery?: string,
  onAmishaReplied?: () => void
) {
  // INVOCATION bypasses debounce
  if (trigger !== 'INVOCATION') {
    const key = conversationId;
    const now = Date.now();
    if (lastTriggerTime[key] && now - lastTriggerTime[key] < DEBOUNCE_MS) {
      return; // skip — already triggered recently
    }
    lastTriggerTime[key] = now;
  }

  // Fire and forget — non-blocking
  (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[amisha] No session — skipping trigger');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log(`[amisha] Triggering: ${trigger} for conversation ${conversationId}`);
      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-companion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId, trigger, userQuery }),
      });
      const body = await resp.json().catch(() => ({}));
      console.log(`[amisha] Response: ${resp.status}`, body);

      // If Amisha replied successfully, trigger a message refresh after a short delay
      if (resp.ok && body.should_reply && onAmishaReplied) {
        setTimeout(() => onAmishaReplied(), 500);
      }
    } catch (err) {
      console.error('[amisha] trigger error:', err);
    }
  })();
}
