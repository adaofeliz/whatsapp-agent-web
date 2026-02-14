# Analytics Caching + Auto-Respond — Work Plan

## TL;DR

> **Quick Summary**: Stop expensive analytics recomputation when there are no new messages by caching timing/dropout analyses keyed by the latest message version and by refetching only when message version changes. Fix auto-respond by (1) reliably triggering the poller server-side and (2) ensuring the global kill switch is initialized, so incoming messages produce approval-queue items and can be approved/sent.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES (2 waves)
> **Critical Path**: Analytics cache key/versioning → server-side caches → UI refetch logic → auto-respond poll trigger → verification

---

## Context / Evidence

### Analytics
- UI fetches analytics in `src/components/layout/right-panel.tsx` (5 endpoints in parallel).
- AI-backed analytics endpoints:
  - `src/app/api/analytics/style/route.ts` calls `analyzeStyle()` (HAS 24h DB cache in `src/lib/ai/client.ts`).
  - `src/app/api/analytics/timing/route.ts` calls `analyzeTimingPatterns()` (NO cache).
  - `src/app/api/analytics/dropout/route.ts` calls `analyzeDropouts()` (NO cache).
- DB-only endpoints:
  - `overview`, `frequency`.

### Auto-Respond
- Poller exists: `src/lib/auto-response/poller.ts`, but **is never started**.
- Engine gates on `settings.auto_response_enabled === "true"` (string); no initializer currently sets it.
- Per-chat enable exists (UI toggles via `/api/settings/auto-response`).
- Approval queue API+UI exist (`/api/auto-response/queue`).

---

## Objectives / Definition of Done

### Analytics caching
- For a given chat, once analytics are computed, repeated viewing does **not** re-run expensive AI work unless new messages arrive.
- When a new message arrives, analytics recompute once for the new message version.

### Auto-respond
- When auto-response is enabled for a DM chat and the global kill switch is enabled:
  - a new incoming message triggers processing
  - a proposal is inserted into `approval_queue` (default behavior)
  - approving the queued response sends a WhatsApp message via wacli

---

## Verification Strategy (agent-executable)

All verification must be runnable via `curl`, `docker logs`, and `sqlite3` from the agent — no manual UI interaction required.

---

## Execution Strategy

### Wave 1 (Analytics caching)
1) Create DB caches for timing/dropout keyed by message version.
2) Modify analytics endpoints to return cache metadata.
3) Update RightPanel to only refetch expensive endpoints when message version changes.

### Wave 2 (Auto-respond)
4) Make auto-respond poll run server-side reliably via a route.
5) Initialize/normalize global kill switch.
6) Verify end-to-end: inject a synthetic inbound message row into wacli.db and confirm it queues + can be approved and sent.

---

## TODOs

### 1) Define “message version” for caching (chat-scoped)

**What to do**:
- Use the most recent message timestamp in the relevant window as the message version:
  - `lastMessageTs = messages[messages.length - 1]?.timestamp` after sorting oldest→newest.
- For endpoints that read messages newest-first, compute `max(ts)`.

**Where**:
- `src/app/api/analytics/timing/route.ts`
- `src/app/api/analytics/dropout/route.ts`
- (Optional) unify in helper in `src/lib/db/wacli.ts`.

**Acceptance Criteria**:
- Each analytics response includes `{ meta: { chatJid, messageVersionTs } }`.

---

### 2) Add server-side caches for timing + dropout analytics

**What to do**:
- Add two new cache tables to app DB schema:
  - `timing_analysis_cache(chat_jid, message_version_ts, value_json, created_at)`
  - `dropout_analysis_cache(chat_jid, message_version_ts, value_json, created_at)`
- Add DB init SQL in `src/lib/db/app.ts` (CREATE TABLE IF NOT EXISTS).
- Implement cache get/set in `src/lib/ai/client.ts`:
  - New functions:
    - `getCachedTimingAnalysis(chatJid, messageVersionTs)`
    - `setCachedTimingAnalysis(...)`
    - `getCachedDropoutAnalysis(...)`
    - `setCachedDropoutAnalysis(...)`
  - Store JSON in TEXT.
- Update endpoints:
  - `timing` endpoint:
    - compute messageVersionTs
    - if cache hit: return cached + `meta.cacheHit=true`
    - else call AI, store, return `cacheHit=false`
  - same for `dropout`.

