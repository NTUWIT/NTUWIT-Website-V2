// Pure-logic checks against the real modules (no mirrors, no network).
// Run: yarn test
import assert from "node:assert/strict";

import { normaliseOutput, outputMatches } from "@/lib/judge/normalise";
import { classify } from "@/lib/judge/runner";
import type { ExecResult } from "@/lib/judge/piston";
import { wrapSource } from "@/lib/judge/harness";
import { starterFor } from "@/lib/problems/starter";
import { PARAM_TYPES, type ParamType, type Signature } from "@/lib/problems/signature";
import { LANGUAGES } from "@/lib/languages";
import { expectedForm, matchesType } from "@/lib/problems/validate";

/* ---------- normaliseOutput / outputMatches ---------- */

assert.equal(normaliseOutput("a  \n b\t\n\n\n"), "a\n b", "trailing ws and newlines stripped");
assert.equal(normaliseOutput(""), "", "empty stays empty");
assert.equal(normaliseOutput("\n\n\n"), "", "newline-only collapses to empty");
assert.equal(normaliseOutput("   "), "", "space-only line collapses to empty");
assert.equal(normaliseOutput("\t\t"), "", "tab-only line collapses to empty");

assert.ok(outputMatches("", ""), "empty matches empty");
assert.ok(outputMatches("\n", ""), "sole newline matches empty expected");
assert.ok(outputMatches("   \n", ""), "whitespace-only matches empty expected");
assert.ok(!outputMatches("0", ""), "zero must not match empty");
assert.ok(!outputMatches("", "0"), "empty must not match zero");

// Unicode is compared by code point; nothing is folded or normalised.
assert.ok(outputMatches("café\n", "café"), "unicode passes through");
assert.ok(outputMatches("日本語", "日本語"), "CJK passes through");
assert.ok(outputMatches("🙂", "🙂"), "astral plane passes through");
assert.ok(!outputMatches("cafe", "café"), "accent is significant");
// Decomposed vs precomposed are different strings and are NOT unicode-normalised.
// Pinning today's behaviour: a problem author must store one form consistently.
assert.ok(!outputMatches("café", "café"), "NFD and NFC do not match (documented)");

// Interior tabs and spaces are significant; only *trailing* runs are stripped.
assert.ok(!outputMatches("a\tb", "a b"), "interior tab is not a space");
assert.ok(outputMatches("a b \t \n", "a b"), "mixed trailing tabs and spaces stripped");
assert.ok(!outputMatches(" a", "a"), "leading whitespace is significant");

/* ---------- classify(): every ExecResult shape ---------- */

const exec = (over: Partial<ExecResult>): ExecResult => ({
  stdout: "",
  stderr: "",
  exitCode: 0,
  signal: null,
  compileError: null,
  ...over,
});

assert.equal(classify(exec({ stdout: "42\n" }), "42"), "accepted");
assert.equal(classify(exec({ stdout: "41" }), "42"), "wrong_answer");
assert.equal(classify(exec({ compileError: "error: expected ';'" }), "42"), "compile_error");
// A compile error outranks everything, even a matching stdout.
assert.equal(classify(exec({ compileError: "boom", stdout: "42" }), "42"), "compile_error");
assert.equal(classify(exec({ exitCode: 1, stderr: "Traceback" }), "42"), "runtime_error");
assert.equal(classify(exec({ exitCode: null }), "42"), "runtime_error");

// FINDING #2, pinned deliberately rather than fixed: Piston reports a signal for
// a wall-clock timeout, an OOM kill, and a segfault alike, and all three are
// reported to the participant as "time limit exceeded". There is no
// memory_limit_exceeded verdict in the Verdict union.
assert.equal(classify(exec({ signal: "SIGKILL" }), "42"), "time_limit_exceeded");
assert.equal(
  classify(exec({ signal: "SIGSEGV", stderr: "stack overflow" }), "42"),
  "time_limit_exceeded",
  "FINDING #2: a segfault is reported as a timeout",
);
assert.equal(
  classify(exec({ signal: "SIGKILL", exitCode: null, stderr: "std::bad_alloc" }), "42"),
  "time_limit_exceeded",
  "FINDING #2: an OOM kill is reported as a timeout",
);
// A signal outranks a matching stdout: partial output before the kill never passes.
assert.equal(classify(exec({ signal: "SIGKILL", stdout: "42" }), "42"), "time_limit_exceeded");

