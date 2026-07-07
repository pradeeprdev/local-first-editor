"use client";

import { useState } from "react";

export default function InviteForm({ documentId }: { documentId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER" | "OWNER">("EDITOR");
  const [msg, setMsg] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setMsg(res.ok ? `Added ${email} as ${role}` : data.error);
    if (res.ok) setEmail("");
  }

  return (
    <form onSubmit={invite} className="flex items-center gap-2 text-sm">
      <input
        type="email"
        placeholder="collaborator@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as typeof role)}
        className="rounded-md border border-gray-300 px-2 py-1"
      >
        <option value="EDITOR">Editor</option>
        <option value="VIEWER">Viewer</option>
        <option value="OWNER">Owner</option>
      </select>
      <button className="rounded-md bg-gray-800 px-3 py-1 text-white">Invite</button>
      {msg && <span className="text-gray-500">{msg}</span>}
    </form>
  );
}