**Where**:
- `src/lib/db/schema.ts` (new tables)
- `src/lib/db/app.ts` (init SQL)
- `src/lib/ai/client.ts` (caching implementation)
- `src/app/api/analytics/timing/route.ts`
- `src/app/api/analytics/dropout/route.ts`

**Must NOT do**:
- No new dependencies.
- Do not change style caching TTL logic.

**Acceptance Criteria**:
- Two consecutive calls for same `chatJid` with unchanged `messageVersionTs`:
  - first returns `cacheHit=false`
  - second returns `cacheHit=true`

**Agent-Executed QA Scenario (Bash)**:
```bash
CHAT="<jid>"
curl -s "http://localhost:3000/api/analytics/timing?chatJid=$CHAT" | jq '.meta.cacheHit'
curl -s "http://localhost:3000/api/analytics/timing?chatJid=$CHAT" | jq '.meta.cacheHit'
```

---

### 3) Improve UI analytics fetching so it doesn’t refetch when no new messages

**What to do**:
- In `src/components/layout/right-panel.tsx`:
  - Fetch `overview` first (or compute message version via a lightweight endpoint).
  - Track `lastFetchedMessageVersionTs` in state.
  - If the message version is unchanged, **do not** re-fetch timing/dropout/style/frequency.
  - If changed, fetch all.

**Where**:
- `src/components/layout/right-panel.tsx`

**Acceptance Criteria**:
- Navigating away/back to the same chat without new messages does not trigger AI recompute.
- When `messageVersionTs` changes, UI refreshes analytics once.

---

### 4) Make auto-respond actually run (server-side poll trigger)

**Why**:
- `startPoller()` cannot be invoked from client components safely because poller uses server-only sqlite.

**What to do**:
- Refactor poller:
  - Export a `pollOnce()` function from `src/lib/auto-response/poller.ts` that runs one poll cycle.
  - Keep `isProcessing` guard.
- Add a new route:
  - `src/app/api/auto-response/poll/route.ts`
  - `GET` calls `pollOnce()` and returns summary: `{ processed, found, skipped, errors }`.
  - Set `dynamic='force-dynamic'`, `revalidate=0`, and `Cache-Control: no-store`.
- Trigger it periodically from UI shell:
  - In `src/components/layout/app-shell.tsx`, add a client-side interval to call `/api/auto-response/poll` every 10s.
  - This keeps the worker “alive” in a single-instance container without adding a separate daemon.

**Where**:
- `src/lib/auto-response/poller.ts`
- `src/app/api/auto-response/poll/route.ts` (new)
- `src/components/layout/app-shell.tsx`

**Acceptance Criteria**:
- `curl -s http://localhost:3000/api/auto-response/poll` returns 200 and a JSON summary.

---

### 5) Initialize global auto-response kill switch

**What to do**:
- In `src/lib/db/app.ts` DB init, ensure the setting exists:
  - key: `auto_response_enabled`
  - value: `true` (string), if missing.
- (Optional) make engine tolerant of `"1"`/`"true"`/`true`.

**Where**:
- `src/lib/db/app.ts`
- (Optional) `src/lib/auto-response/engine.ts`

**Acceptance Criteria**:
- On fresh app.db, auto-response does not skip with “Global auto-response disabled” once enabled.

---

### 6) End-to-end auto-respond verification (fully automated)

**Goal**: Prove that docker-managed sync DB is used and auto-respond queues and can send.

**Steps**:
1) Pick a DM chatJid from `/api/chats?kind=dm&limit=1`.
2) Enable per-chat auto-response:
   - POST `/api/settings/auto-response` with `{ chatJid, enabled: true }`
3) Inject a synthetic inbound message row into wacli.db (from_me=0) using sqlite3 (agent-executable):
   - Determine required columns via `PRAGMA table_info(messages)`.
   - Insert minimally required fields (msg_id unique, chat_jid, ts, from_me, text, display_text).
4) Call `/api/auto-response/poll`.
5) Verify `/api/auto-response/queue?status=pending` contains an item for that chat.
6) Approve it via POST `/api/auto-response/queue` (action approve) and verify it returns messageId.

**Acceptance Criteria**:
- Queue item appears.
- Approval sends message successfully.

---

## Risks / Notes

- If you deploy multiple replicas, the poll-via-UI approach can double-process; this plan assumes single-instance Docker for now.
- Using `messageVersionTs` as cache key is simple; it may miss backfilled history edge cases (acceptable for current scope).

---

## Final Notification

After verification, send a WhatsApp message to `351935043851@s.whatsapp.net` confirming completion.
