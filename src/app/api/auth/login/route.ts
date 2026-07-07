import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, sessionCookieOptions } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signSession({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
