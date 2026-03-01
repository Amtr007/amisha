import { supabase } from '../lib/supabase';
import type {
  User,
  Message,
  MessageInsert,
  ConversationWithDetails,
  MessageWithDetails,
  MessageType,
  MediaMetadata,
  ImportantDate,
  ImportantDateInsert,
  ChatMediaResult,
  SearchMessageResult,
  GroupMember,
} from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const AMISHA_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function searchUsers(query: string, currentUserId: string): Promise<User[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', currentUserId)
    .neq('id', AMISHA_USER_ID)
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

export async function getAllUsers(currentUserId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', currentUserId)
    .neq('id', AMISHA_USER_ID)
    .order('display_name');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    other_user_id: otherUserId,
  });

  if (error) {
    console.error('Error getting/creating conversation:', error);
    return null;
  }

  return data;
}

export async function createGroupConversation(
  groupName: string,
  memberIds: string[],
  description?: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    group_name_input: groupName,
    member_ids: memberIds,
    group_description_input: description || null,
  });

  if (error) {
    console.error('Error creating group:', error);
    return null;
  }

  return data;
}

export async function getConversations(userId: string): Promise<ConversationWithDetails[]> {
  const { data: participations, error: partError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      role,
      left_at,
      conversations!inner (
        id,
        is_group,
        group_name,
        group_photo_url,
        group_description,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .is('left_at', null);

  if (partError || !participations) {
    console.error('Error fetching conversations:', partError);
    return [];
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  if (conversationIds.length === 0) return [];

  const [participantsResult, lastMessagesResult, unreadResults] = await Promise.all([
    supabase
      .from('conversation_participants')
      .select(`
        *,
        user:users (*)
      `)
      .in('conversation_id', conversationIds)
      .is('left_at', null),
    supabase.rpc('get_last_messages_for_conversations', { conv_ids: conversationIds }),
    Promise.all(
      conversationIds.map((convId) =>
        supabase.rpc('get_unread_count', { conv_id: convId }).then(({ data }) => ({
          convId,
          count: data || 0,
        }))
      )
    ),
  ]);

  if (participantsResult.error) {
    console.error('Error fetching participants:', participantsResult.error);
    return [];
  }

  const allParticipants = participantsResult.data;
  const unreadMap = new Map(unreadResults.map((r) => [r.convId, r.count]));

  const lastMessageMap = new Map<string, ConversationWithDetails['lastMessage']>();
  if (lastMessagesResult.data) {
    for (const msg of lastMessagesResult.data as Record<string, unknown>[]) {
      lastMessageMap.set(msg.conversation_id as string, {
        ...msg,
        sender: {
          username: msg.sender_username,
          display_name: msg.sender_display_name,
          profile_photo_url: msg.sender_profile_photo_url,
        },
      } as ConversationWithDetails['lastMessage']);
    }
  }

  const conversations: ConversationWithDetails[] = [];

  for (const participation of participations) {
    const convId = participation.conversation_id;
    const conv = participation.conversations as unknown as {
      id: string;
      is_group: boolean;
      group_name: string | null;
      group_photo_url: string | null;
      group_description: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };

    const participants = (allParticipants || []).filter((p) => p.conversation_id === convId);
    const otherParticipant = participants.find((p) => p.user_id !== userId && p.user_id !== AMISHA_USER_ID);

    if (!conv.is_group && !otherParticipant) continue;

    conversations.push({
      id: conv.id,
      is_group: conv.is_group,
      group_name: conv.group_name,
      group_photo_url: conv.group_photo_url,
      group_description: conv.group_description,
      created_by: conv.created_by,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      participants: participants as ConversationWithDetails['participants'],
      lastMessage: lastMessageMap.get(convId) || null as unknown as ConversationWithDetails['lastMessage'],
      unreadCount: unreadMap.get(convId) || 0,
      otherUser: otherParticipant?.user as User,
      currentUserRole: participation.role as ConversationWithDetails['currentUserRole'],
    });
  }

  return conversations.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

const MESSAGE_PAGE_SIZE = 100;

async function enrichMessages(
  messages: MessageWithDetails[],
  userId?: string
): Promise<MessageWithDetails[]> {
  if (userId) {
    messages = messages.filter((m) => !m.deleted_for?.includes(userId));
  }

  const starredIds = await getStarredMessageIds(userId || '');

  messages = messages.map((m) => ({
    ...m,
    isStarred: starredIds.includes(m.id),
  }));

  const replyIds = messages
    .filter((m) => m.reply_to_id)
    .map((m) => m.reply_to_id as string);

  if (replyIds.length > 0) {
    const { data: replyMessages } = await supabase
      .from('messages')
      .select(`*, sender:users (*)`)
      .in('id', replyIds);

    if (replyMessages) {
      const replyMap = new Map(replyMessages.map((r) => [r.id, r]));
      messages.forEach((m) => {
        if (m.reply_to_id && replyMap.has(m.reply_to_id)) {
          m.replyTo = replyMap.get(m.reply_to_id) as MessageWithDetails['replyTo'];
        }
      });
    }
  }

  return messages;
}

async function getClearedAt(conversationId: string, userId: string): Promise<string | null> {
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('cleared_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  return participant?.cleared_at || null;
}

export async function getMessages(
  conversationId: string,
  userId?: string
): Promise<MessageWithDetails[]> {
  let clearedAt: string | null = null;
  if (userId) {
    clearedAt = await getClearedAt(conversationId, userId);
  }

  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:users (*),
      reactions:message_reactions (*)
    `)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_everyone', false)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (clearedAt) {
    query = query.gt('created_at', clearedAt);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  let messages = ((data || []) as unknown as MessageWithDetails[]).reverse();
  return enrichMessages(messages, userId);
}

export async function getOlderMessages(
  conversationId: string,
  beforeTimestamp: string,
  userId?: string
): Promise<{ messages: MessageWithDetails[]; hasMore: boolean }> {
  let clearedAt: string | null = null;
  if (userId) {
    clearedAt = await getClearedAt(conversationId, userId);
  }

  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:users (*),
      reactions:message_reactions (*)
    `)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_everyone', false)
    .lt('created_at', beforeTimestamp)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (clearedAt) {
    query = query.gt('created_at', clearedAt);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching older messages:', error);
    return { messages: [], hasMore: false };
  }

  const raw = ((data || []) as unknown as MessageWithDetails[]).reverse();
  const enriched = await enrichMessages(raw, userId);

  return {
    messages: enriched,
    hasMore: (data || []).length === MESSAGE_PAGE_SIZE,
  };
}

export async function getMessageById(messageId: string): Promise<MessageWithDetails | null> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users (*),
      reactions:message_reactions (*)
    `)
    .eq('id', messageId)
    .eq('deleted_for_everyone', false)
    .maybeSingle();

  if (error || !data) return null;

  const msg = data as unknown as MessageWithDetails;

  if (msg.reply_to_id) {
    const { data: replyData } = await supabase
      .from('messages')
      .select(`*, sender:users (*)`)
      .eq('id', msg.reply_to_id)
      .maybeSingle();
    if (replyData) {
      msg.replyTo = replyData as unknown as MessageWithDetails['replyTo'];
    }
  }

  const starredData = await getStarredMessageIds('');
  msg.isStarred = starredData.includes(messageId);

  return msg;
}

export async function getMessageByIdForUser(messageId: string, userId: string): Promise<MessageWithDetails | null> {
  const msg = await getMessageById(messageId);
  if (!msg) return null;

  if (msg.deleted_for?.includes(userId)) return null;

  const starredIds = await getStarredMessageIds(userId);
  msg.isStarred = starredIds.includes(messageId);

  return msg;
}

export async function sendMessage(message: MessageInsert): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

export async function editMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<boolean> {
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('content, sender_id, original_content')
    .eq('id', messageId)
    .single();

  if (fetchError || !message) {
    console.error('Error fetching message:', fetchError);
    return false;
  }

  if (message.sender_id !== userId) {
    console.error('User is not the sender of this message');
    return false;
  }

  const originalContent = message.original_content || message.content;

  const { error: updateError } = await supabase
    .from('messages')
    .update({
      content: newContent,
      edited_at: new Date().toISOString(),
      original_content: originalContent,
    })
    .eq('id', messageId);

  if (updateError) {
    console.error('Error editing message:', updateError);
    return false;
  }

  return true;
}

export async function deleteMessageForMe(messageId: string, userId: string): Promise<boolean> {
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('deleted_for')
    .eq('id', messageId)
    .single();

  if (fetchError) {
    console.error('Error fetching message:', fetchError);
    return false;
  }

  const deletedFor = [...(message?.deleted_for || []), userId];

  const { error } = await supabase
    .from('messages')
    .update({ deleted_for: deletedFor })
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting message:', error);
    return false;
  }

  return true;
}

export async function deleteMessageForEveryone(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_message_for_everyone', {
    message_id_input: messageId,
  });

  if (error) {
    console.error('Error deleting message for everyone:', error);
    return false;
  }

  return data;
}

export async function addReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });

  if (error) {
    if (error.code === '23505') {
      return removeReaction(messageId, userId, emoji);
    }
    console.error('Error adding reaction:', error);
    return false;
  }

  return true;
}

export async function removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing reaction:', error);
    return false;
  }

  return true;
}

export async function starMessage(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('starred_messages')
    .insert({ message_id: messageId, user_id: userId });

  if (error) {
    if (error.code === '23505') {
      return unstarMessage(messageId, userId);
    }
    console.error('Error starring message:', error);
    return false;
  }

  return true;
}

export async function unstarMessage(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('starred_messages')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unstarring message:', error);
    return false;
  }

  return true;
}

export async function getStarredMessages(userId: string): Promise<MessageWithDetails[]> {
  const { data, error } = await supabase
    .from('starred_messages')
    .select(`
      message:messages (
        *,
        sender:users (*),
        reactions:message_reactions (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching starred messages:', error);
    return [];
  }

  return (data || [])
    .map((s) => s.message as unknown as MessageWithDetails)
    .filter((m) => m && !m.deleted_for_everyone)
    .map((m) => ({ ...m, isStarred: true }));
}

async function getStarredMessageIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('starred_messages')
    .select('message_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching starred message ids:', error);
    return [];
  }

  return (data || []).map((s) => s.message_id);
}

export async function markAsRead(conversationId: string): Promise<void> {
  await supabase.rpc('mark_messages_read', { conv_id: conversationId });
}

export async function markAsDelivered(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('status', 'sent');

  if (error) {
    console.error('Error marking messages as delivered:', error);
  }
}

export async function updateTypingStatus(conversationId: string, isTyping: boolean): Promise<void> {
  await supabase.rpc('update_typing_status', { conv_id: conversationId, typing: isTyping });
}

export async function clearChatHistory(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('clear_chat_history', {
    conv_id: conversationId,
  });

  if (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }

  return data;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_conversation', {
    conv_id: conversationId,
  });

  if (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }

  return data;
}

