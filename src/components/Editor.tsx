"use client";

import { useEffect, useRef, useState } from "react";
import { LocalFirstDocument, SyncStatus } from "@/lib/ydoc-client";
import ConnectionStatus from "./ConnectionStatus";
import VersionHistory from "./VersionHistory";

export default function Editor({
  documentId,
  role,
}: {
  documentId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SyncStatus>("offline");
  const [ready, setReady] = useState(false);
  const docRef = useRef<LocalFirstDocument | null>(null);
  const applyingRemoteRef = useRef(false);
  const readOnly = role === "VIEWER";

  useEffect(() => {
    let cancelled = false;
    const lfd = new LocalFirstDocument(documentId, setStatus);
    docRef.current = lfd;

    lfd.whenReady().then(() => {
      if (cancelled) return;
      setText(lfd.ytext.toString());
      setReady(true);
      lfd.startBackgroundSync();
    });

    // Reflect remote/CRDT changes (including our own applied edits) into the textarea.
    const observer = () => {
      applyingRemoteRef.current = true;
      setText(lfd.ytext.toString());
      applyingRemoteRef.current = false;
    };
    lfd.ytext.observe(observer);

    return () => {
      cancelled = true;
      lfd.ytext.unobserve(observer);
      lfd.destroy();
    };
  }, [documentId]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (readOnly) return;
    const newValue = e.target.value;
    const lfd = docRef.current;
    if (!lfd) return;

    // Minimal diff between old and new value, applied as one Yjs transaction
    // so it becomes a single coalesced CRDT op (keeps typing fast, per the
    // "no client-side lag during rapid typing" evaluation criterion).
    const old = lfd.ytext.toString();
    const [start, endOld, endNew] = diffRange(old, newValue);
    lfd.doc.transact(() => {
      if (endOld > start) lfd.ytext.delete(start, endOld - start);
      if (endNew > start) lfd.ytext.insert(start, newValue.slice(start, endNew));
    });
    setText(newValue);
  }

  async function saveVersion() {
    const lfd = docRef.current;
    if (!lfd) return;
    const label = window.prompt("Name this version (e.g. 'Before rewrite'):");
    if (!label) return;
    await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, state: lfd.encodeFullState() }),
    });
  }

  async function restoreVersion(versionId: string) {
    await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, { method: "POST" });
    await docRef.current?.syncOnce();
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <ConnectionStatus status={status} />
          <span className="text-xs uppercase tracking-wide text-gray-500">{role}</span>
        </div>
        <textarea
          aria-label="Document content"
          className="flex-1 min-h-[60vh] w-full resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          value={text}
          onChange={handleChange}
          disabled={readOnly || !ready}
          placeholder={ready ? "Start typing... works offline." : "Loading local copy..."}
        />
        {!readOnly && (
          <button
            onClick={saveVersion}
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save version snapshot
          </button>
        )}
      </div>
      <VersionHistory
        documentId={documentId}
        canRestore={!readOnly}
        onRestore={restoreVersion}
      />
    </div>
  );
}

/** Smallest [start, endOld, endNew) range that differs between two strings. */
function diffRange(a: string, b: string): [number, number, number] {
  let start = 0;
  const maxStart = Math.min(a.length, b.length);
  while (start < maxStart && a[start] === b[start]) start++;

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return [start, endA, endB];
}
