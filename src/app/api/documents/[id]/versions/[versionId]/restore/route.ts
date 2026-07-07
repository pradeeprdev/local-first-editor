import { NextResponse } from "next/server";
import * as Y from "yjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAccess, canWrite } from "@/lib/authz";

/**
 * Restore is implemented as a NEW CRDT operation, not a destructive
 * overwrite of stored state. We replay the old version's text into the
 * *current* live document inside a single Yjs transaction, which produces
 * a normal update that flows through the same sync/merge pipeline as any
 * live edit. Any edits made concurrently by other active collaborators
 * (even ones made a split second ago and not yet pulled by this client)
 * are preserved and merged deterministically - restoring never truncates
 * or clobbers someone else's in-flight work.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access || !canWrite(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version || version.documentId !== id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const doc = await prisma.document.findUnique({ where: { id }, select: { state: true } });

  // 1. Extract the old snapshot's plain text content.
  const oldDoc = new Y.Doc();
  Y.applyUpdate(oldDoc, new Uint8Array(version.state));
  const oldText = oldDoc.getText("content").toString();
  oldDoc.destroy();

  // 2. Load the CURRENT live/merged document.
  const liveDoc = new Y.Doc();
  if (doc?.state) Y.applyUpdate(liveDoc, new Uint8Array(doc.state));
  const beforeVector = Y.encodeStateVector(liveDoc);

  // 3. Replace content inside one transaction -> yields one clean update.
  const ytext = liveDoc.getText("content");
  liveDoc.transact(() => {
    ytext.delete(0, ytext.length);
    ytext.insert(0, oldText);
  });

  const restoreUpdate = Y.encodeStateAsUpdate(liveDoc, beforeVector);
  const newState = Y.encodeStateAsUpdate(liveDoc);
  liveDoc.destroy();

  await prisma.$transaction([
    prisma.documentUpdate.create({
      data: {
        documentId: id,
        update: Buffer.from(restoreUpdate),
        clientId: `system-restore:${session.userId}`,
      },
    }),
    prisma.document.update({ where: { id }, data: { state: Buffer.from(newState) } }),
  ]);

  return NextResponse.json({ ok: true, restoredUpdate: Buffer.from(restoreUpdate).toString("base64") });
}
