import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const PROTECTED = ["/dashboard", "/documents"];

export function middleware(req: NextRequest) {
  const isProtected = PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/documents/:path*"],
  // jsonwebtoken needs Node's crypto module, not the Edge runtime.
  // If your Next.js version doesn't support this yet, see README
  // troubleshooting for a `jose`-based drop-in replacement.
  runtime: "nodejs",
};
