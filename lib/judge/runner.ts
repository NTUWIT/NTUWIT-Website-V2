import "server-only";

import { JudgeError } from "@/lib/errors";
import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import { execute, type ExecResult } from "./piston";
import { wrapSource } from "./harness";
import { outputMatches } from "./normalise";

export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error";

export type TestOutcome = {
  index: number;
  passed: boolean;
  verdict: Verdict;
  /** Populated for sample tests only; never for hidden tests. */
  actual?: string;
  /** Sample tests only. Crash messages are how a participant debugs. */
  stderr?: string;
};

export type RunResult = {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  outcomes: TestOutcome[];
};

type Limits = { timeLimitMs: number; memoryLimitKb: number };

type Test = { stdin: string; expectedStdout: string };

/**
 * Exported for `scripts/check-units.ts`: this is the whole verdict decision,
 * and it is worth pinning against every shape Piston can return.
 */
/**
 * A JVM that dies on a StackOverflowError or an OutOfMemoryError names the
 * throwable on stderr and may then be killed by a signal. Reading the signal
 * alone would tell a participant they were too slow when in fact their
 * recursion ran out of stack, which is the opposite of a useful hint.
 */
const CRASH_ON_STDERR = /\b(StackOverflowError|OutOfMemoryError)\b/;

export function classify(result: ExecResult, expected: string, unordered = false): Verdict {
  if (result.compileError !== null) return "compile_error";
  if (CRASH_ON_STDERR.test(result.stderr)) return "runtime_error";
  // Piston reports a signal (SIGKILL) when the run timeout is hit.
  if (result.signal !== null) return "time_limit_exceeded";
  if (result.exitCode !== 0) return "runtime_error";
  return outputMatches(result.stdout, expected, unordered) ? "accepted" : "wrong_answer";
}

/**
 * Runs every test so `passedCount` is a true count, partial credit needs it.
 * A compile error is the one early exit: nothing after it can behave
 * differently. Transport-agnostic by design: if execution has to move off the
 * platform to escape the function timeout, only `execute` changes.
 *
 * `revealActual` must be true only for sample tests, hidden test output must
 * never reach a client.
 */
export async function runTests(
  args: {
    language: Language;
    source: string;
    signature: Signature;
    tests: Test[];
    revealActual: boolean;
  } & Limits,
): Promise<RunResult> {
  // Participants submit a function; the harness supplies the surrounding
  // program that reads arguments and prints the return value.
  const source = wrapSource({
    language: args.language,
    source: args.source,
    signature: args.signature,
  });
  const outcomes: TestOutcome[] = [];
  let passedCount = 0;
  let runtimeMs = 0;
  let firstFailure: Verdict | null = null;

  for (const [index, test] of args.tests.entries()) {
    const startedAt = performance.now();
    let result: ExecResult;
    try {
      result = await execute({
        language: args.language,
        source,
        stdin: test.stdin,
        timeLimitMs: args.timeLimitMs,
        memoryLimitKb: args.memoryLimitKb,
      });
    } catch (error) {
      if (error instanceof JudgeError) throw error;
      throw new JudgeError("execution failed");
    }
    runtimeMs += Math.round(performance.now() - startedAt);

    const verdict = classify(result, test.expectedStdout, args.signature.unordered);
    const passed = verdict === "accepted";
    outcomes.push({
      index,
      passed,
      verdict,
      ...(args.revealActual
        ? { actual: result.stdout, stderr: result.compileError ?? result.stderr }
        : {}),
    });

    if (passed) passedCount += 1;
    else if (firstFailure === null) firstFailure = verdict;

    // The source cannot compile, so every remaining test would fail the same
    // way. Skipping them keeps a broken submission cheap.
    if (verdict === "compile_error") break;
  }

  return {
    verdict: firstFailure ?? "accepted",
    passedCount,
    totalCount: args.tests.length,
    runtimeMs,
    outcomes,
  };
}
