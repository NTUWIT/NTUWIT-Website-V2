import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

/**
 * Display names for leaderboard rows. Clerk is the only place names live, so
 * they are fetched per render rather than denormalised into our tables, the
 * leaderboard is capped at 100 rows and cached, so this is one API call.
 */
export async function displayNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;

  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: userIds,
      limit: userIds.length,
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
