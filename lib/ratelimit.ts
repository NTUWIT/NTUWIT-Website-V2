import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

// Keyed by Clerk user id, never by IP: an NTU lecture hall shares egress
// addresses, so IP-keyed limits would throttle the whole room at once.
export const runLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:run",
  analytics: false,
});

export const submitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:submit",
  analytics: false,
});

/**
 * Upstash's free tier has no SLA, and an unguarded `limit()` call throws
 * straight past the route's error mapping into Next's default error response.
 * A participant would see an untyped 500 instead of the app's error contract.
 *
 * Fails open on purpose: during an event the limiter protects the judge from
 * accidental hammering, not from an attacker, so a brief Upstash outage should
 * not stop anybody submitting.
 */
export async function withinLimit(
  limiter: Ratelimit,
  userId: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(userId);
    return success;
  } catch {
    return true;
  }
}
