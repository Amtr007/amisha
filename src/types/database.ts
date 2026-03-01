export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          display_name: string | null;
          profile_photo_url: string | null;
          status_message: string | null;
          last_seen: string;
          is_ai_user: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          display_name?: string | null;
          profile_photo_url?: string | null;
          status_message?: string | null;
          last_seen?: string;
          is_ai_user?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          display_name?: string | null;
          profile_photo_url?: string | null;
          status_message?: string | null;
          last_seen?: string;
          is_ai_user?: boolean;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          is_group: boolean;
          group_name: string | null;
          group_photo_url: string | null;
          group_description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          is_group?: boolean;
          group_name?: string | null;
          group_photo_url?: string | null;
          group_description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_group?: boolean;
          group_name?: string | null;
          group_photo_url?: string | null;
          group_description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: ParticipantRole;
          joined_at: string;
          left_at: string | null;
          last_read_at: string;
          is_typing: boolean;
          typing_updated_at: string | null;
          muted_until: string | null;
          cleared_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role?: ParticipantRole;
          joined_at?: string;
          left_at?: string | null;
          last_read_at?: string;
          is_typing?: boolean;
          typing_updated_at?: string | null;
          muted_until?: string | null;
          cleared_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: ParticipantRole;
          joined_at?: string;
          left_at?: string | null;
          last_read_at?: string;
          is_typing?: boolean;
          typing_updated_at?: string | null;
          muted_until?: string | null;
          cleared_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          message_type: MessageType;
          media_url: string | null;
          media_metadata: MediaMetadata;
          reply_to_id: string | null;
          status: MessageStatus;
          is_deleted: boolean;
          deleted_for: string[];
          deleted_for_everyone: boolean;
          deleted_at: string | null;
          edited_at: string | null;
          original_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          message_type?: MessageType;
          media_url?: string | null;
          media_metadata?: MediaMetadata;
          reply_to_id?: string | null;
          status?: MessageStatus;
          is_deleted?: boolean;
          deleted_for?: string[];
          deleted_for_everyone?: boolean;
          deleted_at?: string | null;
          edited_at?: string | null;
          original_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string | null;
          message_type?: MessageType;
          media_url?: string | null;
          media_metadata?: MediaMetadata;
          reply_to_id?: string | null;
          status?: MessageStatus;
          is_deleted?: boolean;
          deleted_for?: string[];
          deleted_for_everyone?: boolean;
          deleted_at?: string | null;
          edited_at?: string | null;
          original_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      starred_messages: {
        Row: {
          id: string;
          user_id: string;
          message_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message_id?: string;
          created_at?: string;
        };
      };
      important_dates: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          title: string;
          date: string;
          notes: string | null;
          reminder_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          title: string;
          date: string;
          notes?: string | null;
          reminder_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          title?: string;
          date?: string;
          notes?: string | null;
          reminder_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_notifications_enabled: boolean;
          notification_sound_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_notifications_enabled?: boolean;
          notification_sound_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_notifications_enabled?: boolean;
          notification_sound_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_notification_settings: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          email_notifications_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          email_notifications_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          email_notifications_enabled?: boolean;
          created_at?: string;
        };
      };
      email_notification_logs: {
        Row: {
          id: string;
          message_id: string;
          recipient_user_id: string;
          recipient_email: string;
          sender_name: string;
          chat_name: string;
          message_preview: string;
          status: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          recipient_user_id: string;
          recipient_email: string;
          sender_name: string;
          chat_name: string;
          message_preview: string;
          status?: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          recipient_user_id?: string;
          recipient_email?: string;
          sender_name?: string;
          chat_name?: string;
          message_preview?: string;
          status?: 'pending' | 'sent' | 'failed' | 'skipped';
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      check_username_available: {
        Args: { username_to_check: string };
        Returns: boolean;
      };
      get_user_email_by_username: {
        Args: { username_input: string };
        Returns: string | null;
      };
      update_last_seen: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_or_create_conversation: {
        Args: { other_user_id: string };
        Returns: string;
      };
      get_unread_count: {
        Args: { conv_id: string };
        Returns: number;
      };
      mark_messages_read: {
        Args: { conv_id: string };
        Returns: void;
      };
      update_typing_status: {
        Args: { conv_id: string; typing: boolean };
        Returns: void;
      };
      create_group_conversation: {
        Args: { group_name_input: string; member_ids: string[]; group_description_input?: string };
        Returns: string;
      };
      add_group_member: {
        Args: { conv_id: string; new_member_id: string };
        Returns: boolean;
      };
      remove_group_member: {
        Args: { conv_id: string; member_to_remove: string };
        Returns: boolean;
      };
      leave_group: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      update_group_member_role: {
        Args: { conv_id: string; member_id: string; new_role: string };
        Returns: boolean;
      };
      delete_message_for_everyone: {
        Args: { message_id_input: string };
        Returns: boolean;
      };
      clear_chat_history: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      delete_conversation: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      search_messages: {
        Args: { conv_id: string; search_query: string; limit_count?: number };
        Returns: SearchMessageResult[];
      };
      get_chat_media: {
        Args: { conv_id: string; media_type?: string; limit_count?: number; offset_count?: number };
        Returns: ChatMediaResult[];
      };
      update_group_info: {
        Args: { conv_id: string; new_name?: string; new_description?: string; new_photo_url?: string };
        Returns: boolean;
      };
    };
  };
}

export type ParticipantRole = 'admin' | 'member';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MediaMetadata {
  filename?: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface SearchMessageResult {
  id: string;
  content: string;
  message_type: string;
  sender_id: string;
  created_at: string;
}

export interface ChatMediaResult {
  id: string;
  message_type: string;
  media_url: string;
  media_metadata: MediaMetadata;
  sender_id: string;
  created_at: string;
}

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];

export type StarredMessage = Database['public']['Tables']['starred_messages']['Row'];
export type ImportantDate = Database['public']['Tables']['important_dates']['Row'];
export type ImportantDateInsert = Database['public']['Tables']['important_dates']['Insert'];

export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];
export type ChatNotificationSettings = Database['public']['Tables']['chat_notification_settings']['Row'];
export type EmailNotificationLog = Database['public']['Tables']['email_notification_logs']['Row'];

export interface ConversationWithDetails extends Conversation {
  participants: (ConversationParticipant & { user: User })[];
  lastMessage?: Message & { sender: User };
  unreadCount: number;
  otherUser?: User;
  currentUserRole?: ParticipantRole;
}

export interface MessageWithDetails extends Message {
  sender: User;
  reactions: MessageReaction[];
  replyTo?: Message & { sender: User };
  isStarred?: boolean;
}

export interface GroupMember extends ConversationParticipant {
  user: User;
}
