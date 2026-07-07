"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

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
      router.push(`/documents/${doc.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New document title"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2"
      />
      <button
        disabled={busy}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
