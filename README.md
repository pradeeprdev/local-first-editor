# Local-First Collaborative Document Editor

Offline-first document editor built on Next.js 16 + Yjs (CRDT) + PostgreSQL.

## What's actually implemented

- **Local-first**: every edit is written to the browser's IndexedDB first via
  `y-indexeddb`. Opening, typing, and closing a document does **zero**
  network requests. Refresh, quit the browser, go fully offline — your work
  is still there.
- **Background sync engine**: a Yjs "update" is a small binary CRDT diff.
  Local edits queue up and get pushed every few seconds (or the instant
  `online` fires) to `/api/documents/[id]/sync`. The server appends them to
  an immutable log and re-merges the canonical snapshot. Pulling works the
  same way in reverse — nothing is ever overwritten, only merged.
- **Deterministic conflict resolution**: because Yjs updates are CRDTs
  (commutative + idempotent), merging two offline clients' edits in any
  order produces the same final text. See
  `src/lib/__tests__/merge.test.ts` for a test that proves this directly.
- **Version history / time travel**: "Save version snapshot" stores a
  named, immutable CRDT snapshot. "Restore" replays that snapshot's content
  as a *new* CRDT operation on the live document — it never truncates
  history or clobbers a concurrent collaborator's in-flight edit.
- **Auth + roles**: JWT session cookie, bcrypt password hashing, and
  Owner/Editor/Viewer roles enforced **server-side** on every write route
  (Viewers get a 403 if they try to push, not just a disabled button).
- **Tenant isolation**: every document query goes through
  `src/lib/authz.ts::getAccess`, requiring a `Collaborator` row. A bonus
  native Postgres RLS policy set is in `prisma/rls.sql`.
- **Payload validation / anti-OOM**: `src/lib/validation.ts` hard-caps
  request size (`Content-Length` check) and per-update byte size *before*
  the bytes are ever handed to Yjs, and caps how many updates can be
  batched in one request. A corrupted single update is caught and skipped
  without failing the whole merge.

## What's intentionally simplified (be upfront about this in your demo/README to the reviewer)

- Single shared `<textarea>` bound to one `Y.Text`, not a rich-text
  ProseMirror/Tiptap editor — swap in `y-prosemirror` later for cursors and
  formatting.
- Sync is poll-based (every 3s / on reconnect), not a persistent WebSocket.
  Good enough for "offline-first + eventually consistent"; for true
  sub-second real-time you'd add `y-websocket` or Vercel's realtime
  primitives.
- No automated e2e tests (Playwright) — only the merge-logic unit test.
  Mention this as a "next step" in your submission notes.
