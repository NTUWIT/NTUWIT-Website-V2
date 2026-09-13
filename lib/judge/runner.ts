import "server-only";

import { JudgeError } from "@/lib/errors";
import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import { execute, type ExecResult } from "./piston";
import { wrapSource } from "./harness";
import { MAX_OUTPUT_BYTES, MAX_STDIN_BYTES } from "./limits";
import { matchOptions, outputMatches, type MatchOptions } from "./normalise";

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

/** Piston's message when a run printed past PISTON_OUTPUT_MAX_SIZE. */
const OUTPUT_LIMIT = /length exceeded/;

export function classify(result: ExecResult, expected: string, match: MatchOptions | boolean = {}): Verdict {
  if (result.compileError !== null) return "compile_error";
  if (CRASH_ON_STDERR.test(result.stderr)) return "runtime_error";
  // Piston kills a run that prints too much with a signal. Read as a signal it
  // would report a time limit, which sends the participant looking for a slow
  // loop that does not exist.
  if (result.message && OUTPUT_LIMIT.test(result.message)) return "runtime_error";
  // Piston reports a signal (SIGKILL) when the run timeout is hit.
  if (result.signal !== null) return "time_limit_exceeded";
  if (result.exitCode !== 0) return "runtime_error";
  return outputMatches(result.stdout, expected, match) ? "accepted" : "wrong_answer";
}

/** The run finished normally, so its output is an answer worth checking. */
const ranCleanly = (r: ExecResult) =>
  r.compileError === null &&
  !CRASH_ON_STDERR.test(r.stderr) &&
  !(r.message && OUTPUT_LIMIT.test(r.message)) &&
  r.signal === null &&
  r.exitCode === 0;

/**
 * A problem with many right answers is judged by its author's Python
 * `check(args, expected, actual)`, run in the judge's sandbox rather than on
 * this server. A check that raises counts as a wrong answer: it is usually a
 * malformed answer tripping it up.
 */
const checkerProgram = (checker: string) => `import json, sys

${checker}

cases = json.loads(sys.stdin.read())
verdicts = []
for case in cases:
    try:
        verdicts.append(bool(check(case["args"], case["expected"], case["actual"])))
    except Exception:
        verdicts.append(False)
print(json.dumps(verdicts))
`;

type CheckCase = { args: unknown; expected: unknown; actual: unknown };

/**
 * All of a submission's answers go to the checker in as few runs as the
 * judge's input limit allows, usually one, rather than one run per test.
 */
async function runChecker(checker: string, cases: CheckCase[]): Promise<boolean[]> {
  const verdicts: boolean[] = [];
  let batch: CheckCase[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    const result = await execute({
      language: "python",
      source: checkerProgram(checker),
      stdin: JSON.stringify(batch),
      timeLimitMs: 5000,
      memoryLimitKb: 262144,
    });
    let parsed: unknown;
    try {
      parsed = ranCleanly(result) ? JSON.parse(result.stdout) : null;
    } catch {
      parsed = null;
    }
    // A checker that cannot run is the problem's fault, not the participant's.
    if (!Array.isArray(parsed) || parsed.length !== batch.length) throw new JudgeError("checker failed");
    verdicts.push(...parsed.map(Boolean));
    batch = [];
  };
  for (const c of cases) {
    if (batch.length > 0 && JSON.stringify([...batch, c]).length > MAX_STDIN_BYTES) await flush();
    batch.push(c);
  }
  await flush();
  return verdicts;
}

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

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
  const match = matchOptions(args.signature);

  // Java's file must hold the harness's `public class Main`, so a participant
  // class of the same name cannot compile. Say so plainly rather than let
  // javac report a duplicate class that names neither cause nor fix.
  if (args.language === "java" && /\b(class|interface|enum|record)\s+Main\b/.test(args.source)) {
    const message =
      "Rename your class Main: the judge's own entry point is called Main. Put your code in class Solution (or your design class) and the judge will call it.";
    return {
      verdict: "compile_error",
      passedCount: 0,
      totalCount: args.tests.length,
      runtimeMs: 0,
      outcomes: args.tests.map((_, index) => ({
        index,
        passed: false,
        verdict: "compile_error" as const,
        ...(args.revealActual ? { actual: "", stderr: message } : {}),
      })),
    };
  }

  const checker = args.signature.checker;
  const runs: { result: ExecResult; verdict: Verdict }[] = [];
  const toCheck: { run: number; check: CheckCase }[] = [];
  let runtimeMs = 0;

  for (const test of args.tests) {
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

    let verdict = classify(result, test.expectedStdout, match);
    if (checker && ranCleanly(result)) {
      // The checker decides. An answer that is not even valid JSON, or a
      // custom case with no reference answer, cannot be checked and is wrong.
      const actual = parseJson(result.stdout.trim());
      const expected = parseJson(test.expectedStdout.trim());
      const testArgs = parseJson(test.stdin);
      verdict = "wrong_answer";
      if (actual.ok && expected.ok && testArgs.ok) {
        toCheck.push({ run: runs.length, check: { args: testArgs.value, expected: expected.value, actual: actual.value } });
      }
    }
    runs.push({ result, verdict });

    // The source cannot compile, so every remaining test would fail the same
    // way. Skipping them keeps a broken submission cheap.
    if (verdict === "compile_error") break;
  }

  if (checker && toCheck.length > 0) {
    const verdicts = await runChecker(checker, toCheck.map((c) => c.check));
    toCheck.forEach((c, i) => {
      runs[c.run]!.verdict = verdicts[i] ? "accepted" : "wrong_answer";
    });
  }

  const outcomes: TestOutcome[] = runs.map(({ result, verdict }, index) => ({
    index,
    passed: verdict === "accepted",
    verdict,
    ...(args.revealActual
      ? {
          actual: result.stdout,
          stderr:
            result.compileError ??
            (result.message && OUTPUT_LIMIT.test(result.message)
              ? `Your program printed more than the judge accepts (${MAX_OUTPUT_BYTES} bytes, answer and debug prints together), so it was stopped.`
              : result.stderr),
        }
      : {}),
  }));
  const passedCount = outcomes.filter((o) => o.passed).length;
  const firstFailure = outcomes.find((o) => !o.passed)?.verdict ?? null;

  return {
    verdict: firstFailure ?? "accepted",
    passedCount,
    totalCount: args.tests.length,
    runtimeMs,
    outcomes,
  };
}
