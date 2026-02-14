# WhatsApp Agent Web — Work Plan

## TL;DR

> **Quick Summary**: Build a full-stack WhatsApp analytics and messaging web app that reads from wacli's SQLite database, provides AI-powered conversation analytics (style profiles, timing, frequency, dropout detection), generates message proposals via OpenRouter, and supports auto-response with conservative safety controls. Deployed via Docker Compose with wacli sync running alongside Next.js.
>
> **Deliverables**:
> - Next.js 14+ App Router web application with hybrid sidebar UI
> - Authentication system (single master password)
> - Chat history browser with real-time polling from wacli.db
> - AI analytics dashboard (style profiles, timing graphs, frequency, dropout detection)
> - Message proposal generator (3 options per suggestion)
> - Message sending via wacli CLI (with sync lock management)
> - Auto-response system with conservative safety (5/hr, approval queue)
> - Docker Compose deployment with supervisord (Next.js + wacli sync)
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10 → Task 11

---

## Context

### Original Request
Build an app using SQLite, Next.js, and React that integrates with wacli (WhatsApp CLI) to organize WhatsApp chats in a web interface with AI-powered analytics, message proposals, auto-response capabilities, and Docker Compose deployment. Protected by single master password authentication.

### Interview Summary
**Key Discussions**:
- **Docker auth**: wacli authenticated outside Docker. Mount `~/.wacli` into container. Docker only runs `sync --follow`.
- **Auto-response safety**: Conservative — per-chat enable/disable, 5 replies/hr max, cooldown between replies, first 3 messages per chat require human approval.
- **UI style**: Hybrid sidebar — left=chat list, center=conversation, right=analytics/AI suggestions panel.
- **AI depth**: Deep analysis — full history analysis, style profiles per contact (tone, vocabulary, emoji, response times, topics, formality level).
- **wacli status**: Already installed and authenticated. `~/.wacli` exists with synced data.
- **Message proposals**: 3 per suggestion (casual, formal, context-matched).
- **Tests**: No automated tests — agent QA scenarios only.
- **UI framework**: shadcn/ui + Tailwind CSS.
- **Charts**: Recharts.

**Research Findings**:
- **wacli DB schema**: Fully mapped from source code — tables: `chats`, `contacts`, `groups`, `group_participants`, `messages` (with FTS5 via `messages_fts`), `contact_aliases`, `contact_tags`. WAL mode enabled, `busy_timeout=5000`.
- **CRITICAL — wacli lock conflict**: Both `sync --follow` and `send text` acquire exclusive `flock` on LOCK file. Cannot send while syncing. Solution: stop-sync-send-restart via supervisord control.
- **better-sqlite3**: Supports `readonly: true` for concurrent reads of WAL-mode databases. Recommended for wacli.db access.
- **Drizzle ORM**: Lightweight (7.4kb), type-safe. Recommended for app-specific database.
- **OpenRouter SDK**: `@openrouter/sdk` package, OpenAI-compatible. Model tiering: deepseek-v3.2 for cheap tasks ($0.25/M), gpt-5.2 for generation ($1.25/M), claude-sonnet-4.5 for deep analysis ($3/M).
- **Docker**: Single container with supervisord for co-running Next.js + wacli sync. Multi-stage build (Go builder + Node builder + production runtime).

### Metis Review
**Identified Gaps** (addressed):
- **wacli send lock conflict**: Confirmed via source code analysis. Solution: supervisord stop/start pattern for sending.
- **Contact name resolution**: Need deterministic priority: alias > push_name > full_name > business_name > phone. Built as shared utility.
- **AI cost explosion**: Addressed via aggressive caching in app.db, model tiering, and on-demand-only computation.
- **Auto-response in groups**: Explicitly excluded from v1.
- **Input sanitization**: All wacli CLI calls use `execFile()` with arg arrays, never `exec()`.
- **Empty/edge states**: Plan includes handling for no data, media-only chats, RTL text.
- **OpenRouter graceful degradation**: AI features show loading/unavailable state, never crash the app.

---

## Work Objectives

### Core Objective
Build a production-ready WhatsApp analytics and messaging web application that reads from wacli's local SQLite database, provides deep AI-powered conversation insights via OpenRouter, and allows sending messages with optional auto-response — all deployed via Docker Compose.

### Concrete Deliverables
- Next.js 14+ application in `app/` directory (App Router)
- `docker-compose.yml` + `Dockerfile` for one-command deployment
- `supervisord.conf` for process management (Next.js + wacli sync)
- Login page with master password auth
- Hybrid sidebar UI: chat list / conversation / analytics panel
- 7 API route groups: `/api/auth`, `/api/chats`, `/api/messages`, `/api/analytics`, `/api/ai`, `/api/settings`, `/api/health`
- App database schema via Drizzle ORM (settings, style profiles, auto-response config, approval queue)
- AI prompt templates in `lib/ai/prompts.ts`
- OpenRouter integration with model tiering

### Definition of Done
- [x] `docker compose up` starts the app and wacli sync successfully
- [x] Login with master password works, invalid password is rejected
- [x] Chat list shows all chats from wacli.db sorted by last message
- [x] Clicking a chat shows message history with correct sender names
- [x] Analytics panel shows style profile, timing chart, frequency data
- [x] "Suggest replies" generates 3 message proposals
- [x] Sending a message works (sync stops, sends, restarts)
- [x] Auto-response can be enabled per chat with approval queue
- [x] Health endpoint returns wacli sync status

### Must Have
- Master password authentication protecting all routes
- Real-time polling of wacli.db (≤10 second interval)
- Chat list with DMs and groups
- Message history viewer
- Contact display name resolution (alias > push_name > full_name > business_name > phone)
- AI style profile per contact/chat
- Best time to talk visualization
- Message frequency chart
- Dropout/inactivity detection
- 3 message proposal generation
- Message sending via wacli CLI
- Auto-response with 5/hr limit and approval queue (first 3)
- Global auto-response kill switch
- Docker Compose deployment
- Health check endpoint

### Must NOT Have (Guardrails)
- No media rendering — show type + caption placeholder only
- No group auto-response in v1
- No multi-user authentication — single master password only
- No WebSocket server — use polling/SSE only
- No LangChain, LlamaIndex, or AI orchestration frameworks — raw OpenRouter SDK only
- No generic `BaseService` or `AbstractProvider` classes — direct implementations
- No Redis, no message queues — SQLite + polling is sufficient for single-user
- No component storybook or custom design system
- No GraphQL — REST API routes only
- No prompt templating libraries — plain template literals
- No `child_process.exec()` — always `execFile()` with arg arrays
- No mobile-responsive design in v1 — desktop-first
- No sentiment analysis, relationship scoring, or multi-language detection in v1
- No auto-selection learning from user picks in v1

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks are verifiable WITHOUT any human action.
> ALL verification is executed by the agent using tools (Playwright, Bash/curl, interactive_bash).

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: NONE — agent QA scenarios only
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Frontend/UI** | Playwright (playwright skill) | Navigate, interact, assert DOM, screenshot |
| **API Routes** | Bash (curl) | Send requests, parse responses, assert fields |
| **Docker** | Bash (docker compose) | Build, start, health check, logs |
| **Database** | Bash (sqlite3 CLI) | Query tables, verify schema |
| **Process Management** | interactive_bash (tmux) | Start supervisord, verify both processes |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Project scaffolding (Next.js + deps + config)
└── (sequential from here due to dependency chain)

Wave 2 (After Task 3 — core read layer):
├── Task 4: Chat list + message display UI
├── Task 5: Message sending (wacli CLI integration)
└── (Task 4 and 5 can be parallel — different UI areas)

Wave 3 (After Task 4 — UI shell exists):
├── Task 7: Analytics engine + visualizations
├── Task 8: Message proposals + AI suggestions UI
└── (7 and 8 are independent AI features)

Wave 4 (After Tasks 7+8 — AI layer exists):
├── Task 9: Auto-response system
├── Task 10: Settings + configuration UI
└── Task 11: Docker packaging
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (foundation) |
| 2 | 1 | 3, 4, 5, 6, 7, 8, 9, 10 | None |
| 3 | 2 | 4, 5, 7, 8 | None |
| 4 | 3 | 7, 8, 9 | 5 |
| 5 | 3 | 9 | 4 |
| 6 | 1 | 7, 8, 9 | 3, 4, 5 |
| 7 | 4, 6 | 9 | 8 |
| 8 | 4, 6 | 9 | 7 |
| 9 | 5, 7, 8 | 10 | None |
| 10 | 9 | 11 | None |
| 11 | 10 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `task(category="quick", load_skills=[], ...)` |
| 1→2 | 2, 3 | `task(category="unspecified-high", load_skills=[], ...)` — sequential |
| 2 | 4, 5 | parallel: `task(category="visual-engineering", load_skills=["frontend-ui-ux"], ...)` + `task(category="unspecified-high", load_skills=[], ...)` |
| 2 | 6 | `task(category="unspecified-high", load_skills=[], ...)` — can run with Wave 2 |
| 3 | 7, 8 | parallel: both `task(category="visual-engineering", load_skills=["frontend-ui-ux"], ...)` |
| 4 | 9, 10, 11 | sequential: `task(category="unspecified-high", ...)` → `task(category="visual-engineering", ...)` → `task(category="unspecified-high", ...)` |

---

## TODOs

