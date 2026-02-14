// TypeScript types for WhatsApp Agent Web

// ============================================================================
// WACLI Database Types (from wacli.db - readonly)
// ============================================================================

export type ChatKind = 'dm' | 'group' | 'broadcast' | 'status';

export interface Chat {
  jid: string;
  kind: ChatKind;
  name: string | null;
  last_message_ts: number | null;
}

export interface Contact {
  jid: string;
  phone: string | null;
  push_name: string | null;
  full_name: string | null;
  first_name: string | null;
  business_name: string | null;
  updated_at: number | null;
}

export interface ContactAlias {
  jid: string;
  alias: string | null;
  notes: string | null;
  updated_at: number | null;
}

export interface Message {
  rowid: number;
  chat_jid: string;
  msg_id: string;
  sender_jid: string | null;
  ts: number;
  from_me: number; // 0 or 1 (boolean)
  text: string | null;
  display_text: string | null;
  media_type: string | null;
  media_size: number | null;
  media_mime: string | null;
  media_sha256: string | null;
  media_caption: string | null;
  filename: string | null;
  thumbnail_sha256: string | null;
  quoted_msg_id: string | null;
  reaction_msg_id: string | null;
  reaction_text: string | null;
  deleted: number; // 0 or 1 (boolean)
  edited: number; // 0 or 1 (boolean)
  view_once: number; // 0 or 1 (boolean)
  forwarded: number; // 0 or 1 (boolean)
  broadcast: number; // 0 or 1 (boolean)
  ephemeral_duration: number | null;
  ephemeral_start_ts: number | null;
}

export interface GroupParticipant {
  chat_jid: string;
  participant_jid: string;
  is_admin: number; // 0 or 1 (boolean)
  is_superadmin: number; // 0 or 1 (boolean)
}

// ============================================================================
// App Database Types (from app.db - read/write)
// ============================================================================

export interface Settings {
  id: number;
  key: string;
  value: string;
  updated_at: string; // ISO timestamp
}

export interface StyleProfile {
  id: number;
  name: string;
  description: string | null;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_default: number; // 0 or 1 (boolean)
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AutoResponseConfig {
  id: number;
  chat_jid: string;
  enabled: boolean;
  style_profile_id: number | null;
  require_approval: boolean;
  max_daily_responses: number | null;
  daily_response_count: number;
  daily_count_reset_at: string | null; // ISO timestamp
  context_window_messages: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AutoResponseLog {
  id: number;
  chat_jid: string;
  trigger_message_id: string;
  response_message_id: string | null;
  style_profile_id: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  approved: number | null; // 0 or 1 (boolean) or null if pending
  created_at: string; // ISO timestamp
}

export interface ApprovalQueue {
  id: number;
  chat_jid: string;
  trigger_message_id: string;
  proposed_response: string;
  style_profile_id: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
  resolved_at: string | null; // ISO timestamp
}

export interface MessageProposalCache {
  id: number;
  chat_jid: string;
  trigger_message_id: string;
  context_hash: string; // Hash of context used to generate proposal
  proposal_text: string;
  style_profile_id: number | null;
  created_at: string; // ISO timestamp
  expires_at: string; // ISO timestamp
}

// ============================================================================
// UI/Query Types
// ============================================================================

export interface ChatWithStats {
  chat: Chat;
  contact?: Contact;
  alias?: string;
  displayName: string;
  messageCount: number;
  lastMessageDate: Date | null;
  autoResponseEnabled: boolean;
}

export interface MessageWithSender {
  message: Message;
  senderName: string;
  chatName: string;
}

export interface ChatStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  mediaMessages: number;
  firstMessageTs: number | null;
  lastMessageTs: number | null;
  avgMessagesPerDay: number;
}

export interface MessageFrequency {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface MessagesByHour {
  hour: number; // 0-23
  count: number;
}

export interface ParticipantActivity {
  participant_jid: string;
  participant_name: string;
  message_count: number;
  last_message_ts: number | null;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  message: Message;
  chat: Chat;
  contact?: Contact;
  displayName: string;
  snippet: string; // Matched text snippet
  rank: number; // FTS5 ranking
}

// ============================================================================
// Filter/Pagination Types
// ============================================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface MessageFilter extends PaginationOptions {
  chatJid?: string;
  msgId?: string;
  fromMe?: boolean;
  mediaType?: string;
  startTs?: number;
  endTs?: number;
}

export interface ChatFilter extends PaginationOptions {
  kind?: ChatKind;
  hasAutoResponse?: boolean;
  searchQuery?: string;
}
