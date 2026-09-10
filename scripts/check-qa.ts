/**
 * Runs the QA matrix against a real judge and reports whether each solution got
 * the verdict its column promises.
 *
 * The point is not that solutions pass. It is that a *wrong* solution is
 * marked wrong, a *partial* one scores exactly the fraction it deserves, and
 * the edges (time, memory, recursion, integer width, unicode) behave the way
 * the documentation claims.
 *
 * Run: yarn check:qa [language]
 */
import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import { PROBES, QA, type Correctness } from "./fixtures/qa";

const ORDER: Correctness[] = ["correct", "partial", "wrong", "slow", "crash", "broken"];

const only = process.argv[2] as Language | undefined;
const languages = only ? [only] : [...LANGUAGES];
if (only && !LANGUAGES.includes(only)) {
  throw new Error(`unknown language "${only}"`);
}

let mismatches = 0;

async function main() {
  for (const problem of QA) {
    console.log(`\n${problem.slug}  (${problem.tests.length} tests)`);

    for (const level of ORDER) {
      const perLanguage = problem.solutions[level];
      if (!perLanguage) continue;
      const want = problem.expect[level];

      const cells: string[] = [];
      for (const language of languages) {
        const source = perLanguage[language];
        if (!source) {
          cells.push(`${language}: -`);
          continue;
        }
        const result = await runTests({
          language,
          source,
          signature: problem.signature,
          tests: problem.tests,
          revealActual: true,
          timeLimitMs: 5000,
          memoryLimitKb: 131072,
        });

        const verdictOk = !want || result.verdict === want.verdict;
        const countOk = !want || want.passed === undefined || result.passedCount === want.passed;
        if (!verdictOk || !countOk) mismatches += 1;

        cells.push(
          `${language}: ${result.passedCount}/${result.totalCount} ${result.verdict}` +
            (verdictOk && countOk ? "" : `  <-- expected ${want?.verdict}${want?.passed !== undefined ? ` ${want.passed}/${problem.tests.length}` : ""}`),
        );
      }

      const expectation = want
        ? `${want.verdict}${want.passed !== undefined ? ` ${want.passed}/${problem.tests.length}` : ""}`
        : "any";
      console.log(`  ${level.padEnd(8)} expect ${expectation}`);
      for (const cell of cells) console.log(`    ${cell}`);
    }
  }

  console.log("\n\nEdge probes (reported, not asserted: these pin behaviour)");
  for (const probe of PROBES) {
    console.log(`\n  ${probe.name}: ${probe.question}`);
    for (const language of languages) {
      const source = probe.solutions[language];
      if (!source) continue;
      try {
        const result = await runTests({
          language,
          source,
          signature: probe.signature,
          tests: probe.tests,
          revealActual: true,
          timeLimitMs: 5000,
          memoryLimitKb: 131072,
        });
        const detail = result.outcomes
          .map((outcome) =>
            outcome.passed ? "ok" : `${outcome.verdict}(${(outcome.actual ?? "").trim().slice(0, 28) || "no output"})`,
          )
          .join("  ");
        console.log(`    ${language.padEnd(11)} ${result.passedCount}/${result.totalCount}  ${detail}`);
      } catch (error) {
        console.log(`    ${language.padEnd(11)} JUDGE ERROR ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  console.log("");
  if (mismatches > 0) {
    console.log(`check-qa: ${mismatches} solution(s) did not get the verdict their column promises`);
    process.exit(1);
  }
  console.log("check-qa: every solution got the verdict its column promises");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
