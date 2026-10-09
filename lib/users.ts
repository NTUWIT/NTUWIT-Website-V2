import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { isGuestId } from "@/lib/auth-mode";
import { getGuestNames } from "@/lib/auth-store";

/**
 * Display names for leaderboard rows. Clerk holds account names and Redis
 * holds guest names. They are fetched per render rather than
 * denormalised into scores: the leaderboard is capped at 100 rows and cached,
 * so this is one query and one API call.
 */
export async function displayNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;

  // Guests (auth mode `none`) live in Redis; Clerk has never heard of them. Each source fails on its own so one outage cannot blank the other.
  const guestIds = userIds.filter(isGuestId);
  const clerkIds = userIds.filter((id) => !isGuestId(id));

  try {
    for (const [id, name] of await getGuestNames(guestIds)) names.set(id, name);
  } catch {
    // Falls back below, like a Clerk outage.
  }

  if (clerkIds.length === 0) return names;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: clerkIds,
      limit: clerkIds.length,
    });

    for (const user of data) {
      const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      names.set(
        user.id,
        full || user.username || user.emailAddresses[0]?.emailAddress || "Anonymous",
      );
    }
  } catch {
    // A Clerk outage must not blank the leaderboard; callers fall back below.
  }

  return names;
}
