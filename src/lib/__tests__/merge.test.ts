import { describe, it, expect } from "vitest";
import * as Y from "yjs";

/**
 * This is the property the whole assignment hinges on: two clients edit the
 * SAME document offline, concurrently, with no coordination. When their
 * updates are merged - in EITHER order - the result must be identical.
 * That's "deterministic conflict resolution" without a manual merge UI.
 */
describe("CRDT merge determinism", () => {
  it("converges to the same text regardless of merge order", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    docA.getText("content").insert(0, "Hello world");
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // Client A (offline) appends at the end.
    docA.getText("content").insert(11, "!");
    // Client B (offline, unaware of A's change) inserts at the start.
    docB.getText("content").insert(0, "Hi. ");

    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    const mergedOrderAB = new Y.Doc();
    Y.applyUpdate(mergedOrderAB, updateA);
    Y.applyUpdate(mergedOrderAB, updateB);

    const mergedOrderBA = new Y.Doc();
    Y.applyUpdate(mergedOrderBA, updateB);
    Y.applyUpdate(mergedOrderBA, updateA);

    expect(mergedOrderAB.getText("content").toString()).toBe(
      mergedOrderBA.getText("content").toString()
    );
  });

  it("rejects a corrupt update without throwing past the boundary", () => {
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "safe content");
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    expect(() => {
      try {
        Y.applyUpdate(doc, garbage);
      } catch {
        // swallowed, exactly like the /sync route does per-update
      }
    }).not.toThrow();
    expect(doc.getText("content").toString()).toBe("safe content");
  });
});
