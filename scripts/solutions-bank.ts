/**
 * Runs three Python solutions per bank problem on the real judge and writes
 * docs/SOLUTIONS.md with the verdicts actually observed:
 *
 * - totally incorrect: must pass no test
 * - partially correct: must pass at least one test and fail at least one
 * - correct: must pass every test
 *
 * Run: yarn tsx --conditions=react-server --env-file=.env scripts/solutions-bank.ts
 */
import { writeFileSync } from "node:fs";

import { runTests, type RunResult } from "@/lib/judge/runner";
import type { ParamType } from "@/lib/problems/signature";
import { built } from "./problem-bank";
import { PART1 } from "./solutions/part1";
import { PART2 } from "./solutions/part2";
import { PART3 } from "./solutions/part3";
import { PART4 } from "./solutions/part4";
import { PART5 } from "./solutions/part5";

const ALL = { ...PART1, ...PART2, ...PART3, ...PART4, ...PART5 };

/** A value of the right type that no test in the bank expects. */
const NEVER: Partial<Record<ParamType, string>> = {
  int: "-987654321",
  double: "-987654321.0",
  string: '"?"',
  "int[]": "[-987654321]",
  "double[]": "[-987654321.0]",
  "string[]": '["?"]',
  "int[][]": "[[-987654321]]",
  "string[][]": '[["?"]]',
  ListNode: "ListNode(-987654321)",
  TreeNode: "TreeNode(-987654321)",
};

type Kind = "wrong" | "partial" | "correct";
const LABEL: Record<Kind, string> = {
  wrong: "Totally incorrect",
  partial: "Partially correct",
  correct: "Fully correct",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function judge(source: string, b: (typeof built)[number]): Promise<RunResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await runTests({
        language: "python",
        source,
        signature: b.signature,
        tests: b.tests,
        revealActual: false,
        timeLimitMs: 5000,
        memoryLimitKb: 131072,
      });
    } catch (error) {
      // The judge sits behind a rate limit; back off and try again.
      if (attempt >= 5) throw error;
      await sleep(5000 * (attempt + 1));
    }
  }
}

async function main() {
  const missing = built.filter((b) => !ALL[b.fn]).map((b) => b.fn);
  if (missing.length) throw new Error(`no solutions for: ${missing.join(", ")}`);

  const problems: string[] = [];
  let md = `# Solutions

Three Python solutions for every problem in [PROBLEM-BANK.md](./PROBLEM-BANK.md),
for testing how the judge grades each outcome. Every result below was observed
on the real judge, not predicted.

- **Totally incorrect** passes no test. Most ignore the input and return a value no
  test expects. The true/false problems invert the correct answer instead, since a
  fixed \`true\` or \`false\` would pass some tests by luck.
- **Partially correct** is a realistic mistake: an off-by-one, a missed empty or
  duplicate case, a greedy where DP is needed, or a correct but too-slow approach
  that times out. It passes some tests and fails others.
- **Fully correct** passes every test, edge cases included.

Regenerate with \`yarn tsx --conditions=react-server --env-file=.env scripts/solutions-bank.ts\`.
`;

  let section = "";
  for (const b of built) {
    const sources: Record<Kind, string> = {
      wrong:
        ALL[b.fn]!.wrong?.trim() ??
        `def ${b.fn}(${b.params.map(([n]) => n).join(", ")}):\n    # Totally incorrect: ignores the input.\n    return ${NEVER[b.returns]}`,
      partial: ALL[b.fn]!.partial.trim(),
      correct: ALL[b.fn]!.correct.trim(),
    };

    if (b.section !== section) {
      section = b.section;
      md += `\n---\n\n## ${section}\n`;
    }
    md += `\n### ${b.title}\n\n\`${b.fn}\` · URL name \`test-${b.slug}\`\n`;

    for (const kind of ["wrong", "partial", "correct"] as Kind[]) {
      const result = await judge(sources[kind], b);
      const { passedCount: passed, totalCount: total } = result;
      const ok =
        kind === "wrong" ? passed === 0 : kind === "correct" ? passed === total : passed > 0 && passed < total;
      const failures = [...new Set(result.outcomes.filter((o) => !o.passed).map((o) => o.verdict))];
      const verdicts = failures.length ? `, failed with ${failures.join(", ")}` : "";
      if (!ok) problems.push(`${b.title} ${kind}: ${passed}/${total}${verdicts}`);
      console.log(`${ok ? "ok  " : "BAD "} ${b.fn.padEnd(30)} ${kind.padEnd(8)} ${passed}/${total}${verdicts}`);

      md += `\n**${LABEL[kind]}.** Judge result: ${passed}/${total} tests passed${verdicts.replace(/_/g, " ")}.\n\n\`\`\`python\n${sources[kind]}\n\`\`\`\n`;
    }
  }

  writeFileSync("docs/SOLUTIONS.md", md);
  console.log(problems.length ? `\n${problems.length} solutions missed their target:\n${problems.join("\n")}` : "\nall 288 solutions landed where intended");
  process.exit(problems.length ? 1 : 0);
}

void main();
