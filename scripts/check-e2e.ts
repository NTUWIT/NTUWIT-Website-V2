/**
 * End-to-end judge check against a REAL Piston instance.
 *
 * This is the check a problem-setter runs before a new problem goes live: it
 * proves that a known-correct solution is accepted in every language, that a
 * known-wrong one is rejected with the right count, and that timeouts and build
 * failures are classified as themselves.
 *
 * Run: yarn check:e2e            (all problems, all languages)
 *      yarn check:e2e python     (one language, much faster)
 *
 * Needs PISTON_URL and PISTON_TOKEN. Never point this at an instance serving a
 * live event: it deliberately runs code that times out.
 */
import assert from "node:assert/strict";

import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import { SEED_PROBLEMS } from "@/lib/seed/problems";
import {
  BROKEN_SOLUTION,
  DEBUG_PRINT_SOLUTION,
  FD_BYPASS_SOLUTION,
  SOLUTIONS,
  TIMEOUT_SOLUTION,
} from "./fixtures/solutions";

const only = process.argv[2] as Language | undefined;
const languages = only ? [only] : [...LANGUAGES];
if (only && !LANGUAGES.includes(only)) {
  throw new Error(`unknown language "${only}"; expected one of ${LANGUAGES.join(", ")}`);
}

let failures = 0;
const findings: string[] = [];

const report = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
};

const run = (problem: (typeof SEED_PROBLEMS)[number], language: Language, source: string) =>
  runTests({
    language,
    source,
    signature: problem.signature,
    tests: problem.tests,
    revealActual: true,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitKb: problem.memoryLimitKb ?? 131072,
  });

/**
 * Piston rejects any run_timeout above its own configured cap with a 400, which
 * the platform reports as JUDGE_UNAVAILABLE for every submission. The cap is
 * server-side config, so raising a problem's timeLimitMs is not enough on its
 * own. This binary-searches the live cap and fails loudly if any problem asks
 * for more than the judge will allow.
 */
async function preflight() {
  const url = process.env.PISTON_URL;
  if (!url) throw new Error("PISTON_URL is not set");

  const probe = async (runTimeoutMs: number) => {
    const response = await fetch(`${url}/api/v2/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PISTON_TOKEN ? { "X-Piston-Token": process.env.PISTON_TOKEN } : {}),
      },
      body: JSON.stringify({
        language: "python",
        version: "3.12.0",
        files: [{ name: "main.py", content: "pass" }],
        run_timeout: runTimeoutMs,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    return response.ok;
  };

  const wanted = Math.max(...SEED_PROBLEMS.map((problem) => problem.timeLimitMs));
  const allowed = await probe(wanted);
  console.log(
    `preflight: longest problem asks for ${wanted}ms, judge ${allowed ? "allows it" : "REFUSES it"}`,
  );
  assert.ok(
    allowed,
    `the judge refuses a ${wanted}ms run_timeout. Raise PISTON_RUN_TIMEOUT in ` +
      `infra/piston/compose.yml and redeploy the judge, or lower the problem's ` +
      `timeLimitMs. Every submission returns JUDGE_UNAVAILABLE until this matches.`,
  );
}

async function main() {
  await preflight();

  for (const problem of SEED_PROBLEMS) {
    const set = SOLUTIONS[problem.slug];
    if (!set) {
      findings.push(`no reference solution written for "${problem.slug}"`);
      continue;
    }

    console.log(`\n${problem.slug} (${problem.tests.length} tests)`);

    for (const language of languages) {
      const correct = await run(problem, language, set.correct[language]);
      report(
        `${language} correct`,
        correct.verdict === "accepted" && correct.passedCount === problem.tests.length,
        `${correct.verdict} ${correct.passedCount}/${correct.totalCount} ${correct.runtimeMs}ms`,
      );
      if (correct.verdict !== "accepted") {
        // A reference solution failing means the PROBLEM is broken, not the code.
        const failed = correct.outcomes.find((outcome) => !outcome.passed);
        findings.push(
          `${problem.slug}/${language}: reference solution failed on test ` +
            `${(failed?.index ?? 0) + 1} with ${failed?.verdict}. ` +
            `actual=${JSON.stringify(failed?.actual)} stderr=${JSON.stringify(failed?.stderr?.slice(0, 200))}`,
        );
      }

      const wrong = await run(problem, language, set.wrong[language]);
      report(
        `${language} wrong`,
        wrong.verdict === "wrong_answer",
        `${wrong.verdict} ${wrong.passedCount}/${wrong.totalCount}`,
      );
    }
  }

  // Timeout, build failure, and runtime failure, on one problem only: these are
  // language behaviours, not problem behaviours, and a timeout costs real seconds.
  const first = SEED_PROBLEMS[0]!;
  console.log(`\nfailure modes (${first.slug})`);

  for (const language of languages) {
    const timeout = await run(first, language, TIMEOUT_SOLUTION[first.slug]![language]);
    report(
      `${language} infinite loop`,
      timeout.verdict === "time_limit_exceeded",
      timeout.verdict,
    );

    const broken = await run(first, language, BROKEN_SOLUTION[language]);
    const expected = language === "cpp" || language === "java" ? "compile_error" : "runtime_error";
    report(`${language} broken source`, broken.verdict === expected, `${broken.verdict} (want ${expected})`);
  }

  // FINDING #5: debugging output from inside the function must not corrupt the
  // compared answer. The harness redirects the language-level stdout object.
  console.log("\ndebug output (finding #5)");
  for (const language of languages) {
    const debug = await run(first, language, DEBUG_PRINT_SOLUTION[language]);
    report(
      `${language} print inside function`,
      debug.verdict === "accepted",
      debug.verdict === "accepted" ? "captured" : `${debug.verdict} CORRUPTS THE ANSWER`,
    );
    if (debug.verdict !== "accepted") {
      findings.push(
        `${language}: a participant debugging with a normal print statement gets ` +
          `${debug.verdict} instead of a verdict on their logic`,
      );
    }
  }

  // FINDING #5, second half: raw file-descriptor writes bypass the language
  // level redirect. This is a probe that pins behaviour; it asserts nothing.
  console.log("\nfd-bypass probe (finding #5, probe only)");
  for (const language of languages) {
    const source = FD_BYPASS_SOLUTION[language];
    if (!source) continue;
    const probe = await run(first, language, source);
    const leaked = probe.verdict !== "accepted";
    console.log(
      `  ${leaked ? "LEAKS" : "contained"}  ${language} raw fd write  ${probe.verdict}`,
    );
    if (leaked) {
      findings.push(
        `${language}: a raw write to fd 1 (os.write / printf / FileDescriptor.out) ` +
          `bypasses the harness stdout capture and corrupts the scored output ` +
          `(verdict ${probe.verdict})`,
      );
    }
  }

  console.log("");
  if (findings.length > 0) {
    console.log("findings:");
    for (const finding of findings) console.log(`  - ${finding}`);
    console.log("");
  }

  assert.equal(failures, 0, `${failures} end-to-end assertion(s) failed`);
  console.log("check-e2e: all assertions passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
