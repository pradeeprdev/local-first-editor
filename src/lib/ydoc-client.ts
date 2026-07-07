"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export type SyncStatus = "offline" | "syncing" | "synced" | "error";

const CURSOR_KEY = (docId: string) => `sync-cursor:${docId}`;
const CLIENT_ID_KEY = "sync-client-id";

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

/**
 * Wraps a Y.Doc with:
 *  - y-indexeddb persistence -> the browser IS the source of truth.
 *    Opening/editing/closing a document does zero network requests;
 *    edits are durable across refresh/offline even if sync never runs.
 *  - a queue of pending local updates (captured via doc.on('update'))
 *    that get flushed to the server in the background whenever we're
 *    online, and pulled/merged from the server on the same cadence.
 */
export class LocalFirstDocument {
  readonly doc: Y.Doc;
  readonly ytext: Y.Text;
  private persistence: IndexeddbPersistence;
  private pendingUpdates: Uint8Array[] = [];
  private clientId: string;
  private cursor = 0;
  private syncing = false;
  private onStatusChange: (s: SyncStatus) => void;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private localOriginTag = Symbol("local");

  constructor(private documentId: string, onStatusChange: (s: SyncStatus) => void) {
    this.doc = new Y.Doc();
    this.ytext = this.doc.getText("content");
    this.clientId = getClientId();
    this.onStatusChange = onStatusChange;
    this.cursor = Number(localStorage.getItem(CURSOR_KEY(documentId)) || 0);

    // Local, offline-capable persistence. This resolves before the doc is
    // considered "ready" for editing, per the y-indexeddb contract.
    this.persistence = new IndexeddbPersistence(`doc-${documentId}`, this.doc);

    // Any change NOT caused by a remote sync-merge gets queued for push.
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === this.localOriginTag) return; // don't re-queue our own applied remote updates
      this.pendingUpdates.push(update);
    });
  }

  async whenReady(): Promise<void> {
    return new Promise((resolve) => this.persistence.once("synced", () => resolve()));
  }

  startBackgroundSync(intervalMs = 3000) {
    const tick = () => this.syncOnce();
    tick();
    this.intervalHandle = setInterval(tick, intervalMs);
    window.addEventListener("online", tick);
  }

  stopBackgroundSync() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    window.removeEventListener("online", () => this.syncOnce());
  }

  private setCursor(id: number) {
    this.cursor = id;
    localStorage.setItem(CURSOR_KEY(this.documentId), String(id));
  }

  /** One round of: flush local queue -> server, then pull remote updates -> merge locally. */
  async syncOnce() {
    if (this.syncing) return;
    if (!navigator.onLine) {
      this.onStatusChange("offline");
      return;
    }
    this.syncing = true;
    this.onStatusChange("syncing");
    try {
      const toSend = this.pendingUpdates.splice(0, this.pendingUpdates.length);

      if (toSend.length > 0) {
        const res = await fetch(`/api/documents/${this.documentId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: this.clientId,
            updates: toSend.map((u) => Buffer.from(u).toString("base64")),
            sinceUpdateId: this.cursor,
          }),
        });
        if (!res.ok) {
          // put the updates back - we'll retry next tick instead of losing them
          this.pendingUpdates.unshift(...toSend);
          this.onStatusChange("error");
          return;
        }
        const data = await res.json();
        this.applyRemote(data.updates, data.latestId);
      } else {
        const res = await fetch(
          `/api/documents/${this.documentId}/sync?sinceUpdateId=${this.cursor}`
        );
        if (!res.ok) {
          this.onStatusChange("error");
          return;
        }
        const data = await res.json();
        this.applyRemote(data.updates, data.latestId);
      }
      this.onStatusChange("synced");
    } catch {
      this.onStatusChange("offline");
      // put unsent updates back so nothing is lost
      this.pendingUpdates.unshift(...this.pendingUpdates);
    } finally {
      this.syncing = false;
    }
  }

  private applyRemote(updates: { id: number; update: string; clientId: string }[], latestId: number) {
    for (const u of updates) {
      if (u.clientId === this.clientId) continue; // already have our own change
      const bytes = new Uint8Array(Buffer.from(u.update, "base64"));
      Y.applyUpdate(this.doc, bytes, this.localOriginTag);
    }
    if (latestId) this.setCursor(latestId);
  }

  encodeFullState(): string {
    return Buffer.from(Y.encodeStateAsUpdate(this.doc)).toString("base64");
  }

  destroy() {
    this.stopBackgroundSync();
    this.persistence.destroy();
    this.doc.destroy();
  }
}