- [x] 1. Project Scaffolding + Configuration

  **What to do**:
  - Initialize Next.js 14+ project with App Router: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - Install core dependencies:
    - `better-sqlite3` + `@types/better-sqlite3` (wacli.db reader)
    - `drizzle-orm` + `drizzle-kit` (app.db ORM)
    - `@openrouter/sdk` (AI provider)
    - `jose` (JWT for auth)
    - `bcryptjs` + `@types/bcryptjs` (password hashing)
    - `recharts` (charts)
    - `zod` (validation)
  - Initialize shadcn/ui: `npx shadcn@latest init` — choose default theme, CSS variables, New York style
  - Add shadcn components needed across the app: `npx shadcn@latest add button card input label dialog sheet scroll-area separator tabs badge avatar skeleton toast dropdown-menu switch slider textarea tooltip`
  - Configure `next.config.ts` with `output: "standalone"` and `serverExternalPackages: ["better-sqlite3"]`
  - Create `.env.example` with all environment variables:
    ```
    MASTER_PASSWORD_HASH=        # bcrypt hash of master password
    JWT_SECRET=                  # random string for JWT signing
    OPENROUTER_API_KEY=          # OpenRouter API key
    WACLI_DB_PATH=               # path to wacli.db (default: /data/wacli.db)
    WACLI_STORE_DIR=             # path to wacli store (default: /data/.wacli)
    WACLI_BINARY_PATH=           # path to wacli binary (default: /usr/local/bin/wacli)
    ```
  - Create `lib/env.ts` with validated env loading via Zod
  - Create project directory structure:
    ```
    src/
      app/
        (auth)/login/page.tsx
        (app)/layout.tsx
        (app)/page.tsx
        api/auth/login/route.ts
        api/health/route.ts
        layout.tsx
        globals.css
      lib/
        db/wacli.ts          # wacli.db readonly connection
        db/app.ts             # app.db drizzle connection
        db/schema.ts          # drizzle schema for app.db
        ai/openrouter.ts      # OpenRouter client singleton
        ai/prompts.ts         # All AI prompt templates
        ai/models.ts          # Model selection config
        auth/jwt.ts           # JWT sign/verify
        auth/middleware.ts     # Auth middleware
        utils/names.ts        # Contact name resolution
        utils/wacli.ts        # wacli CLI execution helpers
        utils/dates.ts        # Timestamp conversion helpers
      components/
        ui/                   # shadcn components (auto-generated)
        chat/                 # Chat-related components
        analytics/            # Analytics components
        layout/               # Layout components
      hooks/
        use-polling.ts        # Generic polling hook
      types/
        index.ts              # Shared TypeScript types
    ```

  **Must NOT do**:
  - Do NOT install LangChain, LlamaIndex, or any AI framework
  - Do NOT set up Redis, message queues, or WebSocket
  - Do NOT create a custom component library or storybook
  - Do NOT install GraphQL dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Scaffolding is mechanical — create project, install deps, set up directories
  - **Skills**: `[]`
    - No special skills needed for project init
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — just installing, not designing yet

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first task)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - None (greenfield project)

  **API/Type References**:
  - wacli DB schema from `internal/store/store.go`: Tables `chats` (jid, kind, name, last_message_ts), `contacts` (jid, phone, push_name, full_name, first_name, business_name, updated_at), `groups` (jid, name, owner_jid, created_ts, updated_at), `group_participants` (group_jid, user_jid, role, updated_at), `messages` (rowid, chat_jid, chat_name, msg_id, sender_jid, sender_name, ts, from_me, text, display_text, media_type, media_caption, filename, mime_type, direct_path, media_key, file_sha256, file_enc_sha256, file_length, local_path, downloaded_at), `messages_fts` (FTS5: text, media_caption, filename, chat_name, sender_name, display_text), `contact_aliases` (jid, alias, notes, updated_at), `contact_tags` (jid, tag, updated_at)
  - wacli uses WAL mode: `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA temp_store=MEMORY; PRAGMA foreign_keys=ON;`

  **External References**:
  - Next.js App Router: https://nextjs.org/docs/app
  - shadcn/ui installation: https://ui.shadcn.com/docs/installation/next
  - better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
  - Drizzle ORM SQLite: https://orm.drizzle.team/docs/get-started/sqlite-new
  - OpenRouter SDK: https://www.npmjs.com/package/@openrouter/sdk

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Project builds successfully
    Tool: Bash
    Preconditions: All dependencies installed
    Steps:
      1. Run: npm run build
      2. Assert: exit code 0
      3. Assert: .next/standalone directory exists
    Expected Result: Build completes without errors
    Evidence: Build output captured

  Scenario: Dev server starts
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: npm run dev &
      2. Wait 5 seconds
      3. curl -s http://localhost:3000 -w "%{http_code}"
      4. Assert: HTTP status 200 or 307 (redirect to login)
      5. Kill dev server
    Expected Result: Dev server responds
    Evidence: HTTP response code captured

  Scenario: Environment validation works
    Tool: Bash
    Preconditions: No .env file
    Steps:
      1. Run: node -e "require('./src/lib/env.ts')" 2>&1
      2. Assert: output contains error about missing env vars
    Expected Result: Zod validation catches missing env
    Evidence: Error output captured
  ```

  **Commit**: YES
  - Message: `feat: scaffold Next.js project with dependencies and directory structure`
  - Files: All generated files
  - Pre-commit: `npm run build`

---

- [x] 2. Authentication System

  **What to do**:
  - Create `lib/auth/jwt.ts`:
    - `signToken(payload)`: creates JWT using `jose`, expires in 7 days, uses `JWT_SECRET` from env
    - `verifyToken(token)`: verifies and returns payload
  - Create `lib/auth/password.ts`:
    - `verifyPassword(plain)`: compares plain text against `MASTER_PASSWORD_HASH` env var using bcryptjs
    - Add a CLI helper comment showing how to generate hash: `node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"`
  - Create `app/api/auth/login/route.ts`:
    - POST handler: accepts `{ password: string }`, validates with Zod, verifies password
    - On success: returns JWT in httpOnly cookie named `session` (secure, sameSite: lax, path: /, maxAge: 7 days)
    - On failure: returns 401 with `{ error: "Invalid password" }`
  - Create `middleware.ts` (Next.js root middleware):
    - Protects all routes except `/login`, `/api/auth/login`, and `/_next`
    - Reads `session` cookie, verifies JWT
    - If invalid/missing: redirect to `/login` (for page requests) or return 401 (for API requests)
  - Create `app/(auth)/login/page.tsx`:
    - Clean login form with password input and submit button
    - Uses shadcn/ui Card, Input, Button, Label components
    - Client-side form submission to `/api/auth/login`
    - On success: redirect to `/` using `router.push('/')`
    - On error: show error message using shadcn Toast
    - Simple centered layout, app name/logo at top
  - Create `app/api/auth/logout/route.ts`:
    - POST handler: clears session cookie
    - Returns redirect to `/login`

  **Must NOT do**:
  - Do NOT build multi-user auth, registration, or user management
  - Do NOT implement 2FA
  - Do NOT store passwords in database — only bcrypt hash in .env
  - Do NOT use any auth library (NextAuth, etc.) — manual JWT + bcrypt only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Auth is critical infrastructure — needs careful security handling
  - **Skills**: `[]`
    - No special skills needed — standard API route development
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Login page is simple enough without design expertise

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Task 1)
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 8, 9, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/lib/env.ts` — env loading pattern (created in Task 1)

  **API/Type References**:
  - None (creating new)

  **External References**:
  - jose JWT library: https://github.com/panva/jose — use `SignJWT` and `jwtVerify`
  - bcryptjs: https://www.npmjs.com/package/bcryptjs — use `compare()`
  - Next.js middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

  **WHY Each Reference Matters**:
  - jose: Provides JWT sign/verify that works in Edge Runtime (middleware runs on Edge)
  - bcryptjs: Pure JS bcrypt — no native compilation needed, works in all environments
  - Next.js middleware: Must follow the exact middleware pattern for route protection

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Login with correct password returns session cookie
    Tool: Bash (curl)
    Preconditions: Dev server running, MASTER_PASSWORD_HASH set in .env
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/login \
           -H "Content-Type: application/json" \
           -d '{"password":"testpassword"}' -c cookies.txt
      2. Assert: HTTP status is 200
      3. Assert: response contains {"success":true}
      4. Assert: cookies.txt contains "session" cookie
    Expected Result: Login succeeds, session cookie set
    Evidence: Response body and cookies captured

  Scenario: Login with wrong password returns 401
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/login \
           -H "Content-Type: application/json" \
           -d '{"password":"wrongpassword"}'
      2. Assert: HTTP status is 401
      3. Assert: response contains "Invalid password"
    Expected Result: Login rejected
    Evidence: Response body captured

  Scenario: Unauthenticated API request returns 401
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. curl -s -w "\n%{http_code}" http://localhost:3000/api/chats
      2. Assert: HTTP status is 401
    Expected Result: Protected route rejects unauthenticated request
    Evidence: HTTP status captured

  Scenario: Login page renders and works
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/login
      2. Wait for: input[type="password"] visible (timeout: 5s)
      3. Assert: page contains "Password" label
      4. Fill: input[type="password"] → "wrongpassword"
      5. Click: button[type="submit"]
      6. Wait for: error message visible (timeout: 5s)
      7. Assert: error text contains "Invalid"
      8. Clear password input
      9. Fill: input[type="password"] → "testpassword"
      10. Click: button[type="submit"]
      11. Wait for: navigation to / (timeout: 10s)
      12. Assert: URL is http://localhost:3000/
      13. Screenshot: .sisyphus/evidence/task-2-login-flow.png
    Expected Result: Login flow works end-to-end
    Evidence: .sisyphus/evidence/task-2-login-flow.png
  ```

  **Commit**: YES
  - Message: `feat(auth): add master password authentication with JWT sessions`
  - Files: `lib/auth/`, `middleware.ts`, `app/(auth)/login/`, `app/api/auth/`
  - Pre-commit: `npm run build`

