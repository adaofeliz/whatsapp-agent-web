import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const styleProfiles = sqliteTable('style_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  system_prompt: text('system_prompt').notNull(),
  temperature: real('temperature').notNull().default(0.7),
  max_tokens: integer('max_tokens').notNull().default(500),
  is_default: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const autoResponseConfig = sqliteTable('auto_response_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chat_jid: text('chat_jid').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  style_profile_id: integer('style_profile_id').references(() => styleProfiles.id),
  require_approval: integer('require_approval', { mode: 'boolean' }).notNull().default(true),
  max_daily_responses: integer('max_daily_responses'),
  daily_response_count: integer('daily_response_count').notNull().default(0),
  daily_count_reset_at: text('daily_count_reset_at'),
  context_window_messages: integer('context_window_messages').notNull().default(10),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const autoResponseLog = sqliteTable('auto_response_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chat_jid: text('chat_jid').notNull(),
  trigger_message_id: text('trigger_message_id').notNull(),
  response_message_id: text('response_message_id'),
  style_profile_id: integer('style_profile_id').references(() => styleProfiles.id),
  prompt_tokens: integer('prompt_tokens').notNull(),
  completion_tokens: integer('completion_tokens').notNull(),
  cost_usd: real('cost_usd').notNull(),
  approved: integer('approved', { mode: 'boolean' }),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const approvalQueue = sqliteTable('approval_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chat_jid: text('chat_jid').notNull(),
  trigger_message_id: text('trigger_message_id').notNull(),
  proposed_response: text('proposed_response').notNull(),
  style_profile_id: integer('style_profile_id').references(() => styleProfiles.id),
  status: text('status', { 
    enum: ['pending', 'approved', 'rejected', 'expired'] 
  }).notNull().default('pending'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  expires_at: text('expires_at').notNull(),
  resolved_at: text('resolved_at'),
});

export const messageProposalCache = sqliteTable('message_proposals_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chat_jid: text('chat_jid').notNull(),
  trigger_message_id: text('trigger_message_id').notNull(),
  context_hash: text('context_hash').notNull(),
  proposal_text: text('proposal_text').notNull(),
  style_profile_id: integer('style_profile_id').references(() => styleProfiles.id),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  expires_at: text('expires_at').notNull(),
});

export const styleProfilesCache = sqliteTable('style_profiles_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contact_name: text('contact_name').notNull().unique(),
  value: text('value').notNull(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const messageProposalsCache = sqliteTable('message_proposals_cache_v2', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contact_name: text('contact_name').notNull(),
  context_hash: text('context_hash').notNull(),
  proposals: text('proposals').notNull(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});
