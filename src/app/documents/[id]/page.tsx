import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import Editor from "@/components/Editor";
import InviteForm from "./InviteForm";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const access = await getAccess(session.userId, id);
  if (!access) notFound();

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) notFound();

  return (
    // h-screen + flex-col + overflow-hidden pins the page to the viewport.
    // Only the editor textarea and the version list scroll internally now —
    // the page itself never grows past one screen.
    <div className="mx-auto flex h-screen w-full max-w-5xl flex-col overflow-hidden px-6 py-8">
      <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-wider text-ink/40 transition-colors hover:text-plum"
          >
            ← All documents
          </Link>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="sync-dot" aria-hidden />
            <h1 className="font-display text-2xl font-medium text-ink">{doc.title}</h1>
          </div>
        </div>
        {access.role === "OWNER" && <InviteForm documentId={id} />}
      </div>
      {/* min-h-0 is the fix here: without it, a flex child won't shrink below
          its content size, so the editor/sidebar silently force the page taller
          than the viewport even though the parent is h-screen. */}
      <div className="min-h-0 flex-1">
        <Editor documentId={id} role={access.role} />
      </div>
    </div>
  );
}