"use client";

import { useEffect, useState } from "react";

type Version = { id: string; label: string; createdAt: string; author: string };

export default function VersionHistory({
  documentId,
  canRestore,
  onRestore,
}: {
  documentId: string;
  canRestore: boolean;
  onRestore: (versionId: string) => Promise<void>;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}/versions`);
    if (res.ok) setVersions(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [documentId]);

  return (
    <aside className="w-72 shrink-0 rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Version history</h2>
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && versions.length === 0 && (
        <p className="text-sm text-gray-400">No snapshots yet. Save one to start time-travel.</p>
      )}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="rounded-md border border-gray-100 p-2 text-sm">
            <div className="font-medium text-gray-800">{v.label}</div>
            <div className="text-xs text-gray-500">
              {new Date(v.createdAt).toLocaleString()} · {v.author}
            </div>
            {canRestore && (
              <button
                className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                onClick={async () => {
                  if (confirm(`Restore "${v.label}"? This merges as a new edit, nothing is deleted.`)) {
                    await onRestore(v.id);
                    await load();
                  }
                }}
              >
                Restore
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
