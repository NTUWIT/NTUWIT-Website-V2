import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Resolves the acting user from the Clerk session. Every protected route
 * handler calls this itself; the proxy is defence in depth, never the only
 * check. A user id supplied by the client is never consulted.
 */
export async function requireUser(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Admins are identified by `publicMetadata.role === "admin"` in Clerk, set from
 * the Clerk dashboard. The role is read from Clerk on every call rather than
 * trusted from the session token, so revoking it takes effect immediately and
 * no JWT template has to be configured.
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.role === "admin";
  } catch {
    // A Clerk outage must never accidentally grant access.
    return false;
  }
}

/** Throws rather than returning, so a server action cannot forget to check. */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId || !(await isAdmin())) throw new Error("FORBIDDEN");
  return userId;
}
