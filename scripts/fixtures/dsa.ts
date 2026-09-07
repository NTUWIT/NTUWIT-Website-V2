/**
 * Throwaway fixture problems that stress the judge along the axes real DSA
 * questions will: recursion depth, memory, float accumulation, integer width,
 * and string escaping through the hand-rolled C++/Java readers.
 *
 * These are NOT event problems. They exist so `scripts/check-dsa.ts` can pin
 * what the judge actually does today, per findings #2, #3, #4 and #5.
 */
import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";

export type Fixture = {
  name: string;
  finding: string;
  question: string;
  signature: Signature;
  tests: { stdin: string; expectedStdout: string }[];
  timeLimitMs?: number;
  memoryLimitKb?: number;
  solutions: Partial<Record<Language, string>>;
};

const sig = (
  name: string,
  params: Signature["params"],
  returns: Signature["returns"],
): Signature => ({ name, params, returns });

export const FIXTURES: Fixture[] = [
  {
    name: "large-magnitude-recurrence",
    finding: "#4 cross-language integer width",
    question:
      "fib(90) is 2880067194370816120, past 2^53 but inside int64. Which languages return it exactly?",
    signature: sig("fib", [{ name: "n", type: "int" }], "int"),
    tests: [
      { stdin: "[10]", expectedStdout: "55" },
      { stdin: "[90]", expectedStdout: "2880067194370816120" },
    ],
    solutions: {
      python: `def fib(n: int) -> int:\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n`,
      javascript: `function fib(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n`,
      cpp: `long long fib(long long n) {\n    long long a = 0, b = 1;\n    for (long long i = 0; i < n; i++) { long long t = a + b; a = b; b = t; }\n    return a;\n}\n`,
      java: `class Solution {\n    static long fib(long n) {\n        long a = 0, b = 1;\n        for (long i = 0; i < n; i++) { long t = a + b; a = b; b = t; }\n        return a;\n    }\n}\n`,
    },
  },

  {
    name: "float-accumulating-dp",
    finding: "#3 float comparison is exact-string at 6 decimals",
    question:
      "The same expected-value recurrence in four languages: does the 6-decimal string ever diverge?",
    signature: sig("expected_value", [{ name: "n", type: "int" }], "double"),
    tests: [
      // Sum of 1/k for k in 1..n, accumulated in float order. Chosen because it
      // accumulates error steadily rather than catastrophically.
      { stdin: "[10]", expectedStdout: "2.928968" },
      { stdin: "[1000]", expectedStdout: "7.485471" },
    ],
    solutions: {
      python: `def expected_value(n: int) -> float:\n    total = 0.0\n    for k in range(1, n + 1):\n        total += 1.0 / k\n    return total\n`,
      javascript: `function expectedValue(n) {\n  let total = 0;\n  for (let k = 1; k <= n; k++) total += 1 / k;\n  return total;\n}\n`,
      cpp: `double expectedValue(long long n) {\n    double total = 0;\n    for (long long k = 1; k <= n; k++) total += 1.0 / (double)k;\n    return total;\n}\n`,
      java: `class Solution {\n    static double expectedValue(long n) {\n        double total = 0;\n        for (long k = 1; k <= n; k++) total += 1.0 / (double) k;\n        return total;\n    }\n}\n`,
    },
  },

  {
    name: "deep-unmemoized-recursion",
    finding: "#2 signal-killed processes all report as time_limit_exceeded",
    question:
      "A naive recursion deep enough to exhaust the call stack: what verdict does a participant see?",
    signature: sig("depth_sum", [{ name: "n", type: "int" }], "int"),
    tests: [{ stdin: "[200000]", expectedStdout: "20000100000" }],
    solutions: {
      python: `import sys\n\ndef depth_sum(n: int) -> int:\n    if n == 0:\n        return 0\n    return n + depth_sum(n - 1)\n`,
      javascript: `function depthSum(n) {\n  if (n === 0) return 0;\n  return n + depthSum(n - 1);\n}\n`,
      cpp: `long long depthSum(long long n) {\n    if (n == 0) return 0;\n    return n + depthSum(n - 1);\n}\n`,
      java: `class Solution {\n    static long depthSum(long n) {\n        if (n == 0) return 0;\n        return n + depthSum(n - 1);\n    }\n}\n`,
    },
  },

  {
    name: "memory-heavy-dp",
    finding: "#2 an OOM kill is indistinguishable from a timeout",
    question: "A DP table sized past the memory limit: what verdict does that produce?",
    signature: sig("table_sum", [{ name: "n", type: "int" }], "int"),
    tests: [{ stdin: "[20000]", expectedStdout: "0" }],
    memoryLimitKb: 65536,
    solutions: {
      python: `def table_sum(n: int) -> int:\n    table = [[0] * n for _ in range(n)]\n    return table[0][0]\n`,
      javascript: `function tableSum(n) {\n  const table = Array.from({ length: n }, () => new Array(n).fill(0));\n  return table[0][0];\n}\n`,
      cpp: `long long tableSum(long long n) {\n    std::vector<std::vector<long long>> table(n, std::vector<long long>(n, 0));\n    return table[0][0];\n}\n`,
      java: `class Solution {\n    static long tableSum(long n) {\n        int m = (int) n;\n        long[][] table = new long[m][m];\n        return table[0][0];\n    }\n}\n`,
    },
  },

  {
    name: "string-edge-cases",
    finding: "#5 hand-rolled C++/Java string reader and serialiser",
    question:
      "Quotes, backslashes, newlines, tabs and non-ASCII through __rd_str and __ser: do they survive a round trip?",
    signature: sig("echo_text", [{ name: "text", type: "string" }], "string"),
    tests: [
      // A string return is printed JSON-quoted, so the expectation is too.
      { stdin: '[""]', expectedStdout: '""' },
      { stdin: '["a\\"b"]', expectedStdout: '"a\\"b"' },
      { stdin: '["a\\\\b"]', expectedStdout: '"a\\\\b"' },
      { stdin: '["a\\nb"]', expectedStdout: '"a\\nb"' },
      { stdin: '["a\\tb"]', expectedStdout: '"a\\tb"' },
      { stdin: '["café 日本語 🙂"]', expectedStdout: '"café 日本語 🙂"' },
    ],
    solutions: {
      python: `def echo_text(text: str) -> str:\n    return text\n`,
      javascript: `function echoText(text) {\n  return text;\n}\n`,
      cpp: `std::string echoText(std::string text) {\n    return text;\n}\n`,
      java: `class Solution {\n    static String echoText(String text) {\n        return text;\n    }\n}\n`,
    },
  },

  {
    name: "loop-at-the-time-boundary",
    finding: "timing fairness",
    question:
      "Two loops either side of the time limit for the same problem: is the signal clean or flaky?",
    signature: sig("busy", [{ name: "n", type: "int" }], "int"),
    tests: [{ stdin: "[30000000]", expectedStdout: "30000000" }],
    timeLimitMs: 3000,
    solutions: {
      python: `def busy(n: int) -> int:\n    total = 0\n    for _ in range(n):\n        total += 1\n    return total\n`,
      javascript: `function busy(n) {\n  let total = 0;\n  for (let i = 0; i < n; i++) total++;\n  return total;\n}\n`,
      cpp: `long long busy(long long n) {\n    long long total = 0;\n    for (long long i = 0; i < n; i++) total++;\n    return total;\n}\n`,
      java: `class Solution {\n    static long busy(long n) {\n        long total = 0;\n        for (long i = 0; i < n; i++) total++;\n        return total;\n    }\n}\n`,
    },
  },
];

