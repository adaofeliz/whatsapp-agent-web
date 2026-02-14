import Database from 'better-sqlite3';
import { getEnv } from '@/lib/env';
import type {
  Chat,
  Contact,
  ContactAlias,
  Message,
  GroupParticipant,
  ChatStats,
  MessagesByHour,
  MessageFrequency,
  ParticipantActivity,
  SearchResult,
  MessageFilter,
  ChatFilter,
} from '@/types';

let dbInstance: Database.Database | null = null;

export function getWacliDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const env = getEnv();
  
  const db = new Database(env.WACLI_DB_PATH, {
    readonly: true,
    fileMustExist: true,
  });

  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = memory');
  db.pragma('mmap_size = 30000000000');
  db.pragma('page_size = 4096');

  dbInstance = db;
  return db;
}

export function listChats(filter?: ChatFilter): Chat[] {
  const db = getWacliDb();
  
  let query = 'SELECT jid, kind, name, last_message_ts FROM chats WHERE 1=1';
  const params: any[] = [];

  if (filter?.kind) {
    query += ' AND kind = ?';
    params.push(filter.kind);
  }

  if (filter?.searchQuery) {
    query += ' AND (name LIKE ? OR jid LIKE ?)';
    const searchPattern = `%${filter.searchQuery}%`;
    params.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY last_message_ts DESC';

  if (filter?.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  if (filter?.offset) {
    query += ' OFFSET ?';
    params.push(filter.offset);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as Chat[];
}

export function getChat(jid: string): Chat | null {
  const db = getWacliDb();
  const stmt = db.prepare('SELECT jid, kind, name, last_message_ts FROM chats WHERE jid = ?');
  return stmt.get(jid) as Chat | null;
}

export function listMessages(filter?: MessageFilter): Message[] {
  const db = getWacliDb();
  
  let query = `
    SELECT rowid, chat_jid, msg_id, sender_jid, ts, from_me, text, display_text,
           media_type, media_size, media_mime, media_sha256, media_caption, filename,
           thumbnail_sha256, quoted_msg_id, reaction_msg_id, reaction_text,
           deleted, edited, view_once, forwarded, broadcast,
           ephemeral_duration, ephemeral_start_ts
    FROM messages
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.chatJid) {
    query += ' AND chat_jid = ?';
    params.push(filter.chatJid);
  }

  if (filter?.msgId) {
    query += ' AND msg_id = ?';
    params.push(filter.msgId);
  }

  if (filter?.fromMe !== undefined) {
    query += ' AND from_me = ?';
    params.push(filter.fromMe ? 1 : 0);
  }

  if (filter?.mediaType) {
    query += ' AND media_type = ?';
    params.push(filter.mediaType);
  }

  if (filter?.startTs) {
    query += ' AND ts >= ?';
    params.push(filter.startTs);
  }

  if (filter?.endTs) {
    query += ' AND ts <= ?';
    params.push(filter.endTs);
  }

  query += ' ORDER BY ts DESC';

  if (filter?.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  if (filter?.offset) {
    query += ' OFFSET ?';
    params.push(filter.offset);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as Message[];
}

export function getRecentMessages(chatJid: string, limit = 50): Message[] {
  return listMessages({ chatJid, limit });
}

export function searchMessages(searchQuery: string, limit = 50): SearchResult[] {
  const db = getWacliDb();
  
  const stmt = db.prepare(`
    SELECT 
      m.rowid, m.chat_jid, m.msg_id, m.sender_jid, m.ts, m.from_me, 
      m.text, m.display_text, m.media_type, m.media_caption,
      c.kind, c.name as chat_name,
      fts.rank
    FROM messages_fts fts
    JOIN messages m ON fts.rowid = m.rowid
    JOIN chats c ON m.chat_jid = c.jid
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);

  const results = stmt.all(searchQuery, limit) as any[];
  
  return results.map(row => ({
    message: {
      rowid: row.rowid,
      chat_jid: row.chat_jid,
      msg_id: row.msg_id,
      sender_jid: row.sender_jid,
      ts: row.ts,
      from_me: row.from_me,
      text: row.text,
      display_text: row.display_text,
      media_type: row.media_type,
      media_size: null,
      media_mime: null,
      media_sha256: null,
      media_caption: row.media_caption,
      filename: null,
      thumbnail_sha256: null,
      quoted_msg_id: null,
      reaction_msg_id: null,
      reaction_text: null,
      deleted: 0,
      edited: 0,
      view_once: 0,
      forwarded: 0,
      broadcast: 0,
      ephemeral_duration: null,
      ephemeral_start_ts: null,
    },
    chat: {
      jid: row.chat_jid,
      kind: row.kind,
      name: row.chat_name,
      last_message_ts: null,
    },
    displayName: row.chat_name || row.chat_jid,
    snippet: row.text || row.media_caption || '',
    rank: row.rank,
  }));
}

export function getContacts(): Contact[] {
  const db = getWacliDb();
  const stmt = db.prepare(`
    SELECT jid, phone, push_name, full_name, first_name, business_name, updated_at
    FROM contacts
    ORDER BY push_name, full_name
  `);
  return stmt.all() as Contact[];
}

export function getContact(jid: string): Contact | null {
  const db = getWacliDb();
  const stmt = db.prepare(`
    SELECT jid, phone, push_name, full_name, first_name, business_name, updated_at
    FROM contacts
    WHERE jid = ?
  `);
  return stmt.get(jid) as Contact | null;
}

export function getContactAlias(jid: string): ContactAlias | null {
  const db = getWacliDb();
  const stmt = db.prepare(`
    SELECT jid, alias, notes, updated_at
    FROM contact_aliases
    WHERE jid = ?
  `);
  return stmt.get(jid) as ContactAlias | null;
}

export function getGroups(): Chat[] {
  return listChats({ kind: 'group' });
}

export function getGroupParticipants(chatJid: string): GroupParticipant[] {
  const db = getWacliDb();
  const stmt = db.prepare(`
    SELECT chat_jid, participant_jid, is_admin, is_superadmin
    FROM group_participants
    WHERE chat_jid = ?
  `);
  return stmt.all(chatJid) as GroupParticipant[];
}

export function getChatStats(chatJid: string): ChatStats {
  const db = getWacliDb();
  
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_messages,
      SUM(CASE WHEN from_me = 1 THEN 1 ELSE 0 END) as sent_messages,
      SUM(CASE WHEN from_me = 0 THEN 1 ELSE 0 END) as received_messages,
      SUM(CASE WHEN media_type IS NOT NULL THEN 1 ELSE 0 END) as media_messages,
      MIN(ts) as first_message_ts,
      MAX(ts) as last_message_ts
    FROM messages
    WHERE chat_jid = ?
  `);

  const stats = stmt.get(chatJid) as any;
  
  const daysDiff = stats.first_message_ts && stats.last_message_ts
    ? Math.max(1, Math.ceil((stats.last_message_ts - stats.first_message_ts) / (60 * 60 * 24)))
    : 1;

  return {
    totalMessages: stats.total_messages || 0,
    sentMessages: stats.sent_messages || 0,
    receivedMessages: stats.received_messages || 0,
    mediaMessages: stats.media_messages || 0,
    firstMessageTs: stats.first_message_ts,
    lastMessageTs: stats.last_message_ts,
    avgMessagesPerDay: stats.total_messages ? stats.total_messages / daysDiff : 0,
  };
}

export function getMessagesByHour(chatJid?: string): MessagesByHour[] {
  const db = getWacliDb();
  
  let query = `
    SELECT 
      CAST(strftime('%H', datetime(ts, 'unixepoch')) AS INTEGER) as hour,
      COUNT(*) as count
    FROM messages
  `;

  const params: any[] = [];
  if (chatJid) {
    query += ' WHERE chat_jid = ?';
    params.push(chatJid);
  }

  query += ' GROUP BY hour ORDER BY hour';

  const stmt = db.prepare(query);
  return stmt.all(...params) as MessagesByHour[];
}

export function getMessageFrequency(chatJid: string, days = 30): MessageFrequency[] {
  const db = getWacliDb();
  
  const cutoffTs = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const stmt = db.prepare(`
    SELECT 
      date(datetime(ts, 'unixepoch')) as date,
      COUNT(*) as count
    FROM messages
    WHERE chat_jid = ? AND ts >= ?
    GROUP BY date
    ORDER BY date DESC
  `);

  return stmt.all(chatJid, cutoffTs) as MessageFrequency[];
}

export function getParticipantActivity(chatJid: string, limit = 20): ParticipantActivity[] {
  const db = getWacliDb();
  
  const stmt = db.prepare(`
    SELECT 
      m.sender_jid as participant_jid,
      COALESCE(c.push_name, c.full_name, m.sender_jid) as participant_name,
      COUNT(*) as message_count,
      MAX(m.ts) as last_message_ts
    FROM messages m
    LEFT JOIN contacts c ON m.sender_jid = c.jid
    WHERE m.chat_jid = ? AND m.sender_jid IS NOT NULL
    GROUP BY m.sender_jid
    ORDER BY message_count DESC
    LIMIT ?
  `);

  return stmt.all(chatJid, limit) as ParticipantActivity[];
}