---

- [x] 3. wacli Database Reader Layer + App Database

  **What to do**:
  - Create `lib/db/wacli.ts` — wacli.db readonly connection:
    - Lazy singleton pattern (not module-scope to survive hot reload)
    - `getWacliDb()`: returns `better-sqlite3` instance with `{ readonly: true, fileMustExist: true }`
    - Enable WAL read mode pragmas: `PRAGMA journal_mode=WAL; PRAGMA cache_size=-64000;`
    - Query functions (all return typed objects):
      - `listChats(query?: string, limit?: number)` — returns chats sorted by `last_message_ts DESC`
      - `getChat(jid: string)` — single chat by JID
      - `listMessages(chatJid: string, limit?: number, before?: number)` — messages with pagination
      - `searchMessages(query: string, chatJid?: string, limit?: number)` — FTS5 search
      - `getContacts()` — all contacts
      - `getContact(jid: string)` — single contact
      - `getGroups()` — all groups
      - `getGroupParticipants(groupJid: string)` — group members
      - `getChatStats(chatJid: string)` — message count, first/last message, participant count
      - `getMessagesByHour(chatJid: string)` — hourly distribution for timing analytics
      - `getMessageFrequency(chatJid: string, interval: 'day' | 'week' | 'month')` — frequency over time
      - `getParticipantActivity(chatJid: string)` — messages per participant for dropout detection
      - `getRecentMessages(chatJid: string, limit: number)` — most recent N messages for AI context
  - Create `lib/utils/names.ts` — display name resolution:
    - `resolveDisplayName(contact, chat?)`: returns first non-empty of: alias > push_name > full_name > business_name > phone > JID
    - Used everywhere names appear in the UI and in AI prompts
  - Create `lib/utils/dates.ts` — timestamp helpers:
    - `fromUnix(sec: number)`: converts Unix seconds to Date
    - `toUnix(date: Date)`: converts Date to Unix seconds
    - `formatRelative(date: Date)`: "2 hours ago", "yesterday", etc.
    - `formatTime(date: Date)`: "14:30"
    - `formatDate(date: Date)`: "Feb 14, 2026"
  - Create `lib/db/schema.ts` — Drizzle schema for app.db:
    ```typescript
    // Tables:
    settings: { key (PK), value, updated_at }
    style_profiles: { chat_jid (PK), profile_json, model_used, computed_at, expires_at }
    auto_response_config: { chat_jid (PK), enabled, max_per_hour, approved_count, rules_json, updated_at }
    auto_response_log: { id (PK auto), chat_jid, message_text, proposal_index, sent_at, was_approved }
    approval_queue: { id (PK auto), chat_jid, incoming_msg_id, incoming_text, proposals_json, status ('pending'|'approved'|'rejected'|'expired'), created_at, resolved_at }
    message_proposals_cache: { chat_jid (PK), proposals_json, context_hash, created_at, expires_at }
    ```
  - Create `lib/db/app.ts` — app.db Drizzle connection:
    - Lazy singleton pattern
    - `getAppDb()`: returns Drizzle instance backed by better-sqlite3
    - Auto-create app.db in data directory if it doesn't exist
    - Run Drizzle migrations on startup
  - Create `src/types/index.ts` — shared TypeScript types:
    - `Chat`, `Contact`, `Group`, `Message`, `GroupParticipant`
    - `StyleProfile`, `AutoResponseConfig`, `ApprovalQueueItem`, `MessageProposal`
    - `ChatStats`, `HourlyDistribution`, `FrequencyData`, `ParticipantActivity`

  **Must NOT do**:
  - Do NOT write to wacli.db — it is strictly readonly
  - Do NOT import entire chat histories — use pagination
  - Do NOT use Prisma — use Drizzle only
  - Do NOT create database migration files manually — use Drizzle Kit push

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Data layer is foundational — every other task depends on these queries being correct
  - **Skills**: `[]`
    - No special skills needed — backend data layer
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Task 2)
  - **Blocks**: Tasks 4, 5, 7, 8
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - wacli DB schema (source of truth): `internal/store/store.go` from https://github.com/steipete/wacli — see `ensureSchema()` method for exact CREATE TABLE statements. Tables: chats, contacts, groups, group_participants, messages, messages_fts, contact_aliases, contact_tags.
  - wacli query patterns: `ListMessages()`, `SearchMessages()`, `ListChats()` functions in same file show the correct JOIN and WHERE patterns (e.g., `LEFT JOIN chats c ON c.jid = m.chat_jid`, `ORDER BY m.ts DESC`)

  **API/Type References**:
  - wacli message columns: `rowid INTEGER PRIMARY KEY AUTOINCREMENT, chat_jid TEXT NOT NULL, chat_name TEXT, msg_id TEXT NOT NULL, sender_jid TEXT, sender_name TEXT, ts INTEGER NOT NULL, from_me INTEGER NOT NULL, text TEXT, display_text TEXT, media_type TEXT, media_caption TEXT, filename TEXT, mime_type TEXT, direct_path TEXT, media_key BLOB, file_sha256 BLOB, file_enc_sha256 BLOB, file_length INTEGER, local_path TEXT, downloaded_at INTEGER, UNIQUE(chat_jid, msg_id)`
  - wacli chat columns: `jid TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT, last_message_ts INTEGER`
  - wacli contact columns: `jid TEXT PRIMARY KEY, phone TEXT, push_name TEXT, full_name TEXT, first_name TEXT, business_name TEXT, updated_at INTEGER`
  - wacli FTS: `messages_fts USING fts5(text, media_caption, filename, chat_name, sender_name, display_text)`

  **External References**:
  - better-sqlite3 readonly mode: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md — `new Database(path, { readonly: true })`
  - Drizzle ORM better-sqlite3: https://orm.drizzle.team/docs/get-started/sqlite-new — `drizzle(sqlite)` pattern
  - Drizzle schema definition: https://orm.drizzle.team/docs/sql-schema-declaration

  **WHY Each Reference Matters**:
  - wacli store.go: The ONLY source of truth for table schemas and query patterns. Must match exactly.
  - better-sqlite3 docs: Need readonly mode and WAL pragma details
  - Drizzle docs: Need schema definition syntax for app.db tables

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: wacli.db reader connects and queries chats
    Tool: Bash (node script)
    Preconditions: wacli.db exists at configured path
    Steps:
      1. Create a small test script that imports getWacliDb and calls listChats()
      2. Run: npx tsx test-db.ts
      3. Assert: output contains array of chat objects
      4. Assert: each chat has jid, kind, name fields
      5. Clean up test script
    Expected Result: Readonly connection works, returns chat data
    Evidence: Query output captured

  Scenario: App database initializes with correct schema
    Tool: Bash
    Preconditions: App started
    Steps:
      1. Run: sqlite3 /path/to/app.db ".tables"
      2. Assert: output contains settings, style_profiles, auto_response_config, auto_response_log, approval_queue, message_proposals_cache
    Expected Result: All app.db tables created
    Evidence: Table list captured

  Scenario: Display name resolution follows priority order
    Tool: Bash (node script)
    Preconditions: None
    Steps:
      1. Create test script that calls resolveDisplayName with various inputs
      2. Test: { alias: "Bob", push_name: "Robert" } → returns "Bob"
      3. Test: { alias: "", push_name: "Robert" } → returns "Robert"
      4. Test: { alias: "", push_name: "", full_name: "Robert Smith" } → returns "Robert Smith"
      5. Test: { jid: "1234567890@s.whatsapp.net" } → returns "1234567890"
    Expected Result: Name resolution follows alias > push_name > full_name > business_name > phone > JID
    Evidence: Test output captured

  Scenario: Chat list API returns data
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. curl -s http://localhost:3000/api/chats -b cookies.txt | jq '.[0]'
      2. Assert: response is array
      3. Assert: first item has jid, kind, name, lastMessageTs, displayName
    Expected Result: Chat API returns enriched chat data
    Evidence: Response body captured

  Scenario: Messages API returns paginated messages
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated, known chat JID
    Steps:
      1. CHAT_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '.[0].jid')
      2. curl -s "http://localhost:3000/api/messages?chatJid=$CHAT_JID&limit=10" -b cookies.txt | jq 'length'
      3. Assert: response length <= 10
      4. Assert: each message has chatJid, text, ts, fromMe, senderName fields
    Expected Result: Paginated messages returned
    Evidence: Response body captured

  Scenario: Search messages via FTS
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. curl -s "http://localhost:3000/api/messages/search?q=hello&limit=5" -b cookies.txt | jq 'length'
      2. Assert: response is array (may be empty if "hello" not in DB)
      3. Assert: if results exist, each has snippet field
    Expected Result: FTS search works
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(db): add wacli.db reader layer and app.db schema with Drizzle`
  - Files: `lib/db/`, `lib/utils/`, `src/types/`
  - Pre-commit: `npm run build`

---

- [x] 4. Chat List + Message Display UI

  **What to do**:
  - Create the hybrid sidebar layout in `app/(app)/layout.tsx`:
    - Left panel (280px fixed): Chat list sidebar
    - Center panel (flex-1): Conversation/message area
    - Right panel (320px, collapsible): Analytics/AI panel
    - Use CSS Grid or Flexbox for the three-column layout
    - Full height viewport layout (h-screen)
  - Create `components/layout/app-shell.tsx`:
    - Header bar with app name, search input, settings gear icon, logout button
    - Three-panel layout container
  - Create `components/chat/chat-list.tsx`:
    - Scrollable list of chats from `/api/chats` endpoint
    - Each item shows: avatar placeholder (first letter), display name, last message preview (truncated), relative time, unread indicator (based on last_message_ts freshness)
    - Search/filter input at top
    - Sorted by last message time (most recent first)
    - Active chat highlighted
    - Groups show group icon, DMs show person icon
  - Create `components/chat/message-list.tsx`:
    - Scrollable message list for selected chat
    - Messages grouped by date
    - Own messages on right (bubble style), others on left
    - Each message shows: sender name (if group), message text, timestamp
    - Media messages show placeholder: `[Image]`, `[Video]`, `[Audio]`, `[Document: filename]`
    - Auto-scroll to bottom on chat selection
    - Load older messages on scroll-to-top (infinite scroll/pagination)
    - Empty state when no chat selected: "Select a conversation"
  - Create `components/chat/message-input.tsx`:
    - Text input area with send button
    - "Suggest replies" button (triggers AI proposals — wired in Task 8)
    - Send button posts to `/api/messages/send`
    - Enter to send, Shift+Enter for newline
    - Disabled state with message when sending is in progress
  - Create `components/layout/right-panel.tsx`:
    - Placeholder panel that will contain analytics and AI suggestions
    - Shows chat info header (name, type, participant count for groups)
    - Tabs: "Analytics" | "AI Suggestions"
    - Content areas as skeleton/placeholder for Tasks 7 and 8
  - Create API routes for this task:
    - `app/api/chats/route.ts` — GET: returns chat list with display names
    - `app/api/messages/route.ts` — GET: returns messages for a chat (query params: chatJid, limit, before)
    - `app/api/messages/search/route.ts` — GET: searches messages via FTS5
  - Implement polling hook `hooks/use-polling.ts`:
    - `usePolling(url, interval)`: fetches URL every N ms, returns data + loading + error
    - Default interval: 10000ms (10 seconds)
    - Smart polling: only re-renders if data actually changed (compare last_message_ts)
  - Wire polling into chat list: auto-refresh every 10 seconds

  **Must NOT do**:
  - Do NOT render media files (images, videos, audio) — placeholders only
  - Do NOT build a custom scroll virtualization — use simple pagination
  - Do NOT add mobile responsive breakpoints
  - Do NOT build notification/sound alerts
  - Do NOT implement real-time typing indicators

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is the core UI task — layout, components, visual polish
  - **Skills**: `["frontend-ui-ux"]`
    - `frontend-ui-ux`: Needed for crafting the hybrid sidebar layout and message bubble styling
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed during implementation, only for QA

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `lib/db/wacli.ts:listChats()` — query function for chat list data (created in Task 3)
  - `lib/db/wacli.ts:listMessages()` — query function for message data (created in Task 3)
  - `lib/utils/names.ts:resolveDisplayName()` — name resolution utility (created in Task 3)
  - `lib/utils/dates.ts:formatRelative()` — relative time formatting (created in Task 3)

  **API/Type References**:
  - `src/types/index.ts:Chat` — chat type with jid, kind, name, lastMessageTs, displayName
  - `src/types/index.ts:Message` — message type with chatJid, msgId, senderJid, senderName, ts, fromMe, text, displayText, mediaType

  **External References**:
  - shadcn/ui ScrollArea: https://ui.shadcn.com/docs/components/scroll-area
  - shadcn/ui Skeleton: https://ui.shadcn.com/docs/components/skeleton — for loading states
  - shadcn/ui Tabs: https://ui.shadcn.com/docs/components/tabs — for right panel
  - WhatsApp Web UI reference: Use as visual reference for message bubbles and chat list layout

  **WHY Each Reference Matters**:
  - Task 3 functions: All data comes from these — must match their return types exactly
  - shadcn components: Use these instead of building custom — saves time and ensures consistency
  - WhatsApp Web: The mental model for how users expect chat apps to look

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Chat list displays and allows selection
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, authenticated, wacli.db has data
    Steps:
      1. Navigate to: http://localhost:3000/login
      2. Fill: input[type="password"] → test password
      3. Click: button[type="submit"]
      4. Wait for: navigation to / (timeout: 10s)
      5. Wait for: [data-testid="chat-list"] visible (timeout: 10s)
      6. Assert: chat list contains at least 1 chat item
      7. Assert: first chat item has name text and time text
      8. Click: first chat item
      9. Wait for: [data-testid="message-list"] visible (timeout: 5s)
      10. Assert: message list contains at least 1 message
      11. Screenshot: .sisyphus/evidence/task-4-chat-selected.png
    Expected Result: Chat list loads, selection shows messages
    Evidence: .sisyphus/evidence/task-4-chat-selected.png

  Scenario: Three-panel layout renders correctly
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, on main page
    Steps:
      1. Navigate to: http://localhost:3000/
      2. Wait for page load
      3. Assert: [data-testid="chat-list-panel"] is visible with width ~280px
      4. Assert: [data-testid="conversation-panel"] is visible
      5. Assert: [data-testid="right-panel"] is visible with width ~320px
      6. Screenshot: .sisyphus/evidence/task-4-layout.png
    Expected Result: Three-panel hybrid layout visible
    Evidence: .sisyphus/evidence/task-4-layout.png

  Scenario: Messages show correct bubble alignment
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, chat selected with both sent and received messages
    Steps:
      1. Select a chat with messages
      2. Wait for messages to load
      3. Find a message with fromMe=true → Assert: aligned to right
      4. Find a message with fromMe=false → Assert: aligned to left
      5. Assert: sender name visible on received messages
      6. Assert: timestamp visible on all messages
      7. Screenshot: .sisyphus/evidence/task-4-messages.png
    Expected Result: Message bubbles correctly aligned
    Evidence: .sisyphus/evidence/task-4-messages.png

  Scenario: Chat search filters results
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, chat list loaded
    Steps:
      1. Find search input in chat list panel
      2. Type a known contact name
      3. Wait 500ms for filter
      4. Assert: chat list filtered to matching results
      5. Clear search
      6. Assert: full chat list restored
    Expected Result: Search filters chat list
    Evidence: Screenshots captured

  Scenario: Empty state shows when no chat selected
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, no chat selected
    Steps:
      1. Navigate to: http://localhost:3000/
      2. Assert: center panel shows "Select a conversation" message
      3. Screenshot: .sisyphus/evidence/task-4-empty-state.png
    Expected Result: Empty state message visible
    Evidence: .sisyphus/evidence/task-4-empty-state.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add hybrid sidebar layout with chat list and message display`
  - Files: `components/chat/`, `components/layout/`, `app/(app)/`, `app/api/chats/`, `app/api/messages/`, `hooks/`
  - Pre-commit: `npm run build`

