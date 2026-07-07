import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  const token = signSession({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
