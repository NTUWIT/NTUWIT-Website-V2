import { JudgeError, fail, ok } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import {
  getAllTests,
  getProblemById,
  insertSubmission,
  upsertScore,
  getSessionWindow,
  isProblemLive,
} from "@/lib/db/queries";
import { runTests } from "@/lib/judge/runner";
import { isSessionOpen } from "@/lib/session";
import { withinLimit } from "@/lib/ratelimit";
import { parseBody } from "@/lib/validation";

// Partial credit means every test runs, and java costs ~1.85s per test on the
// current judge, 10 tests is ~18.5s, well past the platform's 10s default.
// Measured 2026-09-05; see design.md.
export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await requireUser();
  if (!userId) return fail("UNAUTHENTICATED");

  const input = await parseBody(request);
  if (!input) return fail("INVALID");

  const success = await withinLimit("submit", userId);
  if (!success) return fail("RATE_LIMITED");

  const problem = await getProblemById(input.problemId);
  if (!problem) return fail("NOT_FOUND");

  // A problem outside the active selection is treated as if it does not exist.
  // The client cannot be trusted to stop asking: a tab left open from an
  // earlier set, or a hand-made request, both arrive here looking legitimate.
  if (!(await isProblemLive(problem.id))) return fail("NOT_FOUND");

  // The session window is enforced here and nowhere else that matters. A tab
  // left open past the end, a replayed request, or a clock skewed on the
  // participant's laptop all arrive looking ordinary; only the server's own
  // reading of the window decides. No exceptions.
  if (!isSessionOpen(await getSessionWindow())) return fail("SESSION_CLOSED");

  const tests = await getAllTests(problem.id);
  if (tests.length === 0) return fail("NOT_FOUND");

  let result;
  try {
    result = await runTests({
      language: input.language,
      source: input.source,
      signature: problem.signature,
      tests,
      // Hidden tests are in play, so actual output must not be captured.
      revealActual: false,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });
  } catch (error) {
    if (error instanceof JudgeError) return fail("JUDGE_UNAVAILABLE");
    return fail("INTERNAL");
  }

  const accepted = result.verdict === "accepted";
  // Partial credit: points scale with the fraction of tests passed.
  const score = accepted
    ? problem.points
    : Math.round((problem.points * result.passedCount) / result.totalCount);
  const firstFailure = result.outcomes.find((outcome) => !outcome.passed);

  await insertSubmission({
    userId,
    problemId: problem.id,
    language: input.language,
    source: input.source,
    status: result.verdict,
    runtimeMs: result.runtimeMs,
    passedCount: result.passedCount,
    totalCount: result.totalCount,
    score,
  });

  if (score > 0) {
    // Single-statement upsert: replays cannot inflate the total, and a worse
    // later attempt cannot lower a best score.
    await upsertScore({ userId, problemId: problem.id, score });
  }

  // Only the failing test's index is reported, never its input or expected
  // output, which would leak hidden test data.
  return ok({
    verdict: result.verdict,
    passedCount: result.passedCount,
    totalCount: result.totalCount,
    runtimeMs: result.runtimeMs,
    failedAt: firstFailure ? firstFailure.index + 1 : null,
    score,
  });
}