---

- [x] 5. Message Sending via wacli CLI

  **What to do**:
  - Create `lib/utils/wacli.ts` — wacli CLI execution helper:
    - `sendMessage(to: string, message: string)`: executes wacli send with sync management
    - Uses `child_process.execFile()` (NEVER `exec()`) with explicit argument arrays
    - JID format validation: must match `^\d+@s\.whatsapp\.net$` (DM) or `^\d+@g\.us$` (group)
    - Implementation pattern for sync lock management:
      1. Execute `supervisorctl stop wacli-sync` to stop sync process
      2. Wait 1 second for lock release
      3. Execute `wacli send text --to JID --message TEXT --json` via `execFile`
      4. Parse JSON response: `{ "sent": true, "to": "JID", "id": "MSG_ID" }`
      5. Execute `supervisorctl start wacli-sync` to restart sync
      6. Return send result or throw error
    - Timeout: 30 seconds for send operation
    - Error handling: always restart sync even if send fails (finally block)
    - `getWacliStatus()`: checks if wacli-sync is running via supervisorctl status
  - Create `app/api/messages/send/route.ts`:
    - POST handler: accepts `{ to: string, message: string }`
    - Validates input with Zod (JID format, non-empty message, max 4096 chars)
    - Calls `sendMessage()` from wacli utility
    - Returns `{ success: true, messageId: string }` or error
    - Rate limiting: max 30 sends per minute (prevent abuse)
  - Create `app/api/health/route.ts`:
    - GET handler: returns health status including wacli sync status
    - Checks wacli.db accessibility (can open readonly)
    - Checks last message timestamp freshness (stale if >5 minutes)
    - Returns `{ status: "ok"|"degraded"|"error", wacliSync: "running"|"stopped", lastMessageAge: seconds, dbAccessible: boolean }`
  - Update `components/chat/message-input.tsx` (created in Task 4):
    - Wire send button to POST `/api/messages/send`
    - Show loading state while sending (sync stops, sends, restarts)
    - Show success toast after send
    - Show error toast if send fails
    - After successful send, refresh message list to show sent message
  - For development without Docker/supervisord:
    - Add fallback: if supervisorctl is not available, try direct `wacli send` (assumes sync is not running)
    - Log warning when using fallback mode

  **Must NOT do**:
  - Do NOT use `child_process.exec()` — shell injection risk
  - Do NOT send to unvalidated JIDs
  - Do NOT allow sending empty messages
  - Do NOT build file/media sending — text only in v1
  - Do NOT leave sync stopped if send fails — always restart in finally block

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Critical infrastructure — CLI integration with process management, security-sensitive (input sanitization)
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Minor UI changes only (wiring send button)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 9
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - wacli send command source: `cmd/wacli/send.go` — shows `sendTextCmd` acquires lock (`needLock=true`), connects to WhatsApp, calls `SendText`, then upserts message to DB. Confirms lock conflict with sync.
  - wacli lock mechanism: `internal/lock/lock.go` — uses `syscall.Flock` with `LOCK_EX|LOCK_NB` (exclusive, non-blocking). Send WILL fail if sync holds lock.
  - wacli JSON output: All commands support `--json` flag. Send response: `{"sent":true,"to":"JID","id":"MSG_ID"}`

  **External References**:
  - Node.js `execFile`: https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback — use with explicit arg arrays for security
  - supervisorctl: http://supervisord.org/running.html#supervisorctl-actions — `stop`, `start`, `status` commands

  **WHY Each Reference Matters**:
  - wacli send.go: Confirms the lock conflict and the exact CLI interface and response format
  - wacli lock.go: Understanding the flock mechanism helps design the stop/start pattern
  - execFile docs: Must use this (not exec) to prevent shell injection when passing user message text

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Send API validates input
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/messages/send \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d '{"to":"invalid","message":"test"}'
      2. Assert: HTTP status is 400
      3. Assert: response contains validation error about JID format
    Expected Result: Invalid JID rejected
    Evidence: Response body captured

  Scenario: Send API rejects empty message
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/messages/send \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d '{"to":"1234567890@s.whatsapp.net","message":""}'
      2. Assert: HTTP status is 400
    Expected Result: Empty message rejected
    Evidence: Response body captured

  Scenario: Health endpoint returns status
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. curl -s http://localhost:3000/api/health -b cookies.txt | jq '.'
      2. Assert: response has status field
      3. Assert: response has dbAccessible field
      4. Assert: response has lastMessageAge field (number)
    Expected Result: Health check returns system status
    Evidence: Response body captured

  Scenario: Send message via UI (integration)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, authenticated, in Docker with supervisord
    Steps:
      1. Navigate and log in
      2. Select first chat
      3. Wait for message input visible
      4. Type: "Test message from integration test"
      5. Click send button
      6. Wait for: toast/notification visible (timeout: 30s)
      7. Assert: success message shown
      8. Assert: sent message appears in message list
      9. Screenshot: .sisyphus/evidence/task-5-send-message.png
    Expected Result: Message sent and appears in list
    Evidence: .sisyphus/evidence/task-5-send-message.png
  ```

  **Commit**: YES
  - Message: `feat(send): add message sending via wacli CLI with sync lock management`
  - Files: `lib/utils/wacli.ts`, `app/api/messages/send/`, `app/api/health/`
  - Pre-commit: `npm run build`

---

- [x] 6. OpenRouter AI Integration Layer

  **What to do**:
  - Create `lib/ai/openrouter.ts` — OpenRouter client singleton:
    - Initialize `@openrouter/sdk` with `OPENROUTER_API_KEY` from env
    - Set headers: `HTTP-Referer` and `X-Title` for OpenRouter rankings
    - Export `getAIClient()` lazy singleton
  - Create `lib/ai/models.ts` — model selection configuration:
    - Define model tiers as constants:
      ```typescript
      export const MODELS = {
        CHEAP: 'deepseek/deepseek-v3.2',      // Classification, simple tasks ($0.25/M)
        STANDARD: 'openai/gpt-5.2',            // Message generation ($1.25/M)
        PREMIUM: 'anthropic/claude-sonnet-4.5', // Deep analysis ($3/M)
      } as const;
      ```
    - Define task-to-model mapping:
      - Style analysis: PREMIUM (needs nuanced understanding)
      - Message proposals: STANDARD (creative generation)
      - Timing/frequency insights: CHEAP (structured data extraction)
      - Dropout analysis: CHEAP (pattern recognition)
      - Next message reasoning: STANDARD (context-aware generation)
  - Create `lib/ai/prompts.ts` — all AI prompt templates in ONE file:
    - `STYLE_ANALYSIS_PROMPT(messages, contactName)` — analyzes conversation style
      - Input: last 100 messages from chat
      - Output: JSON with { formality (1-10), avgMessageLength, emojiFrequency, vocabularyLevel, responseTimePattern, topicPreferences[], toneDescription, communicationStyle }
    - `MESSAGE_PROPOSALS_PROMPT(recentMessages, styleProfile, contactName)` — generates 3 message proposals
      - Input: last 20 messages + style profile
      - Output: JSON array of 3 objects { text, tone ('casual'|'formal'|'context-matched'), reasoning }
    - `TIMING_ANALYSIS_PROMPT(hourlyData, frequencyData)` — interprets timing patterns
      - Input: pre-computed hourly distribution and frequency data from SQL
      - Output: JSON with { bestHours: number[], bestDays: string[], insight: string }
    - `DROPOUT_ANALYSIS_PROMPT(participantActivity, chatName)` — analyzes conversation dropouts
      - Input: per-participant message counts over time
      - Output: JSON with { dropouts: [{ name, lastActive, dropoffDate, wasActive }], insight }
    - `AUTO_RESPONSE_PROMPT(incomingMessage, recentContext, styleProfile, rules)` — generates auto-response
      - Input: new message + last 10 messages + style profile + user rules
      - Output: JSON with { response: string, confidence: number (0-1), reasoning: string }
    - All prompts request JSON output explicitly
    - All prompts include instruction to not reveal they are AI-generated
  - Create `lib/ai/client.ts` — high-level AI functions:
    - `analyzeStyle(chatJid: string)` — computes and caches style profile
      - Fetches recent messages from wacli.db
      - Calls OpenRouter with PREMIUM model
      - Parses JSON response
      - Caches result in app.db `style_profiles` table (expires after 24 hours)
    - `generateProposals(chatJid: string)` — generates 3 message proposals
      - Fetches recent messages + cached style profile
      - Calls OpenRouter with STANDARD model
      - Returns 3 proposals
      - Caches briefly in app.db (expires after 5 minutes)
    - `analyzeTimingPatterns(chatJid: string)` — interprets pre-computed timing data
      - Fetches hourly/frequency data from SQL queries
      - Calls OpenRouter with CHEAP model for interpretation
      - Returns insight text + best times
    - `analyzeDropouts(chatJid: string)` — detects conversation dropouts
      - Fetches participant activity from SQL
      - Calls OpenRouter with CHEAP model
      - Returns dropout list + insights
    - `generateAutoResponse(chatJid: string, incomingMessage: string)` — creates auto-response
      - Fetches context + style + rules
      - Calls OpenRouter with STANDARD model
      - Returns response + confidence score
    - All functions: handle OpenRouter errors gracefully (return null, not throw)
    - All functions: respect cache — check app.db before calling AI

  **Must NOT do**:
  - Do NOT use LangChain, LlamaIndex, or any AI framework
  - Do NOT import entire chat histories into prompts — window to last N messages
  - Do NOT create a prompt templating system — plain template literals
  - Do NOT store API keys in database — env only
  - Do NOT make AI calls on every page load — cache aggressively

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: AI integration requires careful prompt engineering and error handling
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Can start after Task 1, runs parallel with Tasks 3-5
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `lib/db/wacli.ts:getRecentMessages()` — fetches last N messages for AI context (created in Task 3)
  - `lib/db/wacli.ts:getMessagesByHour()` — hourly distribution data (created in Task 3)
  - `lib/db/wacli.ts:getParticipantActivity()` — participant activity data (created in Task 3)
  - `lib/db/schema.ts:style_profiles` — Drizzle schema for caching style profiles (created in Task 3)
  - `lib/db/schema.ts:message_proposals_cache` — Drizzle schema for caching proposals (created in Task 3)

  **External References**:
  - OpenRouter SDK: https://www.npmjs.com/package/@openrouter/sdk — `chat.send()` with model parameter
  - OpenRouter models: https://openrouter.ai/models — current model list and pricing
  - OpenRouter streaming: https://openrouter.ai/docs/api/reference/streaming — `stream: true` parameter

  **WHY Each Reference Matters**:
  - Task 3 DB functions: AI prompts consume data from these functions — must match their output shapes
  - Task 3 schema: AI results are cached here — must match schema exactly
  - OpenRouter SDK: Need correct `chat.send()` patterns for each model tier

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Style analysis returns valid profile
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated, OPENROUTER_API_KEY set
    Steps:
      1. CHAT_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '.[0].jid')
      2. curl -s "http://localhost:3000/api/analytics/style?chatJid=$CHAT_JID" -b cookies.txt | jq '.'
      3. Assert: response has formality (number 1-10)
      4. Assert: response has toneDescription (string)
      5. Assert: response has communicationStyle (string)
    Expected Result: Style profile computed and returned
    Evidence: Response body captured

  Scenario: Style profile is cached
    Tool: Bash (curl)
    Preconditions: Style analysis already called once for a chat
    Steps:
      1. Time first request: time curl -s "http://localhost:3000/api/analytics/style?chatJid=$CHAT_JID" -b cookies.txt > /dev/null
      2. Time second request: time curl -s "http://localhost:3000/api/analytics/style?chatJid=$CHAT_JID" -b cookies.txt > /dev/null
      3. Assert: second request significantly faster (cached, no AI call)
    Expected Result: Cached response served instantly
    Evidence: Timing comparison captured

  Scenario: AI gracefully handles missing API key
    Tool: Bash (curl)
    Preconditions: Dev server running, OPENROUTER_API_KEY unset or invalid
    Steps:
      1. curl -s "http://localhost:3000/api/analytics/style?chatJid=test@s.whatsapp.net" -b cookies.txt | jq '.'
      2. Assert: response indicates AI unavailable (not a 500 crash)
      3. Assert: HTTP status is 503 or response has { error: "AI service unavailable" }
    Expected Result: Graceful degradation, no crash
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add OpenRouter integration with model tiering and prompt templates`
  - Files: `lib/ai/`
  - Pre-commit: `npm run build`

