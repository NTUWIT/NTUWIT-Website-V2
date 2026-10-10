import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { isGuestId } from "@/lib/auth-mode";
import { getGuestNames } from "@/lib/db/queries";

export type Participant = { name: string; account: string };

/** Clerk's getUserList caps a page; 100 keeps each call well inside it. */
const CLERK_PAGE = 100;

/**
 * Who each id is. Clerk holds account names and emails; the `guests` table
 * holds guest names (AUTH_MODE_OVERRIDE=none). Fetched per render rather than
 * denormalised, so a renamed account shows its current name.
 *
 * Each source fails on its own, so one outage cannot blank the other. An id
 * neither source knows is simply absent; callers decide how to show it.
 */
export async function describeParticipants(userIds: string[]): Promise<Map<string, Participant>> {
  const people = new Map<string, Participant>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return people;

  const guestIds = ids.filter(isGuestId);
  const clerkIds = ids.filter((id) => !isGuestId(id));

  try {
    for (const [id, name] of await getGuestNames(guestIds)) {
      people.set(id, { name, account: "Guest, no account" });
    }
  } catch {
    // Falls back to the caller's placeholder, like a Clerk outage.
  }

  try {
    const client = await clerkClient();
    for (let start = 0; start < clerkIds.length; start += CLERK_PAGE) {
      const page = clerkIds.slice(start, start + CLERK_PAGE);
      const { data } = await client.users.getUserList({ userId: page, limit: page.length });
      for (const user of data) {
        const email =
          user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
        const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        people.set(user.id, { name: full || user.username || email || "Anonymous", account: email });
      }
    }
  } catch {
    // A Clerk outage must not blank the page; callers fall back.
  }

  return people;
}

/** Names only, for the leaderboard. */
export async function displayNames(userIds: string[]): Promise<Map<string, string>> {
  const people = await describeParticipants(userIds);
  return new Map([...people].map(([id, person]) => [id, person.name]));
}
