import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NewDocumentForm from "./NewDocumentForm";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const docs = await prisma.collaborator.findMany({
    where: { userId: session.userId },
    include: { document: true },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="sync-dot" aria-hidden />
          <h1 className="font-display text-2xl font-medium text-ink">Your documents</h1>
        </div>
        <LogoutButton />
      </div>

      <NewDocumentForm />

      <ul className="mt-8 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline bg-paper-raised">
        {docs.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink/45">
            Nothing here yet — create your first document above.
          </li>
        )}
        {docs.map((c) => (
          <li
            key={c.document.id}
            className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-paper"
          >
            <Link
              href={`/documents/${c.document.id}`}
              className="font-display text-base text-ink transition-colors hover:text-plum"
            >
              {c.document.title}
            </Link>
            <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/45">
              {c.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}