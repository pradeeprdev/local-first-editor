"use client";

import { useEffect, useState } from "react";

type Version = { id: string; label: string; createdAt: string; author: string };

export default function VersionHistory({
  documentId,
  canRestore,
  onRestore,
  refreshKey = 0,
}: {
  documentId: string;
  canRestore: boolean;
  onRestore: (versionId: string) => Promise<void>;
  refreshKey?: number;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/versions`);
    if (res.ok) setVersions(await res.json());
    setLoading(false);
  }

  // Refetch whenever the document changes OR the parent bumps refreshKey
  // (e.g. right after a new snapshot is saved).
  useEffect(() => {
    load();
  }, [documentId, refreshKey]);

  return (
    // h-full + flex-col caps this at the editor's height; only the <ul>
    // scrolls, so the heading stays put and the sidebar never grows the page.
    <aside className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 shrink-0 text-sm font-semibold text-gray-700">Version history</h2>
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && versions.length === 0 && (
        <p className="text-sm text-gray-400">No snapshots yet. Save one to start time-travel.</p>
      )}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {versions.map((v) => (
          <li key={v.id} className="rounded-md border border-gray-100 p-2 text-sm">
            <div className="font-medium text-gray-800">{v.label}</div>
            <div className="text-xs text-gray-500">
              {new Date(v.createdAt).toLocaleString()} · {v.author}
            </div>
            {canRestore && (
              <button
                disabled={restoringId === v.id}
                className="mt-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                onClick={async () => {
                  if (confirm(`Restore "${v.label}"? This merges as a new edit, nothing is deleted.`)) {
                    setRestoringId(v.id);
                    await onRestore(v.id);
                    await load();
                    setRestoringId(null);
                  }
                }}
              >
                {restoringId === v.id ? "Restoring…" : "Restore"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}