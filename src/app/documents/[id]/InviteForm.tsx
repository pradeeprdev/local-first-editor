"use client";

import { useState } from "react";

export default function InviteForm({ documentId }: { documentId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER" | "OWNER">("EDITOR");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setBusy(false);
    setIsError(!res.ok);
    setMsg(res.ok ? `Added ${email} as ${role.toLowerCase()}` : data.error);
    if (res.ok) setEmail("");
  }

  return (
    <form onSubmit={invite} className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="email"
        placeholder="collaborator@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-hairline bg-paper-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        className="rounded-md border border-hairline bg-paper-raised px-2 py-1.5 font-mono text-xs uppercase tracking-wide text-ink outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
      >
        <option value="EDITOR">Editor</option>
        <option value="VIEWER">Viewer</option>
        <option value="OWNER">Owner</option>
      </select>
      <button
        disabled={busy}
        className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-plum-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Inviting…" : "Invite"}
      </button>
      {msg && (
        <span className={isError ? "text-brick" : "text-sage"}>{msg}</span>
      )}
    </form>
  );
}