import { z } from "zod";

// Hard cap on a single sync payload. Yjs updates for reasonable documents
// are KBs, not MBs. 2 MB is generous headroom while still preventing a
// malicious/buggy client from sending a 500 MB body that OOMs the server.
export const MAX_UPDATE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_UPDATES_PER_BATCH = 50;

export const syncPushSchema = z.object({
  clientId: z.string().min(1).max(100),
  // base64-encoded Yjs updates
  updates: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_UPDATES_PER_BATCH),
  sinceUpdateId: z.number().int().nonnegative(),
});

export const versionCreateSchema = z.object({
  label: z.string().min(1).max(200),
  state: z.string().min(1), // base64 encoded Yjs state
});

/** Returns an error string if the request is oversized, else null. */
export function checkContentLength(req: Request): string | null {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_UPDATE_BYTES * 2) {
    return `Payload too large (${len} bytes). Max allowed is ${MAX_UPDATE_BYTES * 2} bytes.`;
  }
  return null;
}

/** Decode + bound-check a base64 update string before ever touching Yjs. */
export function decodeAndBoundUpdate(b64: string): Uint8Array | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.byteLength > MAX_UPDATE_BYTES) return null;
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
