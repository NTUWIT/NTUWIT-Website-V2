/**
 * Runs the DSA-shape stress fixtures against a real judge and REPORTS what the
 * platform actually does. This is a documentation harness, not a pass/fail
 * gate: several of the behaviours it pins are known findings, not bugs to fail
 * on.
 *
 * Run: yarn check:dsa [language]
 */
import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import { matchesType } from "@/lib/problems/validate";
import { FIXTURES, MISTYPED_ARGS, MISTYPED_FIXTURE, type Fixture } from "./fixtures/dsa";

const only = process.argv[2] as Language | undefined;
const languages = only ? [only] : [...LANGUAGES];

const exec = (fixture: Fixture, language: Language, tests = fixture.tests) =>
  runTests({
    language,
    source: fixture.solutions[language]!,
    signature: fixture.signature,
    tests,
    revealActual: true,
    timeLimitMs: fixture.timeLimitMs ?? 5000,
    memoryLimitKb: fixture.memoryLimitKb ?? 131072,
  });

const short = (value: string | undefined, max = 60) =>
  value === undefined ? "" : value.length > max ? `${value.slice(0, max)}...` : value;

async function main() {
  for (const fixture of FIXTURES) {
    console.log(`\n${fixture.name}  [finding ${fixture.finding}]`);
    console.log(`  ${fixture.question}`);

    for (const language of languages) {
      if (!fixture.solutions[language]) continue;
      try {
        const result = await exec(fixture, language);
        const detail = result.outcomes
          .map((outcome) => {
            if (outcome.passed) return "ok";
            const actual = short(outcome.actual?.trim());
            return actual ? `${outcome.verdict}(${actual})` : outcome.verdict;
          })
          .join("  ");
        console.log(
          `    ${language.padEnd(11)} ${result.verdict.padEnd(20)} ` +
            `${result.passedCount}/${result.totalCount}  ${detail}`,
        );
      } catch (error) {
        console.log(
          `    ${language.padEnd(11)} JUDGE ERROR  ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  // Finding #7. Two layers, and they must be read together: the route now
  // rejects a mistyped argument before the judge sees it, and the judge-level
  // probe below shows what that guard is protecting participants from.
  console.log(`\n${MISTYPED_FIXTURE.name}  [finding ${MISTYPED_FIXTURE.finding}]`);
  console.log(`  ${MISTYPED_FIXTURE.question}`);
  console.log("\n  route guard (what a participant actually gets):");
  for (const { label, stdin } of MISTYPED_ARGS) {
    const parsed = JSON.parse(stdin) as unknown[];
    const rejected =
      !Array.isArray(parsed) ||
      parsed.length !== MISTYPED_FIXTURE.signature.params.length ||
      MISTYPED_FIXTURE.signature.params.some(
        (param, position) => !matchesType(parsed[position], param.type),
      );
    console.log(`    ${label.padEnd(30)} ${rejected ? "rejected as INVALID" : "PASSED THROUGH"}`);
  }

  console.log("\n  judge layer without the guard (what the guard prevents):");
  for (const language of languages) {
    for (const { label, stdin } of MISTYPED_ARGS) {
      try {
        const result = await exec(MISTYPED_FIXTURE, language, [
          { stdin, expectedStdout: "never-matches" },
        ]);
        const outcome = result.outcomes[0];
        const actual = short(outcome?.actual?.trim());
        // wrong_answer plus a clean numeric output means the positional reader
        // invented a value instead of reporting the mismatch.
        const silent = outcome?.verdict === "wrong_answer" && /^-?\d+$/.test(actual);
        console.log(
          `    ${language.padEnd(11)} ${label.padEnd(30)} ${(outcome?.verdict ?? "").padEnd(18)} ` +
            `${silent ? `SILENT GARBAGE -> ${actual}` : `output=${JSON.stringify(actual)}`}`,
        );
      } catch (error) {
        console.log(
          `    ${language.padEnd(11)} ${label.padEnd(30)} JUDGE ERROR ` +
            `${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  console.log("\ncheck-dsa: report complete (no assertions; this pins behaviour)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