// A JVM naming a throwable on stderr crashed; it did not run out of time, even
// when the kernel then killed it. Fixed after check-dsa showed a Java stack
// overflow being reported to participants as a timeout.
assert.equal(
  classify(exec({ signal: "SIGKILL", stderr: "Exception in thread \"main\" java.lang.StackOverflowError" }), "42"),
  "runtime_error",
  "a Java stack overflow is a crash, not a timeout",
);
assert.equal(
  classify(exec({ signal: "SIGKILL", stderr: "java.lang.OutOfMemoryError: Java heap space" }), "42"),
  "runtime_error",
  "a Java OOM is a crash, not a timeout",
);
// A genuine timeout still reads as one: the stderr rule must not swallow it.
assert.equal(
  classify(exec({ signal: "SIGKILL", stderr: "" }), "42"),
  "time_limit_exceeded",
  "a plain signal kill is still a timeout",
);
// And a crash message must not outrank a real compile failure.
assert.equal(
  classify(exec({ compileError: "nope", stderr: "StackOverflowError" }), "42"),
  "compile_error",
);

/* ---------- custom-input type checking (finding 7) ---------- */

// Python and JavaScript accept a wrong-typed argument and compute something
// from it, so the route has to reject it before the judge ever sees it.
assert.ok(matchesType(3, "int"));
assert.ok(!matchesType(3.5, "int"), "a float is not an int");
assert.ok(!matchesType(true, "int"), "a bool is not an int (it becomes 2)");
assert.ok(!matchesType(null, "int"), "null is not an int (it becomes 0)");
assert.ok(!matchesType("7", "int"), "a numeric string is not an int");
assert.ok(!matchesType([1, 2, 3], "int"), "an array is not an int");
assert.ok(!matchesType({ n: 1 }, "int"), "an object is not an int");
assert.ok(matchesType(3.5, "double") && matchesType(3, "double"));
assert.ok(!matchesType(Number.NaN, "double") && !matchesType(Infinity, "double"));
assert.ok(matchesType([[1], [2, 3]], "int[][]"));
assert.ok(!matchesType([[1], ["x"]], "int[][]"));
assert.ok(matchesType([], "string[]"), "an empty array satisfies any array type");

/* ---------- expected-output form (the problem-author trap) ---------- */

// A string answer is printed JSON-quoted. Storing it raw fails every solution.
assert.equal(expectedForm("world hello", "string"), '"world hello"');
assert.equal(expectedForm(true, "bool"), "true");
assert.equal(expectedForm(2.5, "double"), "2.500000");
assert.equal(expectedForm([1, 2], "int[]"), "[1,2]");

/* ---------- harness generation: every ParamType, every language ---------- */

const MARKER = "USER_CODE_MARKER";

const sigOf = (params: ParamType[], returns: ParamType): Signature => ({
  name: "probe_fn",
  params: params.map((type, i) => ({ name: `p${i}`, type })),
  returns,
});

for (const type of PARAM_TYPES) {
  for (const language of LANGUAGES) {
    // Each type must survive both as an argument and as a return value.
    for (const sig of [sigOf([type], "int"), sigOf(["int"], type)]) {
      const wrapped = wrapSource({ language, source: MARKER, signature: sig });
      assert.ok(
        wrapped.includes(MARKER),
        `${language}/${type}: participant source must be embedded verbatim`,
      );
      assert.ok(
        wrapped.length > MARKER.length + 40,
        `${language}/${type}: harness must actually wrap something`,
      );
      assert.ok(
        !wrapped.includes("undefined") && !wrapped.includes("[object Object]"),
        `${language}/${type}: generated code must not contain a stringify accident`,
      );
    }

    // Starter code is what the participant first sees; it must name the function.
    const starter = starterFor(language, sigOf([type], type));
    assert.ok(starter.trim().length > 0, `${language}/${type}: starter must not be empty`);
    assert.ok(
      starter.includes("probe_fn") || starter.includes("probeFn"),
      `${language}/${type}: starter must declare the required function name`,
    );
  }
}

/* ---------- argument-count boundaries (C++/Java separator logic) ---------- */

for (const count of [0, 1, 2, 5, 8]) {
  const sig = sigOf(Array.from({ length: count }, () => "int" as ParamType), "int");
  for (const language of LANGUAGES) {
    const wrapped = wrapSource({ language, source: MARKER, signature: sig });
    assert.ok(wrapped.includes(MARKER), `${language}: ${count} params must wrap`);

    if (language === "cpp" || language === "java") {
      // The hand-rolled JSON readers eat one separator between arguments and
      // none before the first, so the count is exactly one less than the arity.
      const eats = (wrapped.match(/__eat\(','\)|eat\(','\)/g) ?? []).length;
      assert.equal(
        eats,
        Math.max(0, count - 1),
        `${language}: ${count} params must emit ${Math.max(0, count - 1)} separator reads`,
      );
    }
  }
}

// A zero-parameter signature is legal and must still produce a callable program.
for (const language of LANGUAGES) {
  const wrapped = wrapSource({ language, source: MARKER, signature: sigOf([], "int") });
  assert.ok(wrapped.includes(MARKER), `${language}: zero-param harness must wrap`);
}

console.log("check-units: all assertions passed");