export async function searchMessagesInChat(
  conversationId: string,
  query: string,
  limit = 50
): Promise<SearchMessageResult[]> {
  const { data, error } = await supabase.rpc('search_messages', {
    conv_id: conversationId,
    search_query: query,
    limit_count: limit,
  });

  if (error) {
    console.error('Error searching messages:', error);
    return [];
  }

  return data || [];
}

export async function getChatMedia(
  conversationId: string,
  mediaType?: string,
  limit = 50,
  offset = 0
): Promise<ChatMediaResult[]> {
  const { data, error } = await supabase.rpc('get_chat_media', {
    conv_id: conversationId,
    media_type: mediaType || null,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error fetching chat media:', error);
    return [];
  }

  return data || [];
}

export async function addGroupMember(conversationId: string, memberId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('add_group_member', {
    conv_id: conversationId,
    new_member_id: memberId,
  });

  if (error) {
    console.error('Error adding group member:', error);
    return false;
  }

  return data;
}

export async function removeGroupMember(conversationId: string, memberId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('remove_group_member', {
    conv_id: conversationId,
    member_to_remove: memberId,
  });

  if (error) {
    console.error('Error removing group member:', error);
    return false;
  }

  return data;
}

export async function leaveGroup(conversationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('leave_group', {
    conv_id: conversationId,
  });

  if (error) {
    console.error('Error leaving group:', error);
    return false;
  }

  return data;
}

export async function updateMemberRole(
  conversationId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_group_member_role', {
    conv_id: conversationId,
    member_id: memberId,
    new_role: role,
  });

  if (error) {
    console.error('Error updating member role:', error);
    return false;
  }

  return data;
}