/**
 * Deliberately mistyped arguments for a correct solution (finding #7). The
 * signature says int; the stdin says otherwise. Python and JS should surface a
 * runtime error; the C++/Java positional readers may parse garbage instead.
 */
export const MISTYPED_ARGS: { label: string; stdin: string }[] = [
  { label: "string where int expected", stdin: '["not a number"]' },
  { label: "bool where int expected", stdin: "[true]" },
  { label: "array where int expected", stdin: "[[1,2,3]]" },
  { label: "object where int expected", stdin: '[{"n":1}]' },
  { label: "null where int expected", stdin: "[null]" },
];

export const MISTYPED_FIXTURE: Fixture = {
  name: "custom-test-type-mismatch",
  finding: "#7 custom input is arity-checked but not type-checked",
  question: "What does a participant see when their custom input has the wrong type?",
  signature: sig("double_it", [{ name: "n", type: "int" }], "int"),
  tests: [{ stdin: "[21]", expectedStdout: "42" }],
  solutions: {
    python: `def double_it(n: int) -> int:\n    return n * 2\n`,
    javascript: `function doubleIt(n) {\n  return n * 2;\n}\n`,
    cpp: `long long doubleIt(long long n) {\n    return n * 2;\n}\n`,
    java: `class Solution {\n    static long doubleIt(long n) {\n        return n * 2;\n    }\n}\n`,
  },
};
