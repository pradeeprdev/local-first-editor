import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAccess, canWrite } from "@/lib/authz";
import { versionCreateSchema, decodeAndBoundUpdate } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(
    versions.map((v) => ({
      id: v.id,
      label: v.label,
      createdAt: v.createdAt,
      author: v.author.name,
    }))
  );
}

// Save a named snapshot of the CURRENT client-side CRDT state.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access || !canWrite(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = versionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const bytes = decodeAndBoundUpdate(parsed.data.state);
  if (!bytes) return NextResponse.json({ error: "State payload rejected" }, { status: 400 });

  const version = await prisma.documentVersion.create({
    data: {
      documentId: id,
      label: parsed.data.label,
      state: Buffer.from(bytes),
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ id: version.id, label: version.label, createdAt: version.createdAt });
}
