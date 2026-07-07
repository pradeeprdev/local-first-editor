"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function NewDocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBusy(false);
    if (res.ok) {
      const doc = await res.json();
      startTransition(() => router.push(`/documents/${doc.id}`));
    }
  }

  const pending = busy || isPending;

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled document"
        className="flex-1 rounded-md border border-hairline bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
      />
      <button
        disabled={pending}
        className="flex items-center gap-2 whitespace-nowrap rounded-md bg-plum px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-plum-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? "Creating…" : "Create"}
      </button>
    </form>
  );
}