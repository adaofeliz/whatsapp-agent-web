# Learnings

## Database Layer Setup (2026-02-14)

Successfully created comprehensive database layer for WhatsApp Agent Web:

### Architecture Decisions
- **Lazy Singleton Pattern**: Both wacli.db and app.db use lazy singleton pattern (not module-scope) to survive Next.js hot reload
- **WAL Mode**: Enabled Write-Ahead Logging for concurrent reads while wacli writes
- **Dual Database Strategy**: 
  - wacli.db: readonly better-sqlite3 connection (from wacli)
  - app.db: read/write Drizzle ORM (application state)

### Query Functions Implemented
- `listChats()`, `getChat()`: Chat retrieval with filtering
- `listMessages()`, `getRecentMessages()`: Message retrieval with pagination
- `searchMessages()`: Full-text search using FTS5 virtual table
- `getContacts()`, `getContact()`, `getContactAlias()`: Contact management
- `getChatStats()`: Message statistics (total, sent, received, media, avg per day)
- `getMessagesByHour()`: Message distribution by hour (0-23)
- `getMessageFrequency()`: Daily message counts
- `getParticipantActivity()`: Group participant stats

### App Database Schema
Six tables created via Drizzle:
1. `settings`: Key-value configuration store
2. `style_profiles`: AI response style configurations
3. `auto_response_config`: Per-chat auto-response settings
4. `auto_response_log`: Response generation tracking
5. `approval_queue`: Human-in-the-loop approval workflow
6. `message_proposals_cache`: Cached AI proposals

### Dependencies Added
- `date-fns`: Date formatting utilities
- `drizzle-kit`: Schema migrations (dev dependency)

### Helper Utilities
- **dates.ts**: Unix timestamp conversions (fromUnix, toUnix, formatRelative, formatTime, formatDate)
- **names.ts**: Display name resolution with priority (alias > push_name > full_name > business_name > phone > JID)

### Key Learnings
- better-sqlite3 is synchronous (no async/await needed)
- Drizzle config requires `dialect: 'sqlite'` and `dbCredentials.url`
- drizzle-kit push creates tables without migration files
- FTS5 virtual tables require special handling in queries
- SQLite stores booleans as integers (0/1) - use `{ mode: 'boolean' }` in Drizzle
