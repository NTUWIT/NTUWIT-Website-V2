import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import { starterCodeFor } from "@/lib/problems/starter";

export type SeedProblem = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  statementMd: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  points: number;
  order: number;
  signature: Signature;
  starterCode: Partial<Record<Language, string>>;
  tests: { stdin: string; expectedStdout: string; isSample: boolean }[];
};

const NOTE = `
---

**How this is graded:** write the function and \`return\` your answer, the
platform calls it with the arguments and checks what you return. Printing is
for your own debugging only and is ignored.
`;

type Draft = Omit<SeedProblem, "starterCode">;

const DRAFTS: Draft[] = [
  {
    slug: "sum-of-numbers",
    title: "Sum of Numbers",
    difficulty: "easy",
    points: 100,
    order: 1,
    timeLimitMs: 5000,
    memoryLimitKb: 131072,
    signature: {
      name: "sum_of_numbers",
      params: [{ name: "nums", type: "int[]" }],
      returns: "int",
    },
    statementMd: `Return the sum of the given integers.

### Example
\`\`\`
nums = [1, 2, 3, 4]   ->   10
\`\`\`

An empty list sums to \`0\`. The values can be negative.
${NOTE}`,
    tests: [
      { stdin: "[[1,2,3,4]]", expectedStdout: "10", isSample: true },
      { stdin: "[[5]]", expectedStdout: "5", isSample: true },
      { stdin: "[[-3,3]]", expectedStdout: "0", isSample: false },
      { stdin: "[[1000000,2000000,3000000]]", expectedStdout: "6000000", isSample: false },
      { stdin: "[[-1,-2,-3]]", expectedStdout: "-6", isSample: false },
      { stdin: "[[]]", expectedStdout: "0", isSample: false },
    ],
  },
  {
    slug: "reverse-words",
    title: "Reverse Words",
    difficulty: "easy",
    points: 150,
    order: 2,
    timeLimitMs: 5000,
    memoryLimitKb: 131072,
    signature: {
      name: "reverse_words",
      params: [{ name: "sentence", type: "string" }],
      returns: "string",
    },
    statementMd: `Return the sentence with its words in reverse order, separated by
single spaces.

### Example
\`\`\`
"the quick brown fox"   ->   "fox brown quick the"
\`\`\`

Words are separated by one or more spaces. There is no leading or trailing
space in the result.
${NOTE}`,
    tests: [
      { stdin: '["the quick brown fox"]', expectedStdout: '"fox brown quick the"', isSample: true },
      { stdin: '["hello world"]', expectedStdout: '"world hello"', isSample: true },
      { stdin: '["single"]', expectedStdout: '"single"', isSample: false },
      { stdin: '["a b c d e"]', expectedStdout: '"e d c b a"', isSample: false },
      { stdin: '["  padded  words  "]', expectedStdout: '"words padded"', isSample: false },
    ],
  },
  {
    slug: "count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    points: 200,
    order: 3,
    timeLimitMs: 5000,
    memoryLimitKb: 131072,
    signature: {
      name: "count_vowels",
      params: [{ name: "text", type: "string" }],
      returns: "int",
    },
    statementMd: `Return how many vowels (\`a\`, \`e\`, \`i\`, \`o\`, \`u\`) the text contains.
Both cases count.

### Example
\`\`\`
"Programming"   ->   3
\`\`\`
${NOTE}`,
    tests: [
      { stdin: '["Programming"]', expectedStdout: "3", isSample: true },
      { stdin: '["aeiou"]', expectedStdout: "5", isSample: true },
      { stdin: '["XYZ"]', expectedStdout: "0", isSample: false },
      { stdin: '["AEIOU aeiou"]', expectedStdout: "10", isSample: false },
      { stdin: '[""]', expectedStdout: "0", isSample: false },
    ],
  },
];

export const SEED_PROBLEMS: SeedProblem[] = DRAFTS.map((d) => ({
  ...d,
  starterCode: starterCodeFor(d.signature),
}));