---

- [x] 7. Analytics Engine + Visualizations

  **What to do**:
  - Create `app/api/analytics/style/route.ts` — GET: style profile for a chat
    - Query param: `chatJid`
    - Calls `analyzeStyle()` from AI client (cached)
    - Returns StyleProfile JSON
  - Create `app/api/analytics/timing/route.ts` — GET: timing analysis
    - Query param: `chatJid`
    - Fetches hourly distribution from SQL, passes to AI for interpretation
    - Returns `{ hourlyData: number[], bestHours: number[], bestDays: string[], insight: string }`
  - Create `app/api/analytics/frequency/route.ts` — GET: message frequency
    - Query params: `chatJid`, `interval` (day/week/month)
    - Fetches frequency data from SQL
    - Returns `{ data: { date: string, count: number, fromMe: number, fromThem: number }[], insight: string }`
  - Create `app/api/analytics/dropout/route.ts` — GET: dropout detection
    - Query param: `chatJid`
    - Analyzes participant activity patterns
    - Returns `{ participants: [{ name, totalMessages, lastActive, isActive, dropoffDate? }], insight: string }`
  - Create `app/api/analytics/overview/route.ts` — GET: chat overview stats
    - Query param: `chatJid`
    - Returns `{ totalMessages, firstMessage, lastMessage, avgMessagesPerDay, myPercentage, longestStreak, avgResponseTime }`
    - Pure SQL computation — no AI needed
  - Create `components/analytics/style-profile.tsx`:
    - Card showing style analysis results
    - Formality gauge (1-10 scale visual)
    - Communication style description
    - Emoji frequency indicator
    - Vocabulary level badge
    - Loading skeleton while computing
  - Create `components/analytics/timing-chart.tsx`:
    - Recharts bar chart showing message count by hour of day (0-23)
    - Highlighted "best hours" bars in accent color
    - Below chart: AI insight text about best times
    - Tooltip showing exact counts
  - Create `components/analytics/frequency-chart.tsx`:
    - Recharts area chart showing message frequency over time
    - Two-tone: your messages vs their messages stacked
    - Date range selector: last week / month / 3 months / year
    - Below chart: frequency insight text
  - Create `components/analytics/dropout-list.tsx`:
    - List of participants with activity status
    - Color coding: green (active), yellow (declining), red (inactive)
    - Last active date for each
    - AI insight about dropout patterns
  - Create `components/analytics/overview-stats.tsx`:
    - Grid of stat cards: total messages, days active, avg/day, response time
    - Clean numeric display with labels
  - Wire all analytics components into `components/layout/right-panel.tsx`:
    - "Analytics" tab in right panel
    - Shows overview stats at top
    - Style profile card
    - Timing chart
    - Frequency chart
    - Dropout list (for groups)
    - All components handle loading and empty states

  **Must NOT do**:
  - Do NOT build sentiment analysis
  - Do NOT build relationship scoring
  - Do NOT build multi-language detection
  - Do NOT use D3 directly — use Recharts only
  - Do NOT compute analytics on every page load — cache and show cached data

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Heavy chart/visualization work with Recharts + UI component design
  - **Skills**: `["frontend-ui-ux"]`
    - `frontend-ui-ux`: Needed for chart styling, data visualization design, and analytics layout
  - **Skills Evaluated but Omitted**:
    - `playwright`: Only for QA, not implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 4, 6

  **References**:

  **Pattern References**:
  - `lib/ai/client.ts:analyzeStyle()` — AI function for style profiles (created in Task 6)
  - `lib/ai/client.ts:analyzeTimingPatterns()` — AI function for timing analysis (created in Task 6)
  - `lib/ai/client.ts:analyzeDropouts()` — AI function for dropout detection (created in Task 6)
  - `lib/db/wacli.ts:getMessagesByHour()` — SQL query for hourly data (created in Task 3)
  - `lib/db/wacli.ts:getMessageFrequency()` — SQL query for frequency data (created in Task 3)
  - `lib/db/wacli.ts:getParticipantActivity()` — SQL query for participant data (created in Task 3)
  - `lib/db/wacli.ts:getChatStats()` — SQL query for overview stats (created in Task 3)
  - `components/layout/right-panel.tsx` — placeholder panel to fill (created in Task 4)

  **External References**:
  - Recharts bar chart: https://recharts.org/en-US/api/BarChart
  - Recharts area chart: https://recharts.org/en-US/api/AreaChart
  - Recharts tooltip: https://recharts.org/en-US/api/Tooltip
  - shadcn/ui Card: https://ui.shadcn.com/docs/components/card — for stat cards

  **WHY Each Reference Matters**:
  - Task 6 AI functions: Analytics components call these — must match their return types
  - Task 3 SQL functions: Raw data comes from these for charts
  - Recharts API: Must follow Recharts component patterns for charts
  - Task 4 right panel: Analytics components render inside this container

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Analytics panel shows data for selected chat
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, chat selected
    Steps:
      1. Log in and select a chat
      2. Wait for right panel to load
      3. Click "Analytics" tab
      4. Wait for: [data-testid="overview-stats"] visible (timeout: 30s)
      5. Assert: overview stats show total messages (number > 0)
      6. Assert: timing chart is rendered (SVG element present in [data-testid="timing-chart"])
      7. Assert: frequency chart is rendered
      8. Screenshot: .sisyphus/evidence/task-7-analytics.png
    Expected Result: Analytics panel shows stats, charts, and insights
    Evidence: .sisyphus/evidence/task-7-analytics.png

  Scenario: Style profile displays for a chat
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, chat selected, OpenRouter key valid
    Steps:
      1. Select a chat
      2. Click "Analytics" tab
      3. Wait for: [data-testid="style-profile"] visible (timeout: 60s)
      4. Assert: formality gauge visible
      5. Assert: communication style text present
      6. Screenshot: .sisyphus/evidence/task-7-style-profile.png
    Expected Result: Style profile card renders with AI analysis
    Evidence: .sisyphus/evidence/task-7-style-profile.png

  Scenario: Analytics API returns timing data
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. CHAT_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '.[0].jid')
      2. curl -s "http://localhost:3000/api/analytics/timing?chatJid=$CHAT_JID" -b cookies.txt | jq '.'
      3. Assert: response has hourlyData (array of 24 numbers)
      4. Assert: response has bestHours (array of numbers)
    Expected Result: Timing analysis computed
    Evidence: Response body captured

  Scenario: Frequency chart changes with interval selector
    Tool: Playwright (playwright skill)
    Preconditions: Analytics panel open for a chat
    Steps:
      1. Select "week" interval
      2. Wait for chart update
      3. Assert: chart x-axis shows weekly dates
      4. Select "month" interval
      5. Wait for chart update
      6. Assert: chart x-axis shows monthly dates
    Expected Result: Chart updates on interval change
    Evidence: Screenshots captured
  ```

  **Commit**: YES
  - Message: `feat(analytics): add conversation analytics engine with charts and AI insights`
  - Files: `app/api/analytics/`, `components/analytics/`
  - Pre-commit: `npm run build`

---

- [x] 8. Message Proposals + AI Suggestions UI

  **What to do**:
  - Create `app/api/ai/proposals/route.ts` — POST: generate message proposals
    - Body: `{ chatJid: string }`
    - Calls `generateProposals()` from AI client
    - Returns array of 3 proposals: `[{ text, tone, reasoning }]`
    - Streaming support: set `stream: true` for progressive loading
  - Create `components/ai/proposal-cards.tsx`:
    - Renders 3 proposal cards in the AI Suggestions tab
    - Each card shows: message text, tone badge (casual/formal/context-matched), reasoning text (collapsible)
    - "Use this" button on each card → fills message input with proposal text
    - "Regenerate" button → fetches new proposals
    - Loading skeleton while generating
    - Error state if AI unavailable
  - Create `components/ai/suggestion-panel.tsx`:
    - Container for the "AI Suggestions" tab in right panel
    - Shows: "Generate suggestions" button when no proposals loaded
    - After generation: shows 3 proposal cards
    - Below proposals: "Why these suggestions?" collapsible with reasoning
  - Wire into right panel:
    - "AI Suggestions" tab shows suggestion-panel component
    - "Suggest replies" button in message input triggers proposal generation
    - Clicking "Use this" on a proposal fills the message input in center panel
  - Wire communication between panels:
    - Use React context or URL state to pass selected proposal text from right panel to message input in center panel
    - When user selects a different chat, clear proposals

  **Must NOT do**:
  - Do NOT auto-generate proposals on chat selection (user-triggered only)
  - Do NOT build learning from user picks
  - Do NOT auto-select a proposal
  - Do NOT generate proposals for empty chats (no message history)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI-heavy task — proposal cards, interaction between panels
  - **Skills**: `["frontend-ui-ux"]`
    - `frontend-ui-ux`: Needed for card design and cross-panel interaction UX
  - **Skills Evaluated but Omitted**:
    - `playwright`: Only for QA

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 4, 6

  **References**:

  **Pattern References**:
  - `lib/ai/client.ts:generateProposals()` — AI function that generates 3 proposals (created in Task 6)
  - `lib/ai/prompts.ts:MESSAGE_PROPOSALS_PROMPT` — prompt template (created in Task 6)
  - `components/chat/message-input.tsx` — message input component to wire "Suggest replies" button and fill with selected proposal (created in Task 4)
  - `components/layout/right-panel.tsx` — right panel container with "AI Suggestions" tab (created in Task 4)

  **External References**:
  - shadcn/ui Card: https://ui.shadcn.com/docs/components/card — for proposal cards
  - shadcn/ui Badge: https://ui.shadcn.com/docs/components/badge — for tone labels
  - shadcn/ui Skeleton: https://ui.shadcn.com/docs/components/skeleton — for loading state

  **WHY Each Reference Matters**:
  - Task 6 AI client: Proposals come from this function — must match return type
  - Task 4 components: Must integrate with existing message input and right panel

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Generate proposals via UI
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, chat selected, OpenRouter key valid
    Steps:
      1. Select a chat with message history
      2. Click "AI Suggestions" tab in right panel
      3. Click "Generate suggestions" button
      4. Wait for: [data-testid="proposal-card"] visible (timeout: 60s)
      5. Assert: exactly 3 proposal cards visible
      6. Assert: each card has text content and tone badge
      7. Screenshot: .sisyphus/evidence/task-8-proposals.png
    Expected Result: 3 proposal cards rendered
    Evidence: .sisyphus/evidence/task-8-proposals.png

  Scenario: Select proposal fills message input
    Tool: Playwright (playwright skill)
    Preconditions: Proposals generated
    Steps:
      1. Note text of first proposal card
      2. Click "Use this" button on first proposal
      3. Assert: message input textarea contains the proposal text
      4. Screenshot: .sisyphus/evidence/task-8-use-proposal.png
    Expected Result: Proposal text copied to input
    Evidence: .sisyphus/evidence/task-8-use-proposal.png

  Scenario: Proposals API returns 3 proposals
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated, OpenRouter key valid
    Steps:
      1. CHAT_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '.[0].jid')
      2. curl -s -X POST http://localhost:3000/api/ai/proposals \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d "{\"chatJid\":\"$CHAT_JID\"}" | jq 'length'
      3. Assert: response length is 3
      4. Assert: each proposal has text (string), tone (string), reasoning (string)
    Expected Result: 3 proposals returned
    Evidence: Response body captured

  Scenario: Regenerate creates new proposals
    Tool: Playwright (playwright skill)
    Preconditions: Proposals already generated
    Steps:
      1. Note text of current proposals
      2. Click "Regenerate" button
      3. Wait for proposals to update (timeout: 60s)
      4. Assert: at least one proposal text has changed
    Expected Result: New proposals generated
    Evidence: Screenshots captured
  ```

  **Commit**: YES
  - Message: `feat(ai): add message proposal generation with 3-option suggestion UI`
  - Files: `app/api/ai/`, `components/ai/`
  - Pre-commit: `npm run build`

