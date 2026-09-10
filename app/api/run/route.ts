import { JudgeError, fail, ok } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { getProblemById, getSampleTests, getSessionWindow,
  isProblemLive } from "@/lib/db/queries";
import { matchesType } from "@/lib/problems/validate";
import { runTests } from "@/lib/judge/runner";
import { isSessionOpen } from "@/lib/session";
import { withinLimit } from "@/lib/ratelimit";
import { parseBody } from "@/lib/validation";

// Samples only (2-3 tests), but java still costs ~1.85s each.
export const maxDuration = 30;

export async function POST(request: Request) {
  // Authenticate, validate, rate limit, delegate, serialise. No logic here.
  const userId = await requireUser();
  if (!userId) return fail("UNAUTHENTICATED");

  const input = await parseBody(request);
  if (!input) return fail("INVALID");

  // Before any judge call or database read.
  const success = await withinLimit("run", userId);
  if (!success) return fail("RATE_LIMITED");

  // Limits and tests come from the database, never from the request body.
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

  const samples = await getSampleTests(problem.id);
  if (samples.length === 0) return fail("NOT_FOUND");

  // A custom case is the participant's own input: it is executed and shown,
  // never compared or scored. It must still be well-formed before it reaches
  // the judge.
  const expectedArity = problem.signature.params.length;
  let custom: { stdin: string; expectedStdout: string } | null = null;
  if (input.customArgs?.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.customArgs);
    } catch {
      return fail("INVALID");
    }
    if (!Array.isArray(parsed) || parsed.length !== expectedArity) return fail("INVALID");
    // Arity alone is not enough. Python and JavaScript will happily accept a
    // wrong-typed argument and compute something from it (`true * 2` is 2,
    // `null * 2` is 0, a string doubles by concatenation), so the participant
    // gets a confident answer derived from input they did not mean. Checking
    // the declared type here is what makes custom input honest.
    const mistyped = problem.signature.params.some(
      (param, position) => !matchesType(parsed[position], param.type),
    );
    if (mistyped) return fail("INVALID");
    custom = { stdin: JSON.stringify(parsed), expectedStdout: "\u0000never-matches" };
  }

  const tests = custom ? [...samples, custom] : samples;

  try {
    const result = await runTests({
      language: input.language,
      source: input.source,
      signature: problem.signature,
      tests,
      // Sample tests only, so actual output is safe to return.
      revealActual: true,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });

    // The custom case is not compared, so it must not colour the overall
    // verdict: that reflects the sample tests alone.
    const sampleOutcomes = result.outcomes.filter((o) => o.index < samples.length);
    const firstFailure = sampleOutcomes.find((o) => !o.passed);

    return ok({
      verdict: firstFailure?.verdict ?? "accepted",
      passedCount: sampleOutcomes.filter((o) => o.passed).length,
      totalCount: samples.length,
      runtimeMs: result.runtimeMs,
      tests: result.outcomes.map((outcome) => ({
        index: outcome.index,
        // The custom case has no expected value, so pass/fail is meaningless.
        isCustom: custom !== null && outcome.index === tests.length - 1,
        passed: outcome.passed,
        verdict: outcome.verdict,
        stdin: tests[outcome.index]?.stdin ?? "",
        expected:
          custom !== null && outcome.index === tests.length - 1
            ? ""
            : (tests[outcome.index]?.expectedStdout ?? ""),
        actual: outcome.actual ?? "",
        // Samples are public, so the crash message is safe to show and is the
        // only way a participant can debug a runtime error.
        stderr: outcome.stderr ?? "",
      })),
    });
  } catch (error) {
    // Never surface the underlying message: it can carry stack paths.
    if (error instanceof JudgeError) return fail("JUDGE_UNAVAILABLE");
    return fail("INTERNAL");
  }
}
