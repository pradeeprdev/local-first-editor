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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← All documents
          </Link>
          <h1 className="text-xl font-semibold">{doc.title}</h1>
        </div>
        {access.role === "OWNER" && <InviteForm documentId={id} />}
      </div>
      <Editor documentId={id} role={access.role} />
    </div>
  );
}
