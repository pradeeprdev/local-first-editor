"use client";

import type { SyncStatus } from "@/lib/ydoc-client";

const CONFIG: Record<SyncStatus, { color: string; label: string }> = {
  offline: { color: "bg-gray-400", label: "Offline — editing locally" },
  syncing: { color: "bg-yellow-400 animate-pulse", label: "Syncing…" },
  synced: { color: "bg-green-500", label: "Synced" },
  error: { color: "bg-red-500", label: "Sync error — will retry" },
};

export default function ConnectionStatus({ status }: { status: SyncStatus }) {
  const cfg = CONFIG[status];
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
      <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} aria-hidden="true" />
      <span>{cfg.label}</span>
    </div>
  );
}