---

- [x] 9. Auto-Response System

  **What to do**:
  - Create `app/api/settings/auto-response/route.ts`:
    - GET: returns auto-response config for all chats (list from app.db)
    - POST: enable/disable auto-response for a chat
      - Body: `{ chatJid, enabled, maxPerHour?, rules? }`
      - Validates: not a group JID (groups excluded in v1)
      - Creates/updates `auto_response_config` in app.db
  - Create `app/api/settings/auto-response/[chatJid]/route.ts`:
    - GET: returns config for specific chat
    - PATCH: update config (maxPerHour, rules)
    - DELETE: remove auto-response config for chat
  - Create `app/api/auto-response/queue/route.ts`:
    - GET: returns pending approval queue items
    - POST: approve or reject a queue item
      - Body: `{ id, action: 'approve' | 'reject', editedText? }`
      - If approved: sends the message via wacli and logs it
      - If rejected: marks as rejected in DB
  - Create `lib/auto-response/engine.ts` — auto-response processing engine:
    - `processNewMessage(chatJid: string, message: Message)`:
      1. Check global kill switch in settings
      2. Check if chat has auto-response enabled
      3. Check rate limit (count sent in last hour from `auto_response_log`)
      4. Check approval count (how many have been auto-sent for this chat)
      5. If approved_count < 3: add to approval queue instead of auto-sending
      6. If approved_count >= 3: generate auto-response via AI
      7. If AI confidence > 0.7: send via wacli, log in `auto_response_log`
      8. If AI confidence <= 0.7: add to approval queue
    - `checkRateLimit(chatJid: string)`: returns true if under 5/hr limit
    - `getApprovalCount(chatJid: string)`: returns number of approved+auto-sent messages
  - Create `lib/auto-response/poller.ts` — background message poller:
    - Runs on server-side via `setInterval` in a Next.js route or server action
    - Every 10 seconds: query wacli.db for new messages since last check
    - For each new message where `from_me = 0`:
      - Check if sender's chat has auto-response enabled
      - If yes: pass to `processNewMessage()`
    - Track `lastCheckedTs` in app.db settings to avoid reprocessing
    - Start poller when first authenticated request hits the server
  - Create `components/auto-response/config-panel.tsx`:
    - List of chats with auto-response toggle switches
    - Per-chat: enabled/disabled toggle, max replies/hour slider, custom rules textarea
    - Global kill switch at top (prominent red button when active)
    - Status indicator: "Active for N chats"
  - Create `components/auto-response/approval-queue.tsx`:
    - List of pending approval items
    - Each item shows: incoming message, proposed response, confidence score
    - Buttons: "Approve & Send", "Edit & Send", "Reject"
    - Edit mode: allows modifying the proposed text before sending
    - Badge on sidebar/header showing pending count
  - Add approval queue badge to app header/nav:
    - Poll `/api/auto-response/queue` for pending items
    - Show badge with count if > 0
    - Click opens approval queue dialog/panel

  **Must NOT do**:
  - Do NOT enable auto-response for group chats — DMs only
  - Do NOT auto-respond without rate limit check
  - Do NOT skip the approval queue for first 3 messages per chat
  - Do NOT send if AI confidence is ≤ 0.7 (queue for approval instead)
  - Do NOT run auto-response if global kill switch is on
  - Do NOT build scheduled messages
  - Do NOT build smart routing or priority queuing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex business logic — rate limiting, approval queues, background processing, safety controls
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI components are functional, not design-heavy

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Tasks 5, 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 5, 7, 8

  **References**:

  **Pattern References**:
  - `lib/utils/wacli.ts:sendMessage()` — wacli CLI sending with sync lock management (created in Task 5)
  - `lib/ai/client.ts:generateAutoResponse()` — AI function for auto-response generation (created in Task 6)
  - `lib/db/schema.ts:auto_response_config` — Drizzle schema for config (created in Task 3)
  - `lib/db/schema.ts:auto_response_log` — Drizzle schema for logging (created in Task 3)
  - `lib/db/schema.ts:approval_queue` — Drizzle schema for approval items (created in Task 3)
  - `lib/db/wacli.ts:listMessages()` — for detecting new messages via polling (created in Task 3)

  **External References**:
  - shadcn/ui Switch: https://ui.shadcn.com/docs/components/switch — for enable/disable toggles
  - shadcn/ui Slider: https://ui.shadcn.com/docs/components/slider — for rate limit config
  - shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog — for approval queue modal

  **WHY Each Reference Matters**:
  - Task 5 sendMessage: Auto-response uses this to actually send messages
  - Task 6 generateAutoResponse: AI generates the response text + confidence
  - Task 3 schemas: All auto-response state is persisted here

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Enable auto-response for a DM chat
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. CHAT_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '[.[] | select(.kind=="dm")][0].jid')
      2. curl -s -X POST http://localhost:3000/api/settings/auto-response \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d "{\"chatJid\":\"$CHAT_JID\",\"enabled\":true,\"maxPerHour\":5}"
      3. Assert: HTTP status 200
      4. Assert: response shows enabled=true
    Expected Result: Auto-response enabled for DM
    Evidence: Response body captured

  Scenario: Reject auto-response for group chat
    Tool: Bash (curl)
    Preconditions: Dev server running, authenticated
    Steps:
      1. GROUP_JID=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '[.[] | select(.kind=="group")][0].jid')
      2. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/settings/auto-response \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d "{\"chatJid\":\"$GROUP_JID\",\"enabled\":true}"
      3. Assert: HTTP status is 400
      4. Assert: response contains error about groups not supported
    Expected Result: Group auto-response rejected
    Evidence: Response body captured

  Scenario: Approval queue displays pending items
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated, auto-response enabled, pending items in queue
    Steps:
      1. Navigate to main page
      2. Assert: approval badge visible in header (if pending items exist)
      3. Click approval badge/button
      4. Wait for: approval queue panel visible
      5. Assert: pending items listed with incoming message and proposed response
      6. Screenshot: .sisyphus/evidence/task-9-approval-queue.png
    Expected Result: Approval queue shows pending items
    Evidence: .sisyphus/evidence/task-9-approval-queue.png

  Scenario: Global kill switch disables all auto-response
    Tool: Bash (curl)
    Preconditions: Auto-response enabled for at least one chat
    Steps:
      1. curl -s -X POST http://localhost:3000/api/settings \
           -H "Content-Type: application/json" \
           -b cookies.txt \
           -d '{"key":"auto_response_global_enabled","value":"false"}'
      2. Assert: HTTP status 200
      3. Verify: GET auto-response queue processing is paused
    Expected Result: Global kill switch works
    Evidence: Response captured
  ```

  **Commit**: YES
  - Message: `feat(auto-response): add auto-reply system with approval queue and safety controls`
  - Files: `lib/auto-response/`, `app/api/settings/auto-response/`, `app/api/auto-response/`, `components/auto-response/`
  - Pre-commit: `npm run build`

---

- [x] 10. Settings + Configuration UI
- [x] 11. Docker Packaging + Deployment

- [x] 11. Docker Packaging + Deployment

  **What to do**:
  - Create `Dockerfile` — multi-stage build:
    - Stage 1 (`go-builder`): `golang:1.22-alpine` — build wacli from source
      - `go build -tags sqlite_fts5 -o /wacli ./cmd/wacli`
    - Stage 2 (`node-builder`): `node:20-alpine` — build Next.js
      - Install deps, run `npm run build`
      - Use `output: "standalone"` for minimal production build
    - Stage 3 (`production`): `node:20-alpine` — production runtime
      - Install: `supervisord`, `sqlite3` (for debugging)
      - Copy: wacli binary from go-builder, Next.js standalone from node-builder
      - Copy: `supervisord.conf`
      - Create `/data` directory for databases
      - Expose port 3000
      - CMD: `supervisord -c /etc/supervisor/conf.d/supervisord.conf`
  - Create `supervisord.conf`:
    ```ini
    [supervisord]
    nodaemon=true
    logfile=/dev/null
    logfile_maxbytes=0

    [unix_http_server]
    file=/var/run/supervisor.sock

    [supervisorctl]
    serverurl=unix:///var/run/supervisor.sock

    [rpcinterface:supervisor]
    supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

    [program:nextjs]
    command=node /app/server.js
    directory=/app
    autostart=true
    autorestart=true
    stdout_logfile=/dev/stdout
    stdout_logfile_maxbytes=0
    stderr_logfile=/dev/stderr
    stderr_logfile_maxbytes=0
    environment=NODE_ENV=production,PORT=3000

    [program:wacli-sync]
    command=/usr/local/bin/wacli sync --follow --store /data/.wacli
    autostart=true
    autorestart=true
    stdout_logfile=/dev/stdout
    stdout_logfile_maxbytes=0
    stderr_logfile=/dev/stderr
    stderr_logfile_maxbytes=0
    ```
  - Create `docker-compose.yml`:
    ```yaml
    services:
      app:
        build: .
        ports:
          - "3000:3000"
        volumes:
          - wacli-data:/data
          - ${HOME}/.wacli:/data/.wacli  # Mount host wacli data
        env_file:
          - .env
        environment:
          - WACLI_DB_PATH=/data/.wacli/wacli.db
          - WACLI_STORE_DIR=/data/.wacli
          - WACLI_BINARY_PATH=/usr/local/bin/wacli
          - APP_DB_PATH=/data/app.db
        restart: unless-stopped
        healthcheck:
          test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
          interval: 30s
          timeout: 10s
          retries: 3
          start_period: 60s

    volumes:
      wacli-data:
    ```
  - Create `.dockerignore`:
    ```
    node_modules
    .next
    .git
    .env
    .sisyphus
    *.md
    ```
  - Update `.env.example` with Docker-specific paths
  - Create `scripts/generate-password-hash.sh`:
    - Helper script to generate bcrypt hash for MASTER_PASSWORD_HASH
    - `node -e "require('bcryptjs').hash(process.argv[1], 10).then(console.log)" "$1"`
  - Test the full Docker build and deployment

  **Must NOT do**:
  - Do NOT use docker-in-docker
  - Do NOT expose supervisord control port externally
  - Do NOT store secrets in Dockerfile or docker-compose.yml
  - Do NOT use Alpine for Go builder if CGO is needed (wacli needs sqlite3 CGO)
    - Use `golang:1.22-alpine` with `apk add gcc musl-dev` for CGO support
  - Do NOT forget to enable CGO_ENABLED=1 for wacli build (it uses go-sqlite3 which requires CGO)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Docker packaging requires careful multi-stage build, process management, and volume mapping
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a UI task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None (final)
  - **Blocked By**: Task 10

  **References**:

  **Pattern References**:
  - `lib/utils/wacli.ts` — uses `supervisorctl stop/start wacli-sync` for send lock management (created in Task 5). The supervisord config must include unix socket and rpcinterface for supervisorctl to work.
  - `next.config.ts` — must have `output: "standalone"` for Docker (configured in Task 1)

  **External References**:
  - Next.js standalone output: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
  - Supervisord config: http://supervisord.org/configuration.html
  - Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
  - wacli build command: `go build -tags sqlite_fts5 -o ./dist/wacli ./cmd/wacli` (from wacli README)

  **WHY Each Reference Matters**:
  - Next.js standalone: Without this, Docker image would include full node_modules (huge)
  - Supervisord: Must configure unix socket + rpcinterface for supervisorctl to work (needed by send feature)
  - wacli build: Must use `-tags sqlite_fts5` flag and CGO for sqlite3

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Docker image builds successfully
    Tool: Bash
    Preconditions: Docker daemon running
    Steps:
      1. docker compose build 2>&1
      2. Assert: exit code 0
      3. Assert: output contains "Successfully" or "exporting to image"
      4. docker images | grep whatsapp-agent
      5. Assert: image exists
    Expected Result: Docker image builds without errors
    Evidence: Build output captured

  Scenario: Docker container starts and health check passes
    Tool: Bash
    Preconditions: Docker image built, .env configured
    Steps:
      1. docker compose up -d
      2. Wait 30 seconds for startup
      3. curl -s http://localhost:3000/api/health | jq '.'
      4. Assert: status is "ok" or "degraded"
      5. Assert: dbAccessible is true
      6. docker compose logs --tail=20
      7. Assert: no ERROR level logs
    Expected Result: Container starts, health check responds
    Evidence: Health response and logs captured

  Scenario: Both processes running in container
    Tool: Bash
    Preconditions: Docker container running
    Steps:
      1. docker compose exec app supervisorctl status
      2. Assert: "nextjs" shows RUNNING
      3. Assert: "wacli-sync" shows RUNNING
    Expected Result: Both supervisord programs running
    Evidence: supervisorctl output captured

  Scenario: Full login flow works in Docker
    Tool: Playwright (playwright skill)
    Preconditions: Docker container running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/login
      2. Wait for: login form visible
      3. Fill password and submit
      4. Wait for: redirect to /
      5. Assert: chat list visible
      6. Screenshot: .sisyphus/evidence/task-11-docker-login.png
    Expected Result: Full app works inside Docker
    Evidence: .sisyphus/evidence/task-11-docker-login.png

  Scenario: Docker compose down and up preserves data
    Tool: Bash
    Preconditions: Docker running, some app.db data exists
    Steps:
      1. docker compose down
      2. docker compose up -d
      3. Wait 30 seconds
      4. curl -s http://localhost:3000/api/health -b cookies.txt | jq '.dbAccessible'
      5. Assert: true (data persisted via volume)
    Expected Result: Data survives container restart
    Evidence: Health check output captured
  ```

  **Commit**: YES
  - Message: `feat(docker): add Docker Compose deployment with supervisord process management`
  - Files: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `supervisord.conf`, `scripts/`
  - Pre-commit: `docker compose build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: scaffold Next.js project with dependencies and directory structure` | All scaffolding | `npm run build` |
