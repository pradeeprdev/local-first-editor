import { NextResponse } from "next/server";
import * as Y from "yjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAccess, canWrite } from "@/lib/authz";
import {
  syncPushSchema,
  checkContentLength,
  decodeAndBoundUpdate,
  MAX_UPDATES_PER_BATCH,
} from "@/lib/validation";

/**
 * PULL: any collaborator (including VIEWER) can fetch updates that happened
 * since their last-seen cursor. This is what makes the app "reconcile state
 * when the network resolves" - the client just asks "what did I miss?".
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const since = Number(url.searchParams.get("sinceUpdateId") || 0);

  const updates = await prisma.documentUpdate.findMany({
    where: { documentId: id, id: { gt: Number.isFinite(since) ? since : 0 } },
    orderBy: { id: "asc" },
    take: 500, // guard: never stream unbounded history in one response
  });

  return NextResponse.json({
    updates: updates.map((u) => ({
      id: u.id,
      update: Buffer.from(u.update).toString("base64"),
      clientId: u.clientId,
    })),
    latestId: updates.length ? updates[updates.length - 1].id : since,
  });
}

/**
 * PUSH: the client's offline queue of local Yjs updates. Viewers are
 * rejected here (read-only enforcement lives on the server, not just hidden
 * in the UI). Every update is size-checked BEFORE being handed to Yjs, and
 * a corrupt/malicious update fails validation without crashing the process
 * or touching the canonical document state.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite(access.role)) {
    return NextResponse.json({ error: "Viewers cannot push changes" }, { status: 403 });
  }

  const tooBig = checkContentLength(req);
  if (tooBig) return NextResponse.json({ error: tooBig }, { status: 413 });

  const body = await req.json().catch(() => null);
  const parsed = syncPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, updates, sinceUpdateId } = parsed.data;
  if (updates.length > MAX_UPDATES_PER_BATCH) {
    return NextResponse.json({ error: "Batch too large" }, { status: 413 });
  }

  // Decode + bound-check every update BEFORE touching the CRDT doc.
  const decoded: Uint8Array[] = [];
  for (const b64 of updates) {
    const bytes = decodeAndBoundUpdate(b64);
    if (!bytes) {
      return NextResponse.json({ error: "Malformed or oversized update rejected" }, { status: 400 });
    }
    decoded.push(bytes);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Append to the immutable update log (this IS the sync queue).
      await tx.documentUpdate.createMany({
        data: decoded.map((u) => ({
          documentId: id,
          update: Buffer.from(u),
          clientId,
        })),
      });

      // 2. Merge into the canonical snapshot. Because Yjs updates are
      //    commutative and idempotent, applying them in any order against
      //    any existing state converges to the same result - this is the
      //    deterministic conflict resolution the assignment asks for.
      const doc = new Y.Doc();
      const existing = await tx.document.findUnique({ where: { id }, select: { state: true } });
      if (existing?.state) Y.applyUpdate(doc, new Uint8Array(existing.state));
      for (const u of decoded) {
        try {
          Y.applyUpdate(doc, u);
        } catch (e) {
          // A single corrupt update must never take down the whole merge.
          console.error(`Skipped corrupt update for doc ${id}:`, e);
        }
      }
      const newState = Y.encodeStateAsUpdate(doc);
      await tx.document.update({
        where: { id },
        data: { state: Buffer.from(newState) },
      });
      doc.destroy();
    });
  } catch (e) {
    console.error("Sync merge failed:", e);
    return NextResponse.json({ error: "Sync failed, please retry" }, { status: 500 });
  }

  // Return anything new since the client's cursor (from other clients too).
  const fresh = await prisma.documentUpdate.findMany({
    where: { documentId: id, id: { gt: sinceUpdateId } },
    orderBy: { id: "asc" },
    take: 500,
  });

  return NextResponse.json({
    updates: fresh.map((u) => ({
      id: u.id,
      update: Buffer.from(u.update).toString("base64"),
      clientId: u.clientId,
    })),
    latestId: fresh.length ? fresh[fresh.length - 1].id : sinceUpdateId,
  });
}
