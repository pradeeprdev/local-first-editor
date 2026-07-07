import { prisma } from "./db";
import type { Role } from "@prisma/client";

/**
 * Every document-scoped API route must call this first. It is the single
 * choke point for tenant isolation: if there is no Collaborator row for
 * (userId, documentId), the caller gets `null` and the route must 403/404.
 * This is what "strict ORM scoping" means in practice - no query anywhere
 * else in the app is allowed to fetch a Document without going through here.
 */
export async function getAccess(userId: string, documentId: string) {
  const collab = await prisma.collaborator.findUnique({
    where: { userId_documentId: { userId, documentId } },
  });
  return collab; // null if the user has no access at all
}

export function canWrite(role: Role) {
  return role === "OWNER" || role === "EDITOR";
}

export function canManage(role: Role) {
  return role === "OWNER";
}
