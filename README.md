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

---

## Mac setup — step by step

### 1. Install Node.js 20+ (skip if you already have it)

```bash
brew install node
node -v   # confirm v20 or newer
```

### 2. Get a local PostgreSQL running (pick ONE option)

**Option A — Docker (fastest if you have Docker Desktop):**
```bash
docker run --name local-first-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=local_first_editor -p 5432:5432 -d postgres:16
```

**Option B — Postgres.app (no Docker needed):**
Download from https://postgresapp.com, open it, click "Initialize".
Then create the database:
```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/createdb local_first_editor
```

**Option C — Homebrew:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb local_first_editor
```

### 3. Unzip and install dependencies

```bash
cd ~/Downloads
unzip local-first-editor.zip
cd local-first-editor
npm install
```

### 4. Configure environment variables

```bash
cp .env.example .env
```
Open `.env` and set `DATABASE_URL` to match whichever option you chose above
(the default already matches Option A/C on their default port/user). Set
`JWT_SECRET` to any random string, e.g. run `openssl rand -hex 32` and paste
the output in.

### 5. Create the database tables

```bash
npx prisma migrate dev --name init
npx prisma generate
```

(Optional bonus, adds native Postgres RLS on top of the app-level scoping):
```bash
psql "$DATABASE_URL" -f prisma/rls.sql
```

### 6. Run it

```bash
npm run dev
```
Open http://localhost:3000 — register an account, create a document, start
typing. Open the same URL in a second browser profile (or incognito) to
simulate a second collaborator; invite that account's email as Editor from
the document page.

### 7. Try the offline demo (this is the whole point of the assignment)

1. Open a document, type something.
2. In Chrome DevTools → Network tab, switch to "Offline".
3. Keep typing — notice zero lag, the status dot turns gray ("Offline").
4. Switch Network back to "Online" — within ~3s the dot goes
   yellow → green and your changes appear for other collaborators.

### 8. Run the CRDT merge test

```bash
npm test
```

### 9. Deploy (Vercel)

```bash
npm i -g vercel
vercel
```
In the Vercel dashboard, add `DATABASE_URL` (point it at a hosted Postgres —
[Neon](https://neon.tech) or [Supabase](https://supabase.com) both have free
tiers and give you a connection string in under a minute) and `JWT_SECRET`
as environment variables, then redeploy. Run
`npx prisma migrate deploy` locally against the hosted `DATABASE_URL` once
before your first deploy so the tables exist.

### 10. Before you submit

- Edit the footer in `src/app/layout.tsx` — replace `YOUR NAME HERE` /
  `YOUR_GITHUB` / `YOUR_LINKEDIN` with your real details (the assignment
  requires this in the footer).
- `git init && git add -A && git commit -m "Local-first collaborative editor"`,
  push to a new GitHub repo, and submit that link + the Vercel URL.

## Troubleshooting

- **`middleware.ts` errors about Edge runtime / `crypto`**: your Next
  version doesn't yet support `runtime: "nodejs"` in middleware config.
  Quick fix: `npm install jose`, then in `src/lib/auth.ts` swap
  `jsonwebtoken` for `jose`'s `SignJWT`/`jwtVerify` (both are edge-safe),
  and remove the `runtime: "nodejs"` line from `middleware.ts`.
- **`Can't reach database server`**: Postgres isn't running — check
  `docker ps` (Option A) or `brew services list` (Option C), and confirm
  the port/user/password in `.env` match what you started.
- **`prisma migrate dev` asks to reset the database**: safe to accept on a
  fresh local DB; it just means the schema changed since last run.
- **Port 3000 already in use**: `npm run dev -- -p 3001`.
- **`y-indexeddb` errors in the browser console**: IndexedDB isn't
  available in private/incognito mode in some browsers — use a second
  full browser profile instead to simulate a second user.

## Project structure

```
src/
  app/
    api/                     # all backend routes (auth, documents, sync, versions)
    dashboard/                # document list + create
    documents/[id]/           # editor page
    login/, register/
  components/
    Editor.tsx                 # textarea <-> Y.Text binding
    ConnectionStatus.tsx
    VersionHistory.tsx
  lib/
    ydoc-client.ts             # client-side local-first + sync engine
    db.ts, auth.ts, authz.ts, validation.ts
prisma/
  schema.prisma                # Document, Collaborator(role), DocumentUpdate, DocumentVersion
  rls.sql                      # bonus native Postgres RLS policies
```
# local-first-editor
