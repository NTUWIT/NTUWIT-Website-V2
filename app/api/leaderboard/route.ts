import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/errors";
import { readLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  const userId = await requireUser();
  if (!userId) return fail("UNAUTHENTICATED");

  try {
    return ok({ leaderboard: await readLeaderboard() });
  } catch {
    return fail("INTERNAL");
  }
}
