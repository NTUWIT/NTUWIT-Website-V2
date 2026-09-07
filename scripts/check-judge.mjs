// Runnable check for the judge's pure logic: output normalisation and
// partial-credit scoring. Run with: node scripts/check-judge.mjs
import assert from "node:assert/strict";

// Mirrors lib/judge/normalise.ts (kept dependency-free so this runs with plain node).
const normalise = (v) =>
  v
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
const matches = (a, b) => normalise(a) === normalise(b);

// Normalisation rules from the code-execution spec.
assert.ok(matches("42\n", "42"), "trailing newline must pass");
assert.ok(matches("42\n\n\n", "42"), "repeated trailing newlines must pass");
assert.ok(matches("1 2   \n3\t\n", "1 2\n3"), "trailing whitespace must pass");
assert.ok(matches("a\r\nb", "a\nb"), "CRLF must normalise to LF");
assert.ok(!matches("42", "43"), "content difference must fail");
assert.ok(!matches("1 2", "12"), "interior whitespace must be significant");
assert.ok(!matches("a\nb", "b\na"), "line order must be significant");

// Every test runs (partial credit needs a true passed count); a compile error
// is the only early exit.
function runAll(tests, run) {
  const executed = [];
  let passed = 0;
  let firstFailure = null;
  for (const [index, t] of tests.entries()) {
    const out = run(t);
    executed.push(t.in);
    if (out === "COMPILE_ERROR") {
      firstFailure ??= index;
      break;
    }
    if (matches(out, t.expected)) passed += 1;
    else firstFailure ??= index;
  }
  return { passed, total: tests.length, firstFailure, executed };
}

const tests = [
  { in: "a", expected: "a" },
  { in: "b", expected: "WRONG" },
  { in: "c", expected: "c" },
  { in: "d", expected: "WRONG" },
  { in: "e", expected: "e" },
];
const result = runAll(tests, (t) => t.in);

assert.equal(result.passed, 3, "passes after a failure are still counted");
assert.equal(result.total, 5, "total reflects every test");
assert.equal(result.firstFailure, 1, "first failure is the second test");
assert.deepEqual(
  result.executed,
  ["a", "b", "c", "d", "e"],
  "tests after a failure must still run",
);

const compile = runAll(tests, () => "COMPILE_ERROR");
assert.equal(compile.passed, 0, "a compile error passes nothing");
assert.deepEqual(compile.executed, ["a"], "a compile error stops after one test");

// Score = points * passed / total, rounded. Mirrors app/api/submit/route.ts.
const score = (points, passed, total) => Math.round((points * passed) / total);
assert.equal(score(100, 5, 5), 100, "all tests passed earns full points");
assert.equal(score(100, 0, 5), 0, "no tests passed earns nothing");
assert.equal(score(100, 3, 5), 60, "partial credit is proportional");
assert.equal(score(150, 1, 3), 50, "rounding stays inside the point total");
assert.ok(score(100, 4, 5) < score(100, 5, 5), "partial never beats a full solve");

console.log("check-judge: all assertions passed");
