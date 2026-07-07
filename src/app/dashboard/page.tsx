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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your documents</h1>
        <LogoutButton />
      </div>

      <NewDocumentForm />

      <ul className="mt-8 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {docs.length === 0 && (
          <li className="p-4 text-sm text-gray-500">No documents yet — create one above.</li>
        )}
        {docs.map((c) => (
          <li key={c.document.id} className="flex items-center justify-between p-4">
            <Link href={`/documents/${c.document.id}`} className="font-medium text-blue-600 hover:underline">
              {c.document.title}
            </Link>
            <span className="text-xs uppercase tracking-wide text-gray-400">{c.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