export async function updateGroupInfo(
  conversationId: string,
  updates: { name?: string; description?: string; photoUrl?: string }
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_group_info', {
    conv_id: conversationId,
    new_name: updates.name || null,
    new_description: updates.description || null,
    new_photo_url: updates.photoUrl || null,
  });

  if (error) {
    console.error('Error updating group info:', error);
    return false;
  }

  return data;
}

export async function getGroupMembers(conversationId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      *,
      user:users (*)
    `)
    .eq('conversation_id', conversationId)
    .is('left_at', null)
    .order('role', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  return data as GroupMember[];
}

export async function getImportantDates(conversationId: string): Promise<ImportantDate[]> {
  const { data, error } = await supabase
    .from('important_dates')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching important dates:', error);
    return [];
  }

  return data || [];
}

export async function addImportantDate(date: ImportantDateInsert): Promise<ImportantDate | null> {
  const { data, error } = await supabase
    .from('important_dates')
    .insert(date)
    .select()
    .single();

  if (error) {
    console.error('Error adding important date:', error);
    return null;
  }

  return data;
}

export async function updateImportantDate(
  id: string,
  updates: Partial<ImportantDateInsert>
): Promise<boolean> {
  const { error } = await supabase
    .from('important_dates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating important date:', error);
    return false;
  }

  return true;
}

export async function deleteImportantDate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('important_dates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting important date:', error);
    return false;
  }

  return true;
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void,
  onUpdate?: (message: Message) => void,
  onDelete?: (messageId: string) => void,
  onError?: () => void,
  onReconnect?: () => void
): RealtimeChannel {
  let previousStatus: string | null = null;

  const channel = supabase
    .channel(`messages:${conversationId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (onUpdate) onUpdate(payload.new as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const deletedId = (payload.old as { id?: string })?.id;
        if (deletedId && onDelete) onDelete(deletedId);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED' && previousStatus !== null && previousStatus !== 'SUBSCRIBED') {
        if (onReconnect) onReconnect();
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('Message subscription lost, status:', status);
        if (onError) onError();
      }
      previousStatus = status;
    });

  return channel;
}

