import "server-only";

import { getLeaderboard } from "@/lib/db/queries";
import { redis } from "@/lib/ratelimit";

const CACHE_KEY = "leaderboard:v1";
const CACHE_SECONDS = 10;

export type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];

/**
 * Cached briefly so a lecture hall refreshing at once does not hit the database
 * on every request. Cache failures, including a missing Upstash configuration,
 * fall through to a live query rather than failing the page.
 */
export async function readLeaderboard(): Promise<LeaderboardRow[]> {
  const cached = await redis()
    .get<LeaderboardRow[]>(CACHE_KEY)
    .catch(() => null);
  if (cached) return cached;

  const rows = await getLeaderboard();
  await redis()
    .set(CACHE_KEY, rows, { ex: CACHE_SECONDS })
    .catch(() => {});
  return rows;
}
