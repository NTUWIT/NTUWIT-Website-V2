import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { isGuestId, resolveAuthMode, resolveParticipant, type ResolvedAuthMode } from "@/lib/auth-mode";
import { getGuestNames } from "@/lib/db/queries";
import { GUEST_COOKIE, verifyGuest } from "@/lib/guest-cookie";

/** The participant auth mode, from AUTH_MODE_OVERRIDE. No I/O, so it cannot fail. */
export function readAuthMode(): ResolvedAuthMode {
  const resolved = resolveAuthMode(process.env.AUTH_MODE_OVERRIDE);
  if (resolved.warning) console.warn(resolved.warning);
  return resolved;
}

/**
 * Resolves the acting participant: the Clerk user, or in `none` mode a guest
 * whose cookie this server signed. Every protected route handler calls this
 * itself; the proxy is defence in depth, never the only check. A user id
 * supplied by the client is never consulted.
 *
 * Never use this for admin checks: guests must not reach them. Those go
 * through isAdmin / requireAdmin, which read Clerk only.
 */
export async function requireUser(): Promise<string | null> {
  const { mode } = readAuthMode();
  const clerkUserId = mode === "invite" ? (await auth()).userId : null;
  const guestId =
    mode === "none"
      ? verifyGuest((await cookies()).get(GUEST_COOKIE)?.value, process.env.GUEST_COOKIE_SECRET)
      : null;
  const participant = resolveParticipant({ mode, clerkUserId, guestId });
  // A guest counts only once their name is saved: nobody acts unnamed. A
  // database outage fails closed too, since run and submit need it anyway.
  if (participant && !(await getGuestNames([participant]).catch(() => new Map())).has(participant)) return null;
  return participant;
}

/** The current guest's display name, or null for a Clerk user or nobody. */
export async function currentGuestName(): Promise<string | null> {
  const id = await requireUser();
  if (!id || !isGuestId(id)) return null;
  try {
    return (await getGuestNames([id])).get(id) ?? "Guest";
  } catch {
    return "Guest";
  }
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