| 2 | `feat(auth): add master password authentication with JWT sessions` | `lib/auth/`, `middleware.ts`, `app/(auth)/`, `app/api/auth/` | `npm run build` |
| 3 | `feat(db): add wacli.db reader layer and app.db schema with Drizzle` | `lib/db/`, `lib/utils/`, `src/types/` | `npm run build` |
| 4 | `feat(ui): add hybrid sidebar layout with chat list and message display` | `components/chat/`, `components/layout/`, `app/(app)/`, `app/api/chats/`, `app/api/messages/`, `hooks/` | `npm run build` |
| 5 | `feat(send): add message sending via wacli CLI with sync lock management` | `lib/utils/wacli.ts`, `app/api/messages/send/`, `app/api/health/` | `npm run build` |
| 6 | `feat(ai): add OpenRouter integration with model tiering and prompt templates` | `lib/ai/` | `npm run build` |
| 7 | `feat(analytics): add conversation analytics engine with charts and AI insights` | `app/api/analytics/`, `components/analytics/` | `npm run build` |
| 8 | `feat(ai): add message proposal generation with 3-option suggestion UI` | `app/api/ai/`, `components/ai/` | `npm run build` |
| 9 | `feat(auto-response): add auto-reply system with approval queue and safety controls` | `lib/auto-response/`, `app/api/settings/auto-response/`, `app/api/auto-response/`, `components/auto-response/` | `npm run build` |
| 10 | `feat(settings): add configuration UI with system status and auto-response management` | `app/(app)/settings/`, `app/api/settings/`, `components/settings/` | `npm run build` |
| 11 | `feat(docker): add Docker Compose deployment with supervisord process management` | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `supervisord.conf`, `scripts/` | `docker compose build` |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
npm run build  # Expected: exit 0