export function subscribeToTyping(
  conversationId: string,
  currentUserId: string,
  onTyping: (isTyping: boolean, userId: string) => void
): RealtimeChannel {
  return supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const participant = payload.new as { user_id: string; is_typing: boolean };
        if (participant.user_id !== currentUserId) {
          onTyping(participant.is_typing, participant.user_id);
        }
      }
    )
    .subscribe();
}

export function subscribeToReactions(
  conversationId: string,
  onReaction: (messageId: string) => void
): RealtimeChannel {
  return supabase
    .channel(`reactions:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      },
      (payload) => {
        const record = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as { message_id?: string };
        if (record?.message_id) {
          onReaction(record.message_id);
        }
      }
    )
    .subscribe();
}

export function subscribeToConversations(
  userId: string,
  onUpdate: () => void
): RealtimeChannel {
  return supabase
    .channel(`conversations:${userId}`, {
      config: {
        broadcast: { self: true },
      },
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to conversations');
      }
    });
}

export function getBucketForType(messageType: MessageType): string {
  switch (messageType) {
    case 'image':
      return 'chat-images';
    case 'video':
      return 'chat-videos';
    case 'voice':
      return 'chat-voice';
    case 'file':
    default:
      return 'chat-files';
  }
}

export function getMessageTypeFromMime(mimeType: string): MessageType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'voice';
  return 'file';
}

export async function uploadMedia(
  file: File,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; metadata: MediaMetadata } | null> {
  const messageType = getMessageTypeFromMime(file.type);
  const bucket = getBucketForType(messageType);
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  const metadata: MediaMetadata = {
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  };

  if (messageType === 'image') {
    const dimensions = await getImageDimensions(file);
    if (dimensions) {
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    }
  }

  if (messageType === 'video' || messageType === 'voice') {
    const duration = await getMediaDuration(file);
    if (duration) {
      metadata.duration = duration;
    }
  }

  if (onProgress) onProgress(100);

  return { url: urlData.publicUrl, metadata };
}

export async function uploadGroupPhoto(
  conversationId: string,
  file: File
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('group-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading group photo:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('group-photos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function getMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const media = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      resolve(media.duration);
      URL.revokeObjectURL(media.src);
    };
    media.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(media.src);
    };
    media.src = URL.createObjectURL(file);
  });
}

export function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  return supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)
    .then(({ data, error }) => {
      if (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }
      return data.signedUrl;
    });
}
