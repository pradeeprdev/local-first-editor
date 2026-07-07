import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// List all documents the current user collaborates on.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.collaborator.findMany({
    where: { userId: session.userId },
    include: { document: true },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return NextResponse.json(
    docs.map((c) => ({
      id: c.document.id,
      title: c.document.title,
      role: c.role,
      updatedAt: c.document.updatedAt,
    }))
  );
}

const createSchema = z.object({ title: z.string().min(1).max(200) });

// Create a new document; creator becomes OWNER.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const doc = await prisma.document.create({
    data: {
      title: parsed.data.title,
      collaborators: { create: { userId: session.userId, role: "OWNER" } },
    },
  });

  return NextResponse.json({ id: doc.id, title: doc.title });
}
