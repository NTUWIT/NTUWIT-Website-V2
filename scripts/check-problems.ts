// Validates every seeded problem against its own signature. This is the check
// a problem-setter runs BEFORE a new problem goes live.
// Run: yarn test  (or yarn check:problems)
import assert from "node:assert/strict";

import { SEED_PROBLEMS } from "@/lib/seed/problems";
import { validateProblem } from "@/lib/problems/validate";

const found = SEED_PROBLEMS.flatMap((problem) => validateProblem(problem));

for (const line of found) console.error(`  ${line}`);
assert.equal(found.length, 0, `${found.length} problem(s) failed validation`);

// The validator has to actually catch things, so prove it on known-bad input.
const good = SEED_PROBLEMS[0]!;
const broken = [
  { ...good, slug: "bad-arity", tests: [{ ...good.tests[0]!, stdin: "[]" }] },
  { ...good, slug: "bad-json", tests: [{ ...good.tests[0]!, stdin: "not json" }] },
  { ...good, slug: "bad-type", tests: [{ ...good.tests[0]!, stdin: '["a string"]' }] },
  { ...good, slug: "bad-expected", tests: [{ ...good.tests[0]!, expectedStdout: "???" }] },
  { ...good, slug: "over-ceiling", timeLimitMs: 9000 },
  { ...good, slug: "no-samples", tests: good.tests.map((t) => ({ ...t, isSample: false })) },
];

// The easiest mistake a problem author can make: a string return stored raw
// instead of JSON-quoted, which fails every correct solution. Caught only after
// a real fixture made exactly this error and the validator waved it through.
const stringProblem = SEED_PROBLEMS.find((p) => p.signature.returns === "string");
if (stringProblem) {
  const raw = {
    ...stringProblem,
    slug: "unquoted-string-return",
    tests: stringProblem.tests.map((t) => ({
      ...t,
      expectedStdout: JSON.parse(t.expectedStdout) as string,
    })),
  };
  broken.push(raw);
}
for (const problem of broken) {
  assert.ok(
    validateProblem(problem).length > 0,
    `validator must reject ${problem.slug}`,
  );
}

console.log(
  `check-problems: ${SEED_PROBLEMS.length} problems valid, ${broken.length} bad shapes rejected`,
);