# Docker builds
docker compose build  # Expected: success

# Docker runs
docker compose up -d && sleep 30
curl -s http://localhost:3000/api/health | jq '.status'  # Expected: "ok"

# Auth works
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' -c cookies.txt  # Expected: {"success":true}

# Chats load
curl -s http://localhost:3000/api/chats -b cookies.txt | jq 'length'  # Expected: > 0

# Messages load
CHAT=$(curl -s http://localhost:3000/api/chats -b cookies.txt | jq -r '.[0].jid')
curl -s "http://localhost:3000/api/messages?chatJid=$CHAT&limit=5" -b cookies.txt | jq 'length'  # Expected: > 0

# AI works
curl -s "http://localhost:3000/api/analytics/style?chatJid=$CHAT" -b cookies.txt | jq 'has("formality")'  # Expected: true

# Proposals work
curl -s -X POST http://localhost:3000/api/ai/proposals \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"chatJid\":\"$CHAT\"}" | jq 'length'  # Expected: 3

# Both processes running
docker compose exec app supervisorctl status  # Expected: nextjs RUNNING, wacli-sync RUNNING
```

### Final Checklist
- [x] All "Must Have" features present and functional
- [x] All "Must NOT Have" items absent
- [x] Docker builds and runs with single `docker compose up`
- [x] Auth protects all routes
- [x] Chat list loads from wacli.db in ≤10 seconds polling
- [x] Analytics show meaningful data for selected chat
- [x] 3 message proposals generated on demand
- [x] Message sending works (stop sync → send → restart sync)
- [x] Auto-response configurable per chat with safety controls
- [x] Approval queue accessible and functional
- [x] Health endpoint reports accurate status
- [x] No secrets in source code (all in .env)
