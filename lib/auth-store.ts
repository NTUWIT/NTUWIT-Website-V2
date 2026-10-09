import "server-only";

import { redis } from "@/lib/ratelimit";

/**
 * Guest display names (auth mode `none`), kept in Redis rather than Postgres
 * so the fallback needs no schema change. Clerk has never heard of guests.
 */

const GUESTS_KEY = "auth:guests";

export async function saveGuestName(id: string, name: string) {
  await redis().hset(GUESTS_KEY, { [id]: name });
}

/** Names for the given guest ids; missing ids are simply absent. */
export async function getGuestNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const found = await redis().hmget<Record<string, string>>(GUESTS_KEY, ...ids);
  for (const [id, name] of Object.entries(found ?? {})) {
    if (typeof name === "string") names.set(id, name);
  }
  return names;
}
