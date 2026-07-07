import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAccess, canManage } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { collaborators: { include: { user: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    role: access.role,
    collaborators: doc.collaborators.map((c) => ({
      email: c.user.email,
      name: c.user.name,
      role: c.role,
    })),
  });
}

const addCollabSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

// OWNER-only: invite a collaborator with a role.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccess(session.userId, id);
  if (!access || !canManage(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addCollabSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "No user with that email" }, { status: 404 });

  await prisma.collaborator.upsert({
    where: { userId_documentId: { userId: user.id, documentId: id } },
    update: { role: parsed.data.role },
    create: { userId: user.id, documentId: id, role: parsed.data.role },
  });

  return NextResponse.json({ ok: true });
}
