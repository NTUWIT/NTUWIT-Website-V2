import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Built on first use, for the same reason as the database client: `next build`
 * imports route modules to read their config, and `Redis.fromEnv()` throws at
 * module scope when the build machine has no Upstash credentials.
 */

/**
 * Limits are keyed by Clerk user id, never by IP: an NTU lecture hall shares
 * egress addresses, so an IP-keyed limit would throttle the whole room at once.
 */
const LIMITS = {
  run: { limit: 10, window: "1 m" },
  submit: { limit: 5, window: "1 m" },
} as const;

export type LimitName = keyof typeof LIMITS;

let client: Redis | null = null;

/** The shared Upstash client, created on first use. */
export function redis(): Redis {
  client ??= Redis.fromEnv();
  return client;
}

const limiters = new Map<LimitName, Ratelimit>();

function limiterFor(name: LimitName): Ratelimit {
  const existing = limiters.get(name);
  if (existing) return existing;

  const { limit, window } = LIMITS[name];
  const created = new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${name}`,
    analytics: false,
  });
  limiters.set(name, created);
  return created;
}

/**
 * Upstash's free tier has no SLA, and an unguarded `limit()` call throws
 * straight past the route's error mapping into Next's default error response.
 * A participant would see an untyped 500 instead of the app's error contract.
 *
 * Fails open on purpose: during an event the limiter protects the judge from
 * accidental hammering, not from an attacker, so a brief Upstash outage should
 * not stop anybody submitting.
 */
export async function withinLimit(name: LimitName, userId: string): Promise<boolean> {
  try {
    const { success } = await limiterFor(name).limit(userId);
    return success;
  } catch {
    return true;
  }
}
