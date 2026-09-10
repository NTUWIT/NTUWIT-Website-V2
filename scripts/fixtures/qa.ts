/**
 * QA matrix: the same three problems solved four ways in four languages, at
 * four levels of correctness, plus targeted probes for the edges that actually
 * bite (time, memory, recursion depth, integer width, unicode).
 *
 * Used by `yarn check:qa` to prove the judge grades honestly, and by a human
 * QAing the admin console, who can paste any of these into the editor and see
 * whether the verdict matches the column it came from.
 */
import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";

export type Correctness = "correct" | "partial" | "wrong" | "slow" | "crash" | "broken";

export type QaProblem = {
  slug: string;
  signature: Signature;
  tests: { stdin: string; expectedStdout: string }[];
  /** What each variant should score, as passed/total. null means "any failure". */
  expect: Partial<Record<Correctness, { verdict: string; passed?: number }>>;
  solutions: Partial<Record<Correctness, Partial<Record<Language, string>>>>;
};

export const QA: QaProblem[] = [
  {
    slug: "best-run",
    signature: { name: "best_run", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    tests: [
      { stdin: "[[-2,1,-3,4,-1,2,1,-5,4]]", expectedStdout: "6" },
      { stdin: "[[1]]", expectedStdout: "1" },
      { stdin: "[[-5,-2,-8]]", expectedStdout: "-2" },
      { stdin: "[[5,4,-1,7,8]]", expectedStdout: "23" },
      { stdin: "[[-1,-1,-1,-1]]", expectedStdout: "-1" },
    ],
    expect: {
      correct: { verdict: "accepted", passed: 5 },
      // Clamping at zero is the classic Kadane bug: fine until every number is
      // negative, which is exactly what tests 3 and 5 are for.
      partial: { verdict: "wrong_answer", passed: 3 },
      // Summing the whole list is right whenever every number is positive, so
      // even a plainly wrong solution earns partial credit. That is the design
      // working, not a leak.
      wrong: { verdict: "wrong_answer", passed: 2 },
      slow: { verdict: "time_limit_exceeded" },
      crash: { verdict: "runtime_error" },
      broken: { verdict: "compile_error" },
    },
    solutions: {
      correct: {
        python: `def best_run(nums):\n    best = cur = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        best = max(best, cur)\n    return best\n`,
        javascript: `function bestRun(nums) {\n  let best = nums[0], cur = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}\n`,
        cpp: `long long bestRun(std::vector<long long> nums) {\n    long long best = nums[0], cur = nums[0];\n    for (size_t i = 1; i < nums.size(); i++) {\n        cur = std::max(nums[i], cur + nums[i]);\n        best = std::max(best, cur);\n    }\n    return best;\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        long best = nums[0], cur = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            cur = Math.max(nums[i], cur + nums[i]);\n            best = Math.max(best, cur);\n        }\n        return best;\n    }\n}\n`,
      },
      partial: {
        python: `def best_run(nums):\n    best = cur = 0\n    for n in nums:\n        cur = max(0, cur + n)\n        best = max(best, cur)\n    return best\n`,
        javascript: `function bestRun(nums) {\n  let best = 0, cur = 0;\n  for (const n of nums) { cur = Math.max(0, cur + n); best = Math.max(best, cur); }\n  return best;\n}\n`,
        cpp: `long long bestRun(std::vector<long long> nums) {\n    long long best = 0, cur = 0;\n    for (long long n : nums) { cur = std::max(0LL, cur + n); best = std::max(best, cur); }\n    return best;\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        long best = 0, cur = 0;\n        for (long n : nums) { cur = Math.max(0, cur + n); best = Math.max(best, cur); }\n        return best;\n    }\n}\n`,
      },
      wrong: {
        python: `def best_run(nums):\n    return sum(nums)\n`,
        javascript: `function bestRun(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\n`,
        cpp: `long long bestRun(std::vector<long long> nums) {\n    long long t = 0; for (long long n : nums) t += n; return t;\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        long t = 0; for (long n : nums) t += n; return t;\n    }\n}\n`,
      },
      slow: {
        python: `def best_run(nums):\n    n = 0\n    while True:\n        n += 1\n    return n\n`,
        javascript: `function bestRun(nums) {\n  for (;;) {}\n}\n`,
        cpp: `long long bestRun(std::vector<long long> nums) {\n    volatile long long x = 0; for (;;) x++; return x;\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        long x = 0; for (;;) x++;\n    }\n}\n`,
      },
      crash: {
        python: `def best_run(nums):\n    return nums[999]\n`,
        javascript: `function bestRun(nums) {\n  throw new Error("boom");\n}\n`,
        cpp: `long long bestRun(std::vector<long long> nums) {\n    return nums.at(999);\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        return nums[999];\n    }\n}\n`,
      },
      broken: {
        cpp: `long long bestRun(std::vector<long long> nums) {\n    this is not c++;\n}\n`,
        java: `class Solution {\n    static long bestRun(long[] nums) {\n        this is not java;\n    }\n}\n`,
      },
    },
  },

  {
    slug: "matching-brackets",
    signature: { name: "brackets_match", params: [{ name: "text", type: "string" }], returns: "bool" },
    tests: [
      { stdin: '["()[]{}"]', expectedStdout: "true" },
      { stdin: '["(]"]', expectedStdout: "false" },
      { stdin: '[""]', expectedStdout: "true" },
      { stdin: '["([{}])"]', expectedStdout: "true" },
      { stdin: '["((("]', expectedStdout: "false" },
      { stdin: '["}{"]', expectedStdout: "false" },
    ],
    expect: {
      correct: { verdict: "accepted", passed: 6 },
      // Counting without a stack cannot tell "(]" or "}{" from a real match.
      partial: { verdict: "wrong_answer", passed: 4 },
      wrong: { verdict: "wrong_answer", passed: 3 },
    },
    solutions: {
      correct: {
        python: `def brackets_match(text):\n    pairs = {")": "(", "]": "[", "}": "{"}\n    stack = []\n    for c in text:\n        if c in "([{": stack.append(c)\n        elif c in pairs:\n            if not stack or stack.pop() != pairs[c]: return False\n    return not stack\n`,
        javascript: `function bracketsMatch(text) {\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  const stack = [];\n  for (const c of text) {\n    if ("([{".includes(c)) stack.push(c);\n    else if (pairs[c] && stack.pop() !== pairs[c]) return false;\n  }\n  return stack.length === 0;\n}\n`,
        cpp: `bool bracketsMatch(std::string text) {\n    std::vector<char> st;\n    for (char c : text) {\n        if (c=='('||c=='['||c=='{') st.push_back(c);\n        else {\n            char want = c==')' ? '(' : c==']' ? '[' : '{';\n            if (st.empty() || st.back() != want) return false;\n            st.pop_back();\n        }\n    }\n    return st.empty();\n}\n`,
        java: `import java.util.*;\n\nclass Solution {\n    static boolean bracketsMatch(String text) {\n        Deque<Character> st = new ArrayDeque<>();\n        for (char c : text.toCharArray()) {\n            if (c=='('||c=='['||c=='{') st.push(c);\n            else {\n                char want = c==')' ? '(' : c==']' ? '[' : '{';\n                if (st.isEmpty() || st.pop() != want) return false;\n            }\n        }\n        return st.isEmpty();\n    }\n}\n`,
      },
      partial: {
        python: `def brackets_match(text):\n    opens = sum(1 for c in text if c in "([{")\n    closes = sum(1 for c in text if c in ")]}")\n    return opens == closes\n`,
        javascript: `function bracketsMatch(text) {\n  const o = [...text].filter((c) => "([{".includes(c)).length;\n  const c2 = [...text].filter((c) => ")]}".includes(c)).length;\n  return o === c2;\n}\n`,
        cpp: `bool bracketsMatch(std::string text) {\n    int o=0,c2=0;\n    for (char c : text) { if (c=='('||c=='['||c=='{') o++; else c2++; }\n    return o==c2;\n}\n`,
        java: `class Solution {\n    static boolean bracketsMatch(String text) {\n        int o=0,c2=0;\n        for (char c : text.toCharArray()) { if (c=='('||c=='['||c=='{') o++; else c2++; }\n        return o==c2;\n    }\n}\n`,
      },
      wrong: {
        python: `def brackets_match(text):\n    return True\n`,
        javascript: `function bracketsMatch(text) {\n  return true;\n}\n`,
        cpp: `bool bracketsMatch(std::string text) {\n    return true;\n}\n`,
        java: `class Solution {\n    static boolean bracketsMatch(String text) {\n        return true;\n    }\n}\n`,
      },
    },
  },

  {
    slug: "how-deep",
    signature: { name: "how_deep", params: [
      { name: "values", type: "int[]" }, { name: "children", type: "int[][]" }], returns: "int" },
    tests: [
      { stdin: "[[3,9,20,15,7],[[1,2],[-1,-1],[3,4],[-1,-1],[-1,-1]]]", expectedStdout: "3" },
      { stdin: "[[],[]]", expectedStdout: "0" },
      { stdin: "[[1],[[-1,-1]]]", expectedStdout: "1" },
      { stdin: "[[1,2,3,4],[[1,-1],[2,-1],[3,-1],[-1,-1]]]", expectedStdout: "4" },
    ],
    expect: {
      correct: { verdict: "accepted", passed: 4 },
      // Counting nodes instead of depth is right only when the tree is a chain.
      partial: { verdict: "wrong_answer", passed: 3 },
    },
    solutions: {
      correct: {
        python: `def how_deep(values, children):\n    if not values: return 0\n    def d(i):\n        if i < 0: return 0\n        return 1 + max(d(children[i][0]), d(children[i][1]))\n    return d(0)\n`,
        javascript: `function howDeep(values, children) {\n  if (values.length === 0) return 0;\n  const d = (i) => (i < 0 ? 0 : 1 + Math.max(d(children[i][0]), d(children[i][1])));\n  return d(0);\n}\n`,
        cpp: `long long depthOf(std::vector<std::vector<long long>>& c, long long i) {\n    if (i < 0) return 0;\n    return 1 + std::max(depthOf(c, c[i][0]), depthOf(c, c[i][1]));\n}\nlong long howDeep(std::vector<long long> values, std::vector<std::vector<long long>> children) {\n    if (values.empty()) return 0;\n    return depthOf(children, 0);\n}\n`,
        java: `class Solution {\n    static long depthOf(long[][] c, long i) {\n        if (i < 0) return 0;\n        return 1 + Math.max(depthOf(c, c[(int) i][0]), depthOf(c, c[(int) i][1]));\n    }\n    static long howDeep(long[] values, long[][] children) {\n        if (values.length == 0) return 0;\n        return depthOf(children, 0);\n    }\n}\n`,
      },
      partial: {
        python: `def how_deep(values, children):\n    return len(values)\n`,
        javascript: `function howDeep(values, children) {\n  return values.length;\n}\n`,
        cpp: `long long howDeep(std::vector<long long> values, std::vector<std::vector<long long>> children) {\n    return (long long) values.size();\n}\n`,
        java: `class Solution {\n    static long howDeep(long[] values, long[][] children) {\n        return values.length;\n    }\n}\n`,
      },
    },
  },
];

/** Edge probes: one question each, run on their own tiny signature. */
export type Probe = {
  name: string;
  question: string;
  signature: Signature;
  tests: { stdin: string; expectedStdout: string }[];
  solutions: Partial<Record<Language, string>>;
};

export const PROBES: Probe[] = [
  {
    name: "integer width",
    question: "fib(90) is past 2^53. Which languages stay exact?",
    signature: { name: "fib", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[90]", expectedStdout: "2880067194370816120" }],
    solutions: {
      python: `def fib(n):\n    a, b = 0, 1\n    for _ in range(n): a, b = b, a + b\n    return a\n`,
      javascript: `function fib(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n`,
      cpp: `long long fib(long long n) {\n    long long a=0,b=1; for (long long i=0;i<n;i++){ long long t=a+b; a=b; b=t; } return a;\n}\n`,
      java: `class Solution {\n    static long fib(long n) {\n        long a=0,b=1; for (long i=0;i<n;i++){ long t=a+b; a=b; b=t; } return a;\n    }\n}\n`,
    },
  },
  {
    name: "recursion depth",
    question: "200k-deep recursion: what does a participant see?",
    signature: { name: "depth_sum", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[200000]", expectedStdout: "20000100000" }],
    solutions: {
      python: `def depth_sum(n):\n    if n == 0: return 0\n    return n + depth_sum(n - 1)\n`,
      javascript: `function depthSum(n) {\n  if (n === 0) return 0;\n  return n + depthSum(n - 1);\n}\n`,
      cpp: `long long depthSum(long long n) {\n    if (n == 0) return 0;\n    return n + depthSum(n - 1);\n}\n`,
      java: `class Solution {\n    static long depthSum(long n) {\n        if (n == 0) return 0;\n        return n + depthSum(n - 1);\n    }\n}\n`,
    },
  },
  {
    name: "memory",
    question: "A table far past the memory limit: what verdict?",
    signature: { name: "table_sum", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[20000]", expectedStdout: "0" }],
    solutions: {
      python: `def table_sum(n):\n    t = [[0] * n for _ in range(n)]\n    return t[0][0]\n`,
      javascript: `function tableSum(n) {\n  const t = Array.from({ length: n }, () => new Array(n).fill(0));\n  return t[0][0];\n}\n`,
      cpp: `long long tableSum(long long n) {\n    std::vector<std::vector<long long>> t(n, std::vector<long long>(n, 0));\n    return t[0][0];\n}\n`,
      java: `class Solution {\n    static long tableSum(long n) {\n        int m = (int) n; long[][] t = new long[m][m]; return t[0][0];\n    }\n}\n`,
    },
  },
  {
    name: "unicode",
    question: "Accents, CJK and an emoji through the hand-rolled readers.",
    signature: { name: "echo_text", params: [{ name: "text", type: "string" }], returns: "string" },
    tests: [
      { stdin: '["café 日本語 🙂"]', expectedStdout: '"café 日本語 🙂"' },
      { stdin: '["a\\"b\\\\c\\nd"]', expectedStdout: '"a\\"b\\\\c\\nd"' },
    ],
    solutions: {
      python: `def echo_text(text):\n    return text\n`,
      javascript: `function echoText(text) {\n  return text;\n}\n`,
      cpp: `std::string echoText(std::string text) {\n    return text;\n}\n`,
      java: `class Solution {\n    static String echoText(String text) {\n        return text;\n    }\n}\n`,
    },
  },
  {
    name: "debug output",
    question: "A print left in by a participant: captured, or does it corrupt the answer?",
    signature: { name: "twice", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[21]", expectedStdout: "42" }],
    solutions: {
      python: `def twice(n):\n    print("checking", n)\n    return n * 2\n`,
      javascript: `function twice(n) {\n  console.log("checking", n);\n  return n * 2;\n}\n`,
      cpp: `long long twice(long long n) {\n    std::cout << "checking " << n << std::endl;\n    return n * 2;\n}\n`,
      java: `class Solution {\n    static long twice(long n) {\n        System.out.println("checking " + n);\n        return n * 2;\n    }\n}\n`,
    },
  },
];
