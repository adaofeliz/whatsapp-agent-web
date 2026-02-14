# wacli-live-updates — Learnings

## Session: 2026-02-14

### Problem
Messages in the web UI were not updating in real-time from the Docker-managed wacli-sync process.

### Root Cause
HTTP/Next.js caching was preventing fresh reads from the API endpoints, not SQLite WAL visibility issues.

### Solution Applied

#### Wave 1: Eliminate API Route Caching
- Added `export const dynamic = 'force-dynamic'` to `/api/messages` and `/api/chats`
- Added `export const revalidate = 0` to prevent static generation
- Set response headers:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`

#### Wave 2: Client-Side No-Store Fetching
- Modified `fetch()` calls in `message-list.tsx` and `chat-list.tsx` to include `{ cache: 'no-store' }`
- Reduced polling interval from 10s to 2s for faster perceived responsiveness

### Files Modified
- `src/app/api/messages/route.ts` — Added dynamic config + no-store headers
- `src/app/api/chats/route.ts` — Added dynamic config + no-store headers
- `src/components/chat/message-list.tsx` — Added cache: 'no-store', reduced interval to 2s
- `src/components/chat/chat-list.tsx` — Added cache: 'no-store', reduced interval to 2s

### Verification
- `curl -I http://localhost:3000/api/messages?chatJid=...` returns `Cache-Control: no-store`
- `curl -I http://localhost:3000/api/chats` returns `Cache-Control: no-store`
- Container healthy after rebuild
- Completion message sent successfully to 351935043851

### Key Insight
The issue was not SQLite WAL visibility (Wave 3 was not needed). The problem was entirely at the HTTP caching layer. With proper `Cache-Control` headers and `dynamic='force-dynamic'`, the UI now receives fresh data on every poll.

### Notes for Future
- Next.js route handlers are dynamic by default, but can still be cached by browsers/CDNs without explicit headers
- Always use `cache: 'no-store'` in client fetch for real-time data
- Polling interval trade-off: 2s = better UX but more server load; 10s = less load but stale feel
