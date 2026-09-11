/**
 * Generates docs/PROBLEM-BANK.md.
 *
 * Every expected answer is computed by a reference solution below rather than
 * typed by hand, and every problem is put through the same validator the
 * console uses, so a problem copied from the bank cannot be rejected by the
 * wizard or fail a correct submission. The trickier references are also
 * cross-checked against brute force before anything is written.
 *
 * Run: yarn tsx --conditions=react-server scripts/problem-bank.ts
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

import type { ParamType, Signature } from "@/lib/problems/signature";
import { starterCodeFor } from "@/lib/problems/starter";
import { expectedForm, validateProblem } from "@/lib/problems/validate";

type Difficulty = "easy" | "medium" | "hard";
const POINTS: Record<Difficulty, number> = { easy: 100, medium: 200, hard: 300 };

type Problem = {
  section: string;
  pattern: string;
  title: string;
  difficulty: Difficulty;
  fn: string;
  params: [string, ParamType][];
  returns: ParamType;
  unordered?: boolean;
  brief: string;
  /** The first two are the examples participants see. */
  tests: unknown[][];
  ref: (...args: any[]) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/* ---------- helpers for the references ---------- */

type Node = { val: number; left: Node | null; right: Node | null };
const tree = (a: (number | null)[]): Node | null => {
  if (!a.length) return null;
  const nodes = a.map((v): Node | null => (v === null ? null : { val: v, left: null, right: null }));
  let i = 1;
  for (const n of nodes) {
    if (i >= nodes.length) break;
    if (!n) continue;
    n.left = nodes[i++] ?? null;
    if (i < nodes.length) n.right = nodes[i++] ?? null;
  }
  return nodes[0] ?? null;
};
const level = (r: Node | null): (number | null)[] => {
  const out: (number | null)[] = [];
  const q: (Node | null)[] = [r];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (!n) {
      out.push(null);
      continue;
    }
    out.push(n.val);
    q.push(n.left, n.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const gcd = (a: bigint, b: bigint): bigint => (b === BigInt(0) ? a : gcd(b, a % b));
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function wordInGrid(board: string[][], word: string): boolean {
  const R = board.length, C = board[0]!.length;
  const seen = board.map((row) => row.map(() => false));
  const go = (r: number, c: number, i: number): boolean => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= R || c >= C || seen[r]![c] || board[r]![c] !== word[i]) return false;
    seen[r]![c] = true;
    const found = DIRS.some(([dr, dc]) => go(r + dr, c + dc, i + 1));
    seen[r]![c] = false;
    return found;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}

function sudokuSolutions(board: string[][], limit: number): string[][][] {
  const g = board.map((r) => [...r]);
  const found: string[][][] = [];
  const ok = (r: number, c: number, d: string) => {
    for (let i = 0; i < 9; i++) {
      if (g[r]![i] === d || g[i]![c] === d) return false;
      if (g[3 * Math.floor(r / 3) + Math.floor(i / 3)]![3 * Math.floor(c / 3) + (i % 3)] === d) return false;
    }
    return true;
  };
  const go = (k: number): void => {
    if (found.length >= limit) return;
    if (k === 81) {
      found.push(g.map((r) => [...r]));
      return;
    }
    const r = Math.floor(k / 9), c = k % 9;
    if (g[r]![c] !== ".") return go(k + 1);
    for (const d of "123456789") {
      if (!ok(r, c, d)) continue;
      g[r]![c] = d;
      go(k + 1);
      g[r]![c] = ".";
    }
  };
  go(0);
  return found;
}

const distinctDigitsBrute = (n: number) => {
  let count = 0;
  for (let x = 1; x <= n; x++) if (new Set(String(x)).size === String(x).length) count++;
  return count;
};
function distinctDigits(n: number): number {
  const digits = String(n).split("").map(Number);
  const L = digits.length;
  // Shorter numbers: first digit 1-9, then choose from the remaining.
  let count = 0;
  for (let len = 1; len < L; len++) {
    let ways = 9;
    for (let i = 1; i < len; i++) ways *= 10 - i;
    count += ways;
  }
  // Same length, walking the digits of n.
  const used = new Set<number>();
  for (let i = 0; i < L; i++) {
    for (let d = i === 0 ? 1 : 0; d < digits[i]!; d++) {
      if (used.has(d)) continue;
      let ways = 1;
      for (let j = 0; j < L - i - 1; j++) ways *= 10 - (i + 1) - j;
      count += ways;
    }
    if (used.has(digits[i]!)) return count;
    used.add(digits[i]!);
  }
  return count + 1;
}

const minSpeed = (piles: number[], h: number) => {
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sum(piles.map((p) => Math.ceil(p / mid))) <= h) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};
const minSpeedBrute = (piles: number[], h: number) => {
  for (let k = 1; ; k++) if (sum(piles.map((p) => Math.ceil(p / k))) <= h) return k;
};

function unionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  return { find, union: (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra === rb) return false; parent[ra] = rb; return true; } };
}

/* ---------- the bank ---------- */

const P: Problem[] = [
  /* ===== Array & String ===== */
  {
    section: "Array & String", pattern: "Two pointers, opposite ends", title: "Most Water", difficulty: "medium",
    fn: "max_area", params: [["heights", "int[]"]], returns: "int",
    brief: `Each number is the height of a wall, one unit apart. Pick two walls; the water they hold is the shorter height times the distance between them.

Return the most water any two walls can hold.

### Constraints

- There are at least two walls.
- Checking every pair is too slow for long lists.`,
    tests: [[[1, 8, 6, 2, 5, 4, 8, 3, 7]], [[1, 1]], [[4, 3, 2, 1, 4]], [[1, 2, 1]], [[2, 3, 4, 5, 18, 17, 6]], [[0, 0, 0]]],
    ref: (h: number[]) => { let l = 0, r = h.length - 1, best = 0; while (l < r) { best = Math.max(best, Math.min(h[l]!, h[r]!) * (r - l)); if (h[l]! < h[r]!) l++; else r--; } return best; },
  },
  {
    section: "Array & String", pattern: "Two pointers, same direction", title: "Zeros To The Back", difficulty: "easy",
    fn: "move_zeros", params: [["nums", "int[]"]], returns: "int[]",
    brief: `Move every zero to the end of the list, keeping the other numbers in their original order. Return the result.

### Constraints

- The list may be empty.
- Try one pass with a write position that trails a read position.`,
    tests: [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[]], [[4, 0, 0, 5, 0, -6]]],
    ref: (a: number[]) => [...a.filter((x) => x !== 0), ...a.filter((x) => x === 0)],
  },
  {
    section: "Array & String", pattern: "Sliding window, fixed size", title: "Best Stretch", difficulty: "easy",
    fn: "max_window_sum", params: [["nums", "int[]"], ["size", "int"]], returns: "int",
    brief: `Return the largest total of any \`size\` numbers that sit next to each other.

### Constraints

- \`size\` is at least 1 and never larger than the list.
- Numbers may be negative.`,
    tests: [[[2, 1, 5, 1, 3, 2], 3], [[5], 1], [[-1, -2, -3, -4], 2], [[1, 2, 3, 4, 5], 5], [[3, -1, 4, -1, 5], 2]],
    ref: (a: number[], k: number) => { let s = sum(a.slice(0, k)), best = s; for (let i = k; i < a.length; i++) { s += a[i]! - a[i - k]!; best = Math.max(best, s); } return best; },
  },
  {
    section: "Array & String", pattern: "Sliding window, variable size", title: "Shortest Enough", difficulty: "medium",
    fn: "shortest_subarray", params: [["target", "int"], ["nums", "int[]"]], returns: "int",
    brief: `Return the length of the shortest run of neighbouring numbers whose total is at least \`target\`, or 0 if no run is big enough.

### Constraints

- All numbers are positive.
- Grow the window on the right, shrink it from the left.`,
    tests: [[7, [2, 3, 1, 2, 4, 3]], [4, [1, 4, 4]], [11, [1, 1, 1, 1, 1, 1, 1, 1]], [15, [1, 2, 3, 4, 5]], [6, [10, 2, 3]], [100, []]],
    ref: (t: number, a: number[]) => { let l = 0, s = 0, best = Infinity; for (let r = 0; r < a.length; r++) { s += a[r]!; while (s >= t) { best = Math.min(best, r - l + 1); s -= a[l++]!; } } return best === Infinity ? 0 : best; },
  },
  {
    section: "Array & String", pattern: "Prefix sum", title: "Range Totals", difficulty: "easy",
    fn: "range_sums", params: [["nums", "int[]"], ["queries", "int[][]"]], returns: "int[]",
    brief: `Each query is \`[left, right]\`. Return the total of \`nums[left..right]\`, both ends included, for every query in order.

### Constraints

- Queries are always inside the list.
- There can be many queries, so do not re-add the same numbers each time.`,
    tests: [[[-2, 0, 3, -5, 2, -1], [[0, 2], [2, 5], [0, 5]]], [[5], [[0, 0]]], [[1, 2, 3, 4], [[1, 1], [0, 3], [2, 3]]], [[7, -7, 7], []]],
    ref: (a: number[], qs: number[][]) => qs.map(([l, r]) => sum(a.slice(l, r! + 1))),
  },
  {
    section: "Array & String", pattern: "Difference array", title: "Many Raises", difficulty: "medium",
    fn: "apply_increments", params: [["length", "int"], ["updates", "int[][]"]], returns: "int[]",
    brief: `Start with \`length\` zeros. Each update is \`[start, end, amount]\`: add \`amount\` to every position from \`start\` to \`end\`, both included. Return the list after all updates.

### Constraints

- Amounts may be negative.
- Updating every position of every range is too slow; mark only where each range starts and stops.`,
    tests: [[5, [[1, 3, 2], [2, 4, 3], [0, 2, -2]]], [3, []], [4, [[0, 3, 1], [0, 3, 1]]], [1, [[0, 0, -5]]], [6, [[5, 5, 9], [0, 0, 1]]]],
    ref: (n: number, ups: number[][]) => { const a = new Array(n).fill(0); for (const [s, e, v] of ups) for (let i = s!; i <= e!; i++) a[i] += v!; return a; },
  },
  {
    section: "Array & String", pattern: "Kadane's algorithm", title: "Best Run", difficulty: "medium",
    fn: "best_run", params: [["nums", "int[]"]], returns: "int",
    brief: `Find the largest total you can get from any run of one or more numbers next to each other.

### Constraints

- The list has at least one number.
- Numbers may be negative, so the answer can be negative too.`,
    tests: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[-5, -2, -8]], [[5, 4, -1, 7, 8]], [[0]], [[-1, -1, -1, -1]]],
    ref: (a: number[]) => { let cur = a[0]!, best = a[0]!; for (const x of a.slice(1)) { cur = Math.max(x, cur + x); best = Math.max(best, cur); } return best; },
  },
  {
    section: "Array & String", pattern: "Sorting-based: merge intervals", title: "Merge The Bookings", difficulty: "medium",
    fn: "merge_intervals", params: [["intervals", "int[][]"]], returns: "int[][]",
    brief: `Each interval is \`[start, end]\`. Merge every set of overlapping intervals and return the result sorted by start.

Intervals that touch, like \`[1, 4]\` and \`[4, 5]\`, count as overlapping.

### Constraints

- The input is in no particular order and may be empty.`,
    tests: [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[[1, 4], [4, 5]]], [[[1, 4], [0, 4]]], [[[1, 4], [2, 3]]], [[]], [[[5, 6], [1, 2]]]],
    ref: (iv: number[][]) => { const s = [...iv].sort((a, b) => a[0]! - b[0]!); const out: number[][] = []; for (const [a, b] of s) { const last = out[out.length - 1]; if (last && a! <= last[1]!) last[1] = Math.max(last[1]!, b!); else out.push([a!, b!]); } return out; },
  },
  {
    section: "Array & String", pattern: "Sorting-based: meeting rooms", title: "How Many Rooms", difficulty: "medium",
    fn: "min_meeting_rooms", params: [["meetings", "int[][]"]], returns: "int",
    brief: `Each meeting is \`[start, end]\` and ends just before \`end\`, so a meeting ending at 10 frees its room for one starting at 10.

Return the fewest rooms needed so no two meetings share a room at the same time.

### Constraints

- There may be no meetings at all.`,
    tests: [[[[0, 30], [5, 10], [15, 20]]], [[[7, 10], [2, 4]]], [[]], [[[1, 5], [5, 10]]], [[[1, 10], [2, 9], [3, 8]]], [[[1, 3], [2, 4], [3, 5], [4, 6]]]],
    ref: (m: number[][]) => { let best = 0; for (const [s] of m) best = Math.max(best, m.filter(([a, b]) => a! <= s! && s! < b!).length); return best; },
  },
  {
    section: "Array & String", pattern: "Dutch national flag", title: "Three Colours", difficulty: "medium",
    fn: "sort_colors", params: [["colors", "int[]"]], returns: "int[]",
    brief: `The list holds only 0s, 1s and 2s. Return it sorted.

### Constraints

- Do it in one pass without counting, using three pointers: everything before \`low\` is 0, everything after \`high\` is 2.`,
    tests: [[[2, 0, 2, 1, 1, 0]], [[2, 0, 1]], [[0]], [[1, 1, 1]], [[2, 2, 0, 0]], [[]]],
    ref: (a: number[]) => [...a].sort((x, y) => x - y),
  },
  {
    section: "Array & String", pattern: "String matching (KMP / Rabin-Karp)", title: "Every Match", difficulty: "hard",
    fn: "find_pattern", params: [["text", "string"], ["pattern", "string"]], returns: "int[]",
    brief: `Return every position in \`text\` where \`pattern\` starts, in increasing order. Matches may overlap.

### Constraints

- The pattern is never empty.
- Restarting the comparison from scratch at every position is too slow for long texts.`,
    tests: [["abababa", "aba"], ["hello", "ll"], ["aaaa", "aa"], ["abc", "d"], ["a", "a"], ["mississippi", "issi"]],
    ref: (t: string, p: string) => { const out: number[] = []; for (let i = 0; i + p.length <= t.length; i++) if (t.startsWith(p, i)) out.push(i); return out; },
  },
  {
    section: "Array & String", pattern: "Palindrome check", title: "Longest Mirror", difficulty: "medium",
    fn: "longest_palindrome", params: [["text", "string"]], returns: "string",
    brief: `Return the longest run of neighbouring characters that reads the same backwards. If several are equally long, return the one that starts first.

### Constraints

- The text has at least one character.
- Try expanding outwards from every centre.`,
    tests: [["babad"], ["cbbd"], ["a"], ["forgeeksskeegfor"], ["abacdfgdcaba"], ["racecar"]],
    ref: (s: string) => { let best = ""; for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) { const sub = s.slice(i, j); if (sub.length > best.length && sub === [...sub].reverse().join("")) best = sub; } return best; },
  },
  {
    section: "Array & String", pattern: "Palindrome construction", title: "Build A Mirror", difficulty: "easy",
    fn: "longest_buildable_palindrome", params: [["letters", "string"]], returns: "int",
    brief: `You may rearrange the letters however you like, and use each at most once. Return the length of the longest palindrome you can build.

Capitals and lowercase are different letters.

### Constraints

- The text may be empty.`,
    tests: [["abccccdd"], ["a"], [""], ["Aa"], ["aaabbb"], ["zzzz"]],
    ref: (s: string) => { const c = new Map<string, number>(); for (const ch of s) c.set(ch, (c.get(ch) ?? 0) + 1); let even = 0, odd = false; for (const v of c.values()) { even += v - (v % 2); if (v % 2) odd = true; } return even + (odd ? 1 : 0); },
  },

  /* ===== Hashing ===== */
  {
    section: "Hashing", pattern: "HashMap for frequency counting", title: "First One Of A Kind", difficulty: "easy",
    fn: "first_unique_char", params: [["text", "string"]], returns: "int",
    brief: `Return the position of the first character that appears exactly once, or -1 if every character repeats.

### Constraints

- The text may be empty.`,
    tests: [["leetcode"], ["aabb"], ["loveleetcode"], [""], ["z"], ["abcabcd"]],
    ref: (s: string) => [...s].findIndex((ch) => s.indexOf(ch) === s.lastIndexOf(ch)),
  },
  {
    section: "Hashing", pattern: "HashSet for existence checks", title: "Longest Streak", difficulty: "medium",
    fn: "longest_consecutive", params: [["nums", "int[]"]], returns: "int",
    brief: `Return the length of the longest run of consecutive whole numbers you can make from the list, like 1, 2, 3, 4. Order in the list does not matter and repeats count once.

### Constraints

- The list may be empty.
- Sorting works, but a set lets you start counting only from numbers that begin a run.`,
    tests: [[[100, 4, 200, 1, 3, 2]], [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], [[]], [[1, 2, 0, 1]], [[-1, -2, 5]], [[9]]],
    ref: (a: number[]) => { const s = new Set(a); let best = 0; for (const x of s) if (!s.has(x - 1)) { let y = x; while (s.has(y + 1)) y++; best = Math.max(best, y - x + 1); } return best; },
  },
  {
    section: "Hashing", pattern: "Two Sum", title: "Two That Add Up", difficulty: "easy",
    fn: "two_sum", params: [["nums", "int[]"], ["target", "int"]], returns: "int[]",
    brief: `Return the two positions whose numbers add up to \`target\`, smaller position first.

### Constraints

- There is exactly one answer, and a position may not be used twice.
- The list is not sorted. Remember what you have already seen.`,
    tests: [[[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[-1, -2, -3, -4, -5], -8], [[0, 4, 3, 0], 0]],
    ref: (a: number[], t: number) => { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i]! + a[j]! === t) return [i, j]; return []; },
  },
  {
    section: "Hashing", pattern: "Two Sum variant (3Sum)", title: "Three That Cancel", difficulty: "medium", unordered: true,
    fn: "three_sum", params: [["nums", "int[]"]], returns: "int[][]",
    brief: `Return every different group of three numbers from the list that adds up to zero. Write each group smallest first. The groups may come in any order.

### Constraints

- A group may not use the same position twice, and no group may be listed twice.`,
    tests: [[[-1, 0, 1, 2, -1, -4]], [[0, 1, 1]], [[0, 0, 0]], [[]], [[-2, 0, 1, 1, 2]], [[3, -3, 0, 1, -1]]],
    ref: (a: number[]) => { const seen = new Map<string, number[]>(); for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) for (let k = j + 1; k < a.length; k++) if (a[i]! + a[j]! + a[k]! === 0) { const t = [a[i]!, a[j]!, a[k]!].sort((x, y) => x - y); seen.set(t.join(), t); } return [...seen.values()]; },
  },
  {
    section: "Hashing", pattern: "Grouping by key", title: "Same Letters", difficulty: "medium", unordered: true,
    fn: "group_anagrams", params: [["words", "string[]"]], returns: "string[][]",
    brief: `Put words made of exactly the same letters into the same group. Inside each group, keep the words in the order they appeared. The groups may come in any order.

### Constraints

- Words are lowercase and may be empty.`,
    tests: [[["eat", "tea", "tan", "ate", "nat", "bat"]], [["a"]], [[""]], [["abc", "bca", "cab", "xyz"]], [["ab", "ba", "ab"]]],
    ref: (w: string[]) => { const m = new Map<string, string[]>(); for (const x of w) { const k = [...x].sort().join(""); m.set(k, [...(m.get(k) ?? []), x]); } return [...m.values()]; },
  },

  /* ===== Linked List ===== */
  {
    section: "Linked List", pattern: "Fast & slow pointers (middle node)", title: "Find The Middle", difficulty: "easy",
    fn: "middle_node", params: [["head", "ListNode"]], returns: "ListNode",
    brief: `Return the middle node of the linked list. If there are two middle nodes, return the second one. Everything after it comes along too.

### Constraints

- The list has at least one node.
- Move one pointer a step at a time and another two steps at a time.`,
    tests: [[[1, 2, 3, 4, 5]], [[1, 2, 3, 4, 5, 6]], [[1]], [[1, 2]], [[7, 8, 9]]],
    ref: (a: number[]) => a.slice(Math.floor(a.length / 2)),
  },
  {
    section: "Linked List", pattern: "Fast & slow pointers (cycle detection)", title: "The Repeat", difficulty: "medium",
    fn: "find_duplicate", params: [["nums", "int[]"]], returns: "int",
    brief: `The list has \`n + 1\` numbers, each between 1 and \`n\`. Exactly one number repeats, possibly more than once. Return it.

Treat each value as a pointer to the position it names. The repeat is where that chain of pointers loops back on itself.

### Constraints

- Do not change the list, and use only constant extra space.`,
    tests: [[[1, 3, 4, 2, 2]], [[3, 1, 3, 4, 2]], [[1, 1]], [[2, 2, 2, 2]], [[1, 4, 4, 2, 4]]],
    ref: (a: number[]) => a.find((x, i) => a.indexOf(x) !== i),
  },
  {
    section: "Linked List", pattern: "Reversal in groups", title: "Flip In Groups", difficulty: "hard",
    fn: "reverse_k_group", params: [["head", "ListNode"], ["size", "int"]], returns: "ListNode",
    brief: `Walk the list from the front, \`size\` nodes at a time, and reverse each full group. A final group with fewer than \`size\` nodes stays as it is.

### Constraints

- \`size\` is at least 1. The list may be empty.
- Relink the nodes; do not just swap values.`,
    tests: [[[1, 2, 3, 4, 5], 2], [[1, 2, 3, 4, 5], 3], [[1], 1], [[], 2], [[1, 2, 3, 4], 4], [[1, 2, 3], 1]],
    ref: (a: number[], k: number) => { const out: number[] = []; for (let i = 0; i < a.length; i += k) { const g = a.slice(i, i + k); out.push(...(g.length === k ? g.reverse() : g)); } return out; },
  },
  {
    section: "Linked List", pattern: "Merge operations", title: "Zip Two Sorted Lists", difficulty: "easy",
    fn: "merge_two_lists", params: [["first", "ListNode"], ["second", "ListNode"]], returns: "ListNode",
    brief: `Both linked lists are sorted. Merge them into one sorted list by relinking their nodes.

### Constraints

- Either list may be empty.`,
    tests: [[[1, 2, 4], [1, 3, 4]], [[], [0]], [[], []], [[5], [1, 2, 3]], [[-3, 10], [-3, 0, 11]]],
    ref: (a: number[], b: number[]) => [...a, ...b].sort((x, y) => x - y),
  },
  {
    section: "Linked List", pattern: "Dummy node", title: "Remove From The End", difficulty: "medium",
    fn: "remove_nth_from_end", params: [["head", "ListNode"], ["n", "int"]], returns: "ListNode",
    brief: `Remove the \`n\`th node counting from the end (1 is the last node) and return the head.

### Constraints

- \`n\` is between 1 and the list's length.
- Removing the first node is the case that breaks most solutions. A dummy node in front of the head avoids it.`,
    tests: [[[1, 2, 3, 4, 5], 2], [[1], 1], [[1, 2], 1], [[1, 2], 2], [[4, 5, 6], 3]],
    ref: (a: number[], n: number) => a.filter((_, i) => i !== a.length - n),
  },

  /* ===== Stack & Queue ===== */
  {
    section: "Stack & Queue", pattern: "Monotonic stack (next greater)", title: "Wait For Warmth", difficulty: "medium",
    fn: "daily_temperatures", params: [["temps", "int[]"]], returns: "int[]",
    brief: `For each day, return how many days you must wait for a warmer temperature, or 0 if none comes.

### Constraints

- Checking every later day for every day is too slow. Keep a stack of days still waiting.`,
    tests: [[[73, 74, 75, 71, 69, 72, 76, 73]], [[30, 40, 50, 60]], [[30, 60, 90]], [[90, 80, 70]], [[50]], [[]]],
    ref: (t: number[]) => t.map((x, i) => { const j = t.findIndex((y, k) => k > i && y > x); return j < 0 ? 0 : j - i; }),
  },
  {
    section: "Stack & Queue", pattern: "Monotonic queue (sliding window max)", title: "Biggest In Every Window", difficulty: "hard",
    fn: "window_maxes", params: [["nums", "int[]"], ["width", "int"]], returns: "int[]",
    brief: `Slide a window of the given width along the list, one position at a time, and return the biggest number in each window.

### Constraints

- The width is at least 1 and never larger than the list.
- Checking every window from scratch is too slow. Keep a queue of candidates in decreasing order.`,
    tests: [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [[1], 1], [[9, 8, 7, 6], 2], [[1, 2, 3, 4], 4], [[-7, -8, -9], 1], [[4, 2, 12, 3, 8, 1], 2]],
    ref: (a: number[], w: number) => a.slice(0, a.length - w + 1).map((_, i) => Math.max(...a.slice(i, i + w))),
  },
  {
    section: "Stack & Queue", pattern: "Bracket matching", title: "Matching Brackets", difficulty: "easy",
    fn: "brackets_match", params: [["text", "string"]], returns: "bool",
    brief: `The text contains only \`(\`, \`)\`, \`[\`, \`]\`, \`{\` and \`}\`. Return whether every bracket is closed by the matching kind, in the right order.

### Constraints

- Empty text counts as matching.`,
    tests: [["()[]{}"], ["(]"], [""], ["([{}])"], ["((("], ["}{"], ["([)]"]],
    ref: (s: string) => { const st: string[] = []; const pair: Record<string, string> = { ")": "(", "]": "[", "}": "{" }; for (const c of s) { if (pair[c]) { if (st.pop() !== pair[c]) return false; } else st.push(c); } return st.length === 0; },
  },
  {
    section: "Stack & Queue", pattern: "Min stack design", title: "Stack That Knows Its Minimum", difficulty: "medium",
    fn: "min_stack", params: [["ops", "string[]"], ["values", "int[]"]], returns: "int[]",
    brief: `Run the operations in order on a stack. \`values[i]\` belongs to \`ops[i]\` and matters only for \`push\` (it is 0 otherwise).

- \`push\`: put the value on top
- \`pop\`: remove the top
- \`top\`: report the top value
- \`min\`: report the smallest value in the stack

Return every reported value, in order.

### Constraints

- \`pop\`, \`top\` and \`min\` are never called on an empty stack.
- Every operation must take constant time. Scanning the stack for \`min\` is not allowed.`,
    tests: [
      [["push", "push", "push", "min", "pop", "top", "min"], [-2, 0, -3, 0, 0, 0, 0]],
      [["push", "min"], [5, 0]],
      [["push", "push", "min", "pop", "min"], [1, 1, 0, 0, 0]],
      [["push", "push", "push", "pop", "pop", "min", "top"], [3, 2, 1, 0, 0, 0, 0]],
    ],
    ref: (ops: string[], vals: number[]) => { const st: number[] = [], out: number[] = []; ops.forEach((op, i) => { if (op === "push") st.push(vals[i]!); else if (op === "pop") st.pop(); else if (op === "top") out.push(st[st.length - 1]!); else out.push(Math.min(...st)); }); return out; },
  },

  /* ===== Binary Search ===== */
  {
    section: "Binary Search", pattern: "Classic search on a sorted array", title: "Find It Fast", difficulty: "easy",
    fn: "binary_search", params: [["sorted_nums", "int[]"], ["target", "int"]], returns: "int",
    brief: `The list is sorted with no repeats. Return the position of \`target\`, or -1 if it is not there.

### Constraints

- Halve the search range each step.`,
    tests: [[[-1, 0, 3, 5, 9, 12], 9], [[-1, 0, 3, 5, 9, 12], 2], [[], 1], [[5], 5], [[1, 2, 3, 4, 5, 6, 7, 8], 1], [[1, 2, 3, 4, 5, 6, 7, 8], 8]],
    ref: (a: number[], t: number) => a.indexOf(t),
  },
  {
    section: "Binary Search", pattern: "Binary search the answer", title: "Eating Pace", difficulty: "medium",
    fn: "min_eating_speed", params: [["piles", "int[]"], ["hours", "int"]], returns: "int",
    brief: `Each pile has some bananas. Every hour you choose one pile and eat up to \`k\` bananas from it. A pile with fewer than \`k\` still takes the whole hour.

Return the smallest \`k\` that finishes every pile within \`hours\`.

### Constraints

- \`hours\` is at least the number of piles.
- Piles can be huge, so trying every \`k\` from 1 upwards is too slow.`,
    tests: [[[3, 6, 7, 11], 8], [[30, 11, 23, 4, 20], 5], [[30, 11, 23, 4, 20], 6], [[1000000000], 2], [[1, 1, 1, 1], 4], [[312884470], 968709470]],
    ref: minSpeed,
  },
  {
    section: "Binary Search", pattern: "Search in a rotated sorted array", title: "Turned Around", difficulty: "medium",
    fn: "search_rotated", params: [["nums", "int[]"], ["target", "int"]], returns: "int",
    brief: `A sorted list with no repeats was rotated: some prefix was moved to the end, like \`[4, 5, 6, 7, 0, 1, 2]\`. Return the position of \`target\`, or -1.

### Constraints

- It must be faster than checking every element. One half of the range is always sorted.`,
    tests: [[[4, 5, 6, 7, 0, 1, 2], 0], [[4, 5, 6, 7, 0, 1, 2], 3], [[1], 0], [[1], 1], [[3, 1], 1], [[5, 1, 3], 5]],
    ref: (a: number[], t: number) => a.indexOf(t),
  },
  {
    section: "Binary Search", pattern: "Finding boundaries", title: "First And Last", difficulty: "medium",
    fn: "search_range", params: [["sorted_nums", "int[]"], ["target", "int"]], returns: "int[]",
    brief: `The list is sorted and may repeat. Return \`[first, last]\`, the first and last positions of \`target\`, or \`[-1, -1]\` if it is absent.

### Constraints

- Run two binary searches, one for each boundary.`,
    tests: [[[5, 7, 7, 8, 8, 10], 8], [[5, 7, 7, 8, 8, 10], 6], [[], 0], [[1], 1], [[2, 2, 2, 2], 2], [[1, 2, 3], 3]],
    ref: (a: number[], t: number) => [a.indexOf(t), a.lastIndexOf(t)],
  },

  /* ===== Trees ===== */
  {
    section: "Trees", pattern: "DFS: preorder, inorder, postorder", title: "Three Walks", difficulty: "easy",
    fn: "traversals", params: [["root", "TreeNode"]], returns: "int[][]",
    brief: `Return three lists: the values in preorder (node, left, right), inorder (left, node, right) and postorder (left, right, node).

### Constraints

- The tree may be empty, in which case return three empty lists.`,
    tests: [[[1, null, 2, 3]], [[1, 2, 3, 4, 5]], [[]], [[1]], [[4, 2, 6, 1, 3, 5, 7]]],
    ref: (a: (number | null)[]) => { const pre: number[] = [], ino: number[] = [], post: number[] = []; const go = (n: Node | null) => { if (!n) return; pre.push(n.val); go(n.left); ino.push(n.val); go(n.right); post.push(n.val); }; go(tree(a)); return [pre, ino, post]; },
  },
  {
    section: "Trees", pattern: "BFS / level order", title: "Average Per Level", difficulty: "easy",
    fn: "level_averages", params: [["root", "TreeNode"]], returns: "double[]",
    brief: `Return the average value of the nodes on each level, from the root down.

### Constraints

- The tree may be empty.
- Answers are compared to 6 decimal places.`,
    tests: [[[3, 9, 20, null, null, 15, 7]], [[1]], [[]], [[1, 2, 3, 4]], [[5, 1, 2, 7, null, null, 8]]],
    ref: (a: (number | null)[]) => { const out: number[] = []; let q = [tree(a)].filter(Boolean) as Node[]; while (q.length) { out.push(sum(q.map((n) => n.val)) / q.length); q = q.flatMap((n) => [n.left, n.right].filter(Boolean) as Node[]); } return out; },
  },
  {
    section: "Trees", pattern: "Binary search tree operations", title: "Insert Into The Search Tree", difficulty: "medium",
    fn: "insert_into_bst", params: [["root", "TreeNode"], ["value", "int"]], returns: "TreeNode",
    brief: `The tree is a binary search tree: everything left of a node is smaller, everything right is bigger. Insert \`value\` as a new leaf in the only place it can go, and return the root.

### Constraints

- \`value\` is not already in the tree. The tree may be empty.`,
    tests: [[[4, 2, 7, 1, 3], 5], [[40, 20, 60, 10, 30, 50, 70], 25], [[], 5], [[5], 3], [[5, null, 8], 9]],
    ref: (a: (number | null)[], v: number) => { const root = tree(a); const node = { val: v, left: null, right: null }; if (!root) return level(node); let n = root; for (;;) { if (v < n.val) { if (!n.left) { n.left = node; break; } n = n.left; } else { if (!n.right) { n.right = node; break; } n = n.right; } } return level(root); },
  },
  {
    section: "Trees", pattern: "Lowest common ancestor", title: "Shared Ancestor", difficulty: "medium",
    fn: "lowest_common_ancestor", params: [["root", "TreeNode"], ["p", "int"], ["q", "int"]], returns: "int",
    brief: `Values in the tree are all different. Return the value of the lowest node that has both \`p\` and \`q\` beneath it. A node counts as beneath itself.

### Constraints

- Both values are in the tree. It is an ordinary binary tree, not a search tree.`,
    tests: [[[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 4], [[1, 2], 1, 2], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 7, 8], [[1], 1, 1]],
    ref: (a: (number | null)[], p: number, q: number) => { const path = (n: Node | null, v: number): number[] | null => { if (!n) return null; if (n.val === v) return [v]; const s = path(n.left, v) ?? path(n.right, v); return s ? [n.val, ...s] : null; }; const r = tree(a), A = path(r, p)!, B = path(r, q)!; let i = 0; while (i < A.length && A[i] === B[i]) i++; return A[i - 1]; },
  },
  {
    section: "Trees", pattern: "Construction from traversals", title: "Rebuild The Tree", difficulty: "hard",
    fn: "build_tree", params: [["preorder", "int[]"], ["inorder", "int[]"]], returns: "TreeNode",
    brief: `Given a tree's preorder and inorder walks, rebuild the tree and return its root.

### Constraints

- Values are all different, so the tree is unique. Both lists may be empty.`,
    tests: [[[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], [[-1], [-1]], [[], []], [[1, 2], [2, 1]], [[1, 2, 3], [1, 2, 3]], [[1, 2, 4, 5, 3, 6], [4, 2, 5, 1, 6, 3]]],
    ref: (pre: number[], ino: number[]) => { const go = (p: number[], i: number[]): Node | null => { if (!p.length) return null; const k = i.indexOf(p[0]!); return { val: p[0]!, left: go(p.slice(1, k + 1), i.slice(0, k)), right: go(p.slice(k + 1), i.slice(k + 1)) }; }; return level(go(pre, ino)); },
  },
  {
    section: "Trees", pattern: "Trie: autocomplete", title: "Suggest Three", difficulty: "medium",
    fn: "autocomplete", params: [["words", "string[]"], ["prefix", "string"]], returns: "string[]",
    brief: `Return up to three words that start with \`prefix\`, in alphabetical order.

### Constraints

- Words are lowercase and all different. The prefix may be empty.
- Imagine the word list is huge and many prefixes get asked. A trie answers each one without scanning every word.`,
    tests: [[["mobile", "mouse", "moneypot", "monitor", "mousepad"], "mou"], [["havana"], "tatiana"], [["apple", "app", "apt", "bat"], "ap"], [["b", "a", "c", "d"], ""], [["car", "card", "care", "cart", "cat"], "car"]],
    ref: (w: string[], p: string) => w.filter((x) => x.startsWith(p)).sort().slice(0, 3),
  },
  {
    section: "Trees", pattern: "Trie: word search", title: "Words In The Grid", difficulty: "hard", unordered: true,
    fn: "find_words", params: [["board", "string[][]"], ["words", "string[]"]], returns: "string[]",
    brief: `Return every word from the list that can be traced on the board. A word is traced by moving up, down, left or right between letters without reusing a cell. The words may come in any order.

### Constraints

- Words are all different.
- Put the words in a trie and walk the board once, rather than searching for each word separately.`,
    tests: [
      [[["o", "a", "a", "n"], ["e", "t", "a", "e"], ["i", "h", "k", "r"], ["i", "f", "l", "v"]], ["oath", "pea", "eat", "rain"]],
      [[["a", "b"], ["c", "d"]], ["abcb"]],
      [[["a"]], ["a", "b"]],
      [[["a", "b"], ["c", "d"]], ["ab", "abdc", "acdb", "ad"]],
    ],
    ref: (b: string[][], w: string[]) => w.filter((x) => wordInGrid(b, x)),
  },
  {
    section: "Trees", pattern: "Fenwick tree / segment tree", title: "Totals That Change", difficulty: "hard",
    fn: "range_sum_queries", params: [["nums", "int[]"], ["ops", "int[][]"]], returns: "int[]",
    brief: `Run the operations in order:

- \`[0, i, value]\`: set \`nums[i]\` to \`value\`
- \`[1, left, right]\`: report the total of \`nums[left..right]\`, both ends included

Return every reported total, in order.

### Constraints

- There can be many updates and queries. Recomputing a prefix sum after every update is too slow. Use a Fenwick tree or a segment tree.`,
    tests: [[[1, 3, 5], [[1, 0, 2], [0, 1, 2], [1, 0, 2]]], [[7], [[1, 0, 0], [0, 0, -3], [1, 0, 0]]], [[1, 2, 3, 4, 5], [[1, 1, 3], [0, 4, 10], [1, 0, 4], [1, 4, 4]]], [[0, 0, 0], [[0, 0, 5], [0, 2, 5], [1, 0, 2], [1, 1, 1]]]],
    ref: (n: number[], ops: number[][]) => { const a = [...n], out: number[] = []; for (const [t, x, y] of ops) { if (t === 0) a[x!] = y!; else out.push(sum(a.slice(x, y! + 1))); } return out; },
  },
  {
    section: "Trees", pattern: "Tree DP", title: "Robbing The Tree", difficulty: "hard",
    fn: "rob_tree", params: [["root", "TreeNode"]], returns: "int",
    brief: `Each node holds money. You may take from any set of nodes, as long as you never take from both a node and its direct parent. Return the most you can take.

### Constraints

- The tree may be empty. Every value is zero or more.
- For each node, work out two answers: the best if you take it and the best if you do not.`,
    tests: [[[3, 2, 3, null, 3, null, 1]], [[3, 4, 5, 1, 3, null, 1]], [[]], [[7]], [[4, 1, null, 2, null, 3]]],
    ref: (a: (number | null)[]) => { const go = (n: Node | null): [number, number] => { if (!n) return [0, 0]; const l = go(n.left), r = go(n.right); return [n.val + l[1] + r[1], Math.max(...l) + Math.max(...r)]; }; return Math.max(...go(tree(a))); },
  },

  /* ===== Graphs ===== */
  {
    section: "Graphs", pattern: "BFS traversal", title: "Spreading Rot", difficulty: "medium",
    fn: "oranges_rotting", params: [["grid", "int[][]"]], returns: "int",
    brief: `Each cell is 0 (empty), 1 (fresh orange) or 2 (rotten orange). Every minute, each fresh orange next to a rotten one (up, down, left or right) goes rotten.

Return the minutes until no fresh orange is left, or -1 if some can never rot.

### Constraints

- A grid with no fresh oranges takes 0 minutes.`,
    tests: [[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], [[[0, 2]]], [[[1]]], [[[2, 2], [1, 1], [0, 0], [2, 0]]]],
    ref: (g0: number[][]) => { const g = g0.map((r) => [...r]); let q: number[][] = []; g.forEach((r, i) => r.forEach((v, j) => { if (v === 2) q.push([i, j]); })); let t = 0; for (;;) { const next: number[][] = []; for (const [i, j] of q) for (const [di, dj] of DIRS) { const a = i! + di, b = j! + dj; if (g[a]?.[b] === 1) { g[a]![b] = 2; next.push([a, b]); } } if (!next.length) break; q = next; t++; } return g.some((r) => r.includes(1)) ? -1 : t; },
  },
  {
    section: "Graphs", pattern: "Union-Find (cycle detection)", title: "The Extra Wire", difficulty: "medium",
    fn: "redundant_connection", params: [["edges", "int[][]"]], returns: "int[]",
    brief: `A network of computers numbered 1 to \`n\` was a tree, then one extra wire was added. The wires are listed as \`[a, b]\`. Return the wire you could remove to make it a tree again. If several would work, return the one listed last.

### Constraints

- There are \`n\` wires for \`n\` computers.
- Union-Find: the first wire whose two ends are already connected is the answer.`,
    tests: [[[[1, 2], [1, 3], [2, 3]]], [[[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]], [[[1, 2], [2, 3], [3, 1]]], [[[3, 4], [1, 2], [2, 4], [3, 5], [2, 5]]]],
    ref: (e: number[][]) => { const uf = unionFind(e.length + 1); return e.find(([a, b]) => !uf.union(a!, b!)); },
  },
  {
    section: "Graphs", pattern: "Topological sort (Kahn's algorithm)", title: "Course Order", difficulty: "medium",
    fn: "course_order", params: [["courses", "int"], ["prereqs", "int[][]"]], returns: "int[]",
    brief: `Courses are numbered 0 to \`courses - 1\`. Each prerequisite \`[a, b]\` means \`b\` must be taken before \`a\`.

Return an order that takes every course. When several courses are available at once, take the lowest-numbered first, so the answer is unique. Return an empty list if it is impossible.

### Constraints

- Kahn's algorithm, using a min-heap for the courses that are ready.`,
    tests: [[2, [[1, 0]]], [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], [2, [[1, 0], [0, 1]]], [1, []], [3, []], [4, [[0, 3], [1, 3], [2, 1]]]],
    ref: (n: number, pr: number[][]) => { const indeg = new Array(n).fill(0); for (const [a] of pr) indeg[a!]++; const out: number[] = []; const done = new Set<number>(); while (out.length < n) { const c = indeg.findIndex((d, i) => d === 0 && !done.has(i)); if (c < 0) return []; done.add(c); out.push(c); for (const [a, b] of pr) if (b === c) indeg[a!]--; } return out; },
  },
  {
    section: "Graphs", pattern: "Shortest path: Dijkstra", title: "Signal Delay", difficulty: "medium",
    fn: "network_delay", params: [["times", "int[][]"], ["nodes", "int"], ["start", "int"]], returns: "int",
    brief: `Nodes are numbered 0 to \`nodes - 1\`. Each entry \`[from, to, time]\` is a one-way link. A signal leaves \`start\`.

Return the time until every node has received it, or -1 if some node never does.

### Constraints

- Times are positive.`,
    tests: [[[[1, 0, 1], [1, 2, 1], [2, 3, 1]], 4, 1], [[[0, 1, 1]], 2, 0], [[[0, 1, 1]], 2, 1], [[], 1, 0], [[[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1]], 4, 0]],
    ref: (e: number[][], n: number, k: number) => { const d = new Array(n).fill(Infinity); d[k] = 0; const seen = new Set<number>(); for (;;) { let u = -1; for (let i = 0; i < n; i++) if (!seen.has(i) && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i; if (u < 0) break; seen.add(u); for (const [a, b, w] of e) if (a === u) d[b!] = Math.min(d[b!], d[u] + w!); } const m = Math.max(...d); return m === Infinity ? -1 : m; },
  },
  {
    section: "Graphs", pattern: "Shortest path: Bellman-Ford", title: "Cheapest With Few Stops", difficulty: "hard",
    fn: "cheapest_flight", params: [["cities", "int"], ["flights", "int[][]"], ["src", "int"], ["dst", "int"], ["max_stops", "int"]], returns: "int",
    brief: `Each flight is \`[from, to, price]\`, one way. Return the cheapest price from \`src\` to \`dst\` with at most \`max_stops\` stops in between, or -1 if no route fits.

### Constraints

- Relax every flight \`max_stops + 1\` times, each round starting from a copy of the previous round's prices. That is Bellman-Ford with a limited number of rounds.`,
    tests: [[4, [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], 0, 3, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0], [2, [], 0, 1, 5], [3, [[0, 1, 2], [1, 2, 1], [2, 0, 10]], 1, 2, 1]],
    ref: (n: number, f: number[][], s: number, t: number, k: number) => { let d = new Array(n).fill(Infinity); d[s] = 0; for (let i = 0; i <= k; i++) { const nd = [...d]; for (const [a, b, w] of f) if (d[a!] + w! < nd[b!]) nd[b!] = d[a!] + w!; d = nd; } return d[t] === Infinity ? -1 : d[t]; },
  },
  {
    section: "Graphs", pattern: "Shortest path: Floyd-Warshall", title: "Quietest City", difficulty: "medium",
    fn: "city_fewest_neighbors", params: [["cities", "int"], ["roads", "int[][]"], ["limit", "int"]], returns: "int",
    brief: `Each road is \`[a, b, distance]\` and works both ways. For each city, count the other cities within \`limit\` distance. Return the city with the smallest count. On a tie, return the highest-numbered city.

### Constraints

- Work out all-pairs shortest distances first.`,
    tests: [[4, [[0, 1, 3], [1, 2, 1], [1, 3, 4], [2, 3, 1]], 4], [5, [[0, 1, 2], [0, 4, 8], [1, 2, 3], [1, 4, 2], [2, 3, 1], [3, 4, 1]], 2], [2, [], 5], [3, [[0, 1, 1], [1, 2, 1]], 1]],
    ref: (n: number, e: number[][], lim: number) => { const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity))); for (const [a, b, w] of e) { d[a!]![b!] = Math.min(d[a!]![b!]!, w!); d[b!]![a!] = Math.min(d[b!]![a!]!, w!); } for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i]![j] = Math.min(d[i]![j]!, d[i]![k]! + d[k]![j]!); let best = -1, bestCount = Infinity; for (let i = 0; i < n; i++) { const c = d[i]!.filter((x, j) => j !== i && x <= lim).length; if (c <= bestCount) { bestCount = c; best = i; } } return best; },
  },
  {
    section: "Graphs", pattern: "Minimum spanning tree: Prim's", title: "Wire Up The Points", difficulty: "medium",
    fn: "min_cost_connect_points", params: [["points", "int[][]"]], returns: "int",
    brief: `Each point is \`[x, y]\`. Joining two points costs \`|x1 - x2| + |y1 - y2|\`. Return the cheapest total that connects every point.

### Constraints

- There is at least one point. Every pair can be joined, so Prim's algorithm on the full graph works well.`,
    tests: [[[[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]], [[[3, 12], [-2, 5], [-4, 1]]], [[[0, 0]]], [[[0, 0], [1, 1], [1, 0], [-1, 1]]]],
    ref: (p: number[][]) => { const n = p.length, inTree = new Array(n).fill(false), d = new Array(n).fill(Infinity); d[0] = 0; let total = 0; for (let k = 0; k < n; k++) { let u = -1; for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || d[i] < d[u])) u = i; inTree[u] = true; total += d[u]; for (let v = 0; v < n; v++) d[v] = Math.min(d[v], Math.abs(p[u]![0]! - p[v]![0]!) + Math.abs(p[u]![1]! - p[v]![1]!)); } return total; },
  },
  {
    section: "Graphs", pattern: "Bipartite check", title: "Two Teams", difficulty: "medium",
    fn: "is_bipartite", params: [["people", "int"], ["rivalries", "int[][]"]], returns: "bool",
    brief: `People are numbered 0 to \`people - 1\`. Each rivalry \`[a, b]\` means \`a\` and \`b\` must be on different teams. Return whether everyone can be split into two teams.

### Constraints

- Some people may have no rivalries at all.`,
    tests: [[4, [[0, 1], [1, 2], [2, 3], [3, 0]]], [3, [[0, 1], [1, 2], [2, 0]]], [1, []], [5, [[0, 1], [2, 3], [3, 4]]], [4, [[0, 1], [0, 2], [0, 3], [1, 2]]]],
    ref: (n: number, e: number[][]) => { const c = new Array(n).fill(-1); for (let s = 0; s < n; s++) { if (c[s] >= 0) continue; c[s] = 0; const q = [s]; while (q.length) { const u = q.shift()!; for (const [a, b] of e) { const v = a === u ? b! : b === u ? a! : -1; if (v < 0) continue; if (c[v] < 0) { c[v] = 1 - c[u]; q.push(v); } else if (c[v] === c[u]) return false; } } } return true; },
  },
  {
    section: "Graphs", pattern: "Strongly connected components", title: "Mutually Reachable", difficulty: "hard",
    fn: "count_scc", params: [["nodes", "int"], ["edges", "int[][]"]], returns: "int",
    brief: `Edges \`[from, to]\` are one-way. A strongly connected group is a set of nodes where each can reach every other. Return how many such groups the graph splits into. A lone node is a group of its own.

### Constraints

- Use Tarjan's or Kosaraju's algorithm.`,
    tests: [[5, [[1, 0], [0, 2], [2, 1], [0, 3], [3, 4]]], [3, [[0, 1], [1, 2], [2, 0]]], [3, []], [4, [[0, 1], [1, 2], [2, 3]]], [6, [[0, 1], [1, 0], [2, 3], [3, 4], [4, 2], [4, 5]]]],
    ref: (n: number, e: number[][]) => { const reach = (s: number) => { const seen = new Set([s]), st = [s]; while (st.length) { const u = st.pop()!; for (const [a, b] of e) if (a === u && !seen.has(b!)) { seen.add(b!); st.push(b!); } } return seen; }; const R = Array.from({ length: n }, (_, i) => reach(i)); const label = new Array(n).fill(-1); let groups = 0; for (let i = 0; i < n; i++) { if (label[i] >= 0) continue; for (let j = 0; j < n; j++) if (R[i]!.has(j) && R[j]!.has(i)) label[j] = groups; groups++; } return groups; },
  },

  /* ===== Backtracking ===== */
  {
    section: "Backtracking", pattern: "Permutations", title: "Every Order", difficulty: "medium", unordered: true,
    fn: "permutations", params: [["nums", "int[]"]], returns: "int[][]",
    brief: `The numbers are all different. Return every possible ordering of them, in any order.

### Constraints

- The list has between 1 and 6 numbers.`,
    tests: [[[1, 2, 3]], [[0, 1]], [[1]], [[5, -1, 2, 9]]],
    ref: (a: number[]) => { const out: number[][] = []; const go = (p: number[], rest: number[]) => { if (!rest.length) out.push(p); rest.forEach((x, i) => go([...p, x], rest.filter((_, j) => j !== i))); }; go([], a); return out; },
  },
  {
    section: "Backtracking", pattern: "Combinations", title: "Make The Total", difficulty: "medium", unordered: true,
    fn: "combination_sum", params: [["candidates", "int[]"], ["target", "int"]], returns: "int[][]",
    brief: `Candidates are different positive numbers, and each may be used any number of times. Return every combination that adds up to \`target\`, each written smallest first. The combinations may come in any order.

### Constraints

- No combination may appear twice. \`[2, 2, 3]\` and \`[2, 3, 2]\` are the same combination.`,
    tests: [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[2], 1], [[1], 2], [[7, 3, 2], 18]],
    ref: (c: number[], t: number) => { const s = [...c].sort((a, b) => a - b), out: number[][] = []; const go = (i: number, left: number, p: number[]) => { if (left === 0) { out.push(p); return; } for (let j = i; j < s.length && s[j]! <= left; j++) go(j, left - s[j]!, [...p, s[j]!]); }; go(0, t, []); return out; },
  },
  {
    section: "Backtracking", pattern: "Subsets (power set)", title: "Every Selection", difficulty: "medium", unordered: true,
    fn: "subsets", params: [["nums", "int[]"]], returns: "int[][]",
    brief: `The numbers are all different. Return every subset, including the empty one. Inside a subset, keep the numbers in the order they appear in the input. The subsets may come in any order.

### Constraints

- The list has at most 10 numbers.`,
    tests: [[[1, 2, 3]], [[0]], [[]], [[4, 1]], [[3, 1, 2, 5]]],
    ref: (a: number[]) => Array.from({ length: 1 << a.length }, (_, m) => a.filter((_, i) => m & (1 << i))),
  },
  {
    section: "Backtracking", pattern: "N-Queens", title: "Peaceful Queens", difficulty: "hard",
    fn: "n_queens", params: [["n", "int"]], returns: "int",
    brief: `Return how many ways \`n\` chess queens can be placed on an \`n × n\` board so that no two attack each other.

### Constraints

- \`n\` is between 1 and 10.
- Place one queen per row and backtrack as soon as a column or diagonal clashes.`,
    tests: [[4], [1], [2], [6], [8], [10]],
    ref: (n: number) => { let count = 0; const go = (r: number, cols: number[], ) => { if (r === n) { count++; return; } for (let c = 0; c < n; c++) if (cols.every((cc, rr) => cc !== c && Math.abs(cc - c) !== r - rr)) go(r + 1, [...cols, c]); }; go(0, []); return count; },
  },
  {
    section: "Backtracking", pattern: "Word search with pruning", title: "Trace The Word", difficulty: "medium",
    fn: "word_exists", params: [["board", "string[][]"], ["word", "string"]], returns: "bool",
    brief: `Return whether \`word\` can be traced on the board by moving up, down, left or right between letters, never reusing a cell.

### Constraints

- The word is not empty. Stop exploring a path the moment a letter does not match.`,
    tests: [[[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCCED"], [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCB"], [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "SEE"], [[["a"]], "a"], [[["a", "a"]], "aaa"]],
    ref: wordInGrid,
  },
  {
    section: "Backtracking", pattern: "Sudoku solving", title: "Finish The Sudoku", difficulty: "hard",
    fn: "solve_sudoku", params: [["board", "string[][]"]], returns: "string[][]",
    brief: `Fill the empty cells, marked \`"."\`, so that every row, column and 3 × 3 box holds the digits 1 to 9 exactly once. Return the completed board.

### Constraints

- Every puzzle has exactly one solution.`,
    tests: [
      [["53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1", "7...2...6", ".6....28.", "...419..5", "....8..79"].map((r) => [...r])],
      [["..9748...", "7........", ".2.1.9...", "..7...24.", ".64.1.59.", ".98...3..", "...8.3.2.", "........6", "...2759.."].map((r) => [...r])],
      [["534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "34528617."].map((r) => [...r])],
    ],
    ref: (b: string[][]) => sudokuSolutions(b, 1)[0],
  },

  /* ===== Dynamic Programming ===== */
  {
    section: "Dynamic Programming", pattern: "1D DP (house robber)", title: "Quiet Burglar", difficulty: "medium",
    fn: "house_robber", params: [["houses", "int[]"]], returns: "int",
    brief: `Each house on a street holds some money. You cannot rob two houses next to each other. Return the most you can take.

### Constraints

- The street may be empty. Amounts are zero or more.`,
    tests: [[[1, 2, 3, 1]], [[2, 7, 9, 3, 1]], [[]], [[5]], [[2, 1, 1, 2]], [[0, 0, 0]]],
    ref: (a: number[]) => { let take = 0, skip = 0; for (const x of a) [take, skip] = [skip + x, Math.max(take, skip)]; return Math.max(take, skip); },
  },
  {
    section: "Dynamic Programming", pattern: "2D DP (unique paths)", title: "Paths Across The Grid", difficulty: "medium",
    fn: "unique_paths", params: [["rows", "int"], ["cols", "int"]], returns: "int",
    brief: `A robot starts at the top-left of a \`rows × cols\` grid and can only move right or down. Return how many different paths reach the bottom-right.

### Constraints

- Both sizes are at least 1.`,
    tests: [[3, 7], [3, 2], [1, 1], [1, 10], [10, 10], [23, 12]],
    ref: (m: number, n: number) => { const d = new Array(n).fill(1); for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) d[j] += d[j - 1]; return d[n - 1]; },
  },
  {
    section: "Dynamic Programming", pattern: "2D DP (edit distance)", title: "Fewest Edits", difficulty: "hard",
    fn: "edit_distance", params: [["source", "string"], ["target", "string"]], returns: "int",
    brief: `One edit inserts, deletes or replaces a single character. Return the fewest edits that turn \`source\` into \`target\`.

### Constraints

- Either text may be empty.`,
    tests: [["horse", "ros"], ["intention", "execution"], ["", ""], ["", "abc"], ["same", "same"], ["kitten", "sitting"]],
    ref: (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = a[i - 1] === b[j - 1] ? d[i - 1]![j - 1]! : 1 + Math.min(d[i - 1]![j]!, d[i]![j - 1]!, d[i - 1]![j - 1]!); return d[a.length]![b.length]; },
  },
  {
    section: "Dynamic Programming", pattern: "0/1 knapsack", title: "Pack The Bag", difficulty: "medium",
    fn: "knapsack", params: [["weights", "int[]"], ["values", "int[]"], ["capacity", "int"]], returns: "int",
    brief: `Item \`i\` weighs \`weights[i]\` and is worth \`values[i]\`. Take each item at most once. Return the most value you can carry without going over \`capacity\`.

### Constraints

- Weights are positive. There may be no items.`,
    tests: [[[1, 3, 4, 5], [1, 4, 5, 7], 7], [[10, 20, 30], [60, 100, 120], 50], [[], [], 10], [[5], [10], 4], [[1, 1, 1], [10, 20, 30], 2]],
    ref: (w: number[], v: number[], cap: number) => { const d = new Array(cap + 1).fill(0); w.forEach((wi, i) => { for (let c = cap; c >= wi; c--) d[c] = Math.max(d[c], d[c - wi] + v[i]!); }); return d[cap]; },
  },
  {
    section: "Dynamic Programming", pattern: "Unbounded knapsack", title: "Fewest Coins", difficulty: "medium",
    fn: "coin_change", params: [["coins", "int[]"], ["amount", "int"]], returns: "int",
    brief: `You have unlimited coins of each value. Return the fewest coins that make exactly \`amount\`, or -1 if it cannot be made.

### Constraints

- An amount of 0 takes 0 coins.
- Always taking the biggest coin does not work: with coins 1, 3 and 4, making 6 greedily takes three coins, but 3 + 3 takes two.`,
    tests: [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[1, 3, 4], 6], [[186, 419, 83, 408], 6249], [[5, 10], 1]],
    ref: (c: number[], amt: number) => { const d = new Array(amt + 1).fill(Infinity); d[0] = 0; for (let a = 1; a <= amt; a++) for (const x of c) if (x <= a) d[a] = Math.min(d[a], d[a - x] + 1); return d[amt] === Infinity ? -1 : d[amt]; },
  },
  {
    section: "Dynamic Programming", pattern: "Fractional knapsack (greedy)", title: "Pack By The Gram", difficulty: "easy",
    fn: "fractional_knapsack", params: [["weights", "int[]"], ["values", "int[]"], ["capacity", "int"]], returns: "double",
    brief: `Like packing a bag, except you may take part of an item and get that fraction of its value. Return the most value you can carry.

### Constraints

- Weights are positive. Answers are compared to 6 decimal places.`,
    tests: [[[10, 20, 30], [60, 100, 120], 50], [[10], [20], 5], [[], [], 10], [[1, 2, 3], [10, 10, 10], 100], [[4, 8], [10, 30], 10]],
    ref: (w: number[], v: number[], cap: number) => { const items = w.map((wi, i) => [wi, v[i]!] as const).sort((a, b) => b[1] / b[0] - a[1] / a[0]); let left = cap, total = 0; for (const [wi, vi] of items) { const take = Math.min(wi, left); total += (vi * take) / wi; left -= take; } return total; },
  },
  {
    section: "Dynamic Programming", pattern: "Longest common subsequence", title: "Shared Thread", difficulty: "medium",
    fn: "lcs", params: [["first", "string"], ["second", "string"]], returns: "int",
    brief: `A subsequence keeps some characters in their original order, not necessarily next to each other. Return the length of the longest subsequence the two texts share.

### Constraints

- Either text may be empty.`,
    tests: [["abcde", "ace"], ["abc", "abc"], ["abc", "def"], ["", "x"], ["AGGTAB", "GXTXAYB"], ["bsbininm", "jmjkbkjkv"]],
    ref: (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = a[i - 1] === b[j - 1] ? d[i - 1]![j - 1]! + 1 : Math.max(d[i - 1]![j]!, d[i]![j - 1]!); return d[a.length]![b.length]; },
  },
  {
    section: "Dynamic Programming", pattern: "Longest increasing subsequence", title: "Always Climbing", difficulty: "medium",
    fn: "lis", params: [["nums", "int[]"]], returns: "int",
    brief: `Return the length of the longest subsequence whose numbers strictly increase.

### Constraints

- The list may be empty. An O(n log n) solution exists.`,
    tests: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7, 7]], [[]], [[1, 2, 3, 4, 5]], [[5, 4, 3, 2, 1]]],
    ref: (a: number[]) => { const d = a.map(() => 1); for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j]! < a[i]!) d[i] = Math.max(d[i]!, d[j]! + 1); return a.length ? Math.max(...d) : 0; },
  },
  {
    section: "Dynamic Programming", pattern: "Interval DP (matrix chain)", title: "Cheapest Multiplication Order", difficulty: "hard",
    fn: "matrix_chain", params: [["dims", "int[]"]], returns: "int",
    brief: `Matrix \`i\` has size \`dims[i] × dims[i+1]\`. Multiplying an \`a × b\` matrix by a \`b × c\` matrix costs \`a × b × c\`. Return the lowest total cost to multiply the whole chain, choosing where the brackets go.

### Constraints

- \`dims\` has at least two entries. A single matrix costs 0.`,
    tests: [[[1, 2, 3, 4]], [[10, 20, 30]], [[5, 10]], [[40, 20, 30, 10, 30]], [[10, 20, 30, 40, 30]]],
    ref: (d: number[]) => { const n = d.length - 1; const m = Array.from({ length: n }, () => new Array(n).fill(0)); for (let len = 2; len <= n; len++) for (let i = 0; i + len - 1 < n; i++) { const j = i + len - 1; m[i]![j] = Infinity; for (let k = i; k < j; k++) m[i]![j] = Math.min(m[i]![j]!, m[i]![k]! + m[k + 1]![j]! + d[i]! * d[k + 1]! * d[j + 1]!); } return m[0]![n - 1]; },
  },
  {
    section: "Dynamic Programming", pattern: "State machine DP (stock with cooldown)", title: "Trade With A Rest Day", difficulty: "hard",
    fn: "stock_cooldown", params: [["prices", "int[]"]], returns: "int",
    brief: `\`prices[i]\` is a share's price on day \`i\`. You may buy and sell as often as you like, holding at most one share at a time. After selling, you must wait a day before buying again. Return the most profit you can make.

### Constraints

- Track three states each day: holding, just sold, and resting.`,
    tests: [[[1, 2, 3, 0, 2]], [[1]], [[]], [[5, 4, 3, 2]], [[1, 2, 4]], [[6, 1, 6, 4, 3, 0, 2]]],
    ref: (p: number[]) => { let hold = -Infinity, sold = 0, rest = 0; for (const x of p) [hold, sold, rest] = [Math.max(hold, rest - x), hold + x, Math.max(rest, sold)]; return Math.max(sold, rest); },
  },
  {
    section: "Dynamic Programming", pattern: "Bitmask DP", title: "Round Trip", difficulty: "hard",
    fn: "shortest_tour", params: [["dist", "int[][]"]], returns: "int",
    brief: `\`dist[i][j]\` is the cost of travelling from city \`i\` to city \`j\`. Start at city 0, visit every city exactly once, and return to 0. Return the cheapest such tour.

### Constraints

- There are between 1 and 12 cities. One city costs 0.
- Trying every order is too slow for 12 cities. Keep the set of visited cities as a bitmask.`,
    tests: [[[[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]]], [[[0]]], [[[0, 5], [7, 0]]], [[[0, 1, 9], [9, 0, 1], [1, 9, 0]]]],
    ref: (d: number[][]) => { const n = d.length, full = 1 << n; const dp = Array.from({ length: full }, () => new Array(n).fill(Infinity)); dp[1]![0] = 0; for (let m = 1; m < full; m++) for (let u = 0; u < n; u++) { if (dp[m]![u] === Infinity) continue; for (let v = 0; v < n; v++) if (!(m & (1 << v))) dp[m | (1 << v)]![v] = Math.min(dp[m | (1 << v)]![v]!, dp[m]![u]! + d[u]![v]!); } return Math.min(...dp[full - 1]!.map((c, u) => c + d[u]![0]!)); },
  },
  {
    section: "Dynamic Programming", pattern: "Digit DP", title: "No Repeated Digits", difficulty: "hard",
    fn: "count_distinct_digit_numbers", params: [["n", "int"]], returns: "int",
    brief: `Return how many whole numbers from 1 to \`n\` have no digit that appears twice. 1234 counts; 1213 does not.

### Constraints

- \`n\` can be as large as 2,000,000,000, so checking every number is too slow. Count digit by digit.`,
    tests: [[20], [100], [1], [1000], [135], [2000000000]],
    ref: distinctDigits,
  },
  {
    section: "Dynamic Programming", pattern: "Tree DP", title: "Richest Path", difficulty: "hard",
    fn: "max_path_sum", params: [["root", "TreeNode"]], returns: "int",
    brief: `A path is any chain of nodes connected by edges, used at most once each. It does not have to pass through the root. Return the largest total of values along any non-empty path.

### Constraints

- The tree has at least one node. Values may be negative.`,
    tests: [[[1, 2, 3]], [[-10, 9, 20, null, null, 15, 7]], [[-3]], [[2, -1]], [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]]],
    ref: (a: (number | null)[]) => { let best = -Infinity; const go = (n: Node | null): number => { if (!n) return 0; const l = Math.max(0, go(n.left)), r = Math.max(0, go(n.right)); best = Math.max(best, n.val + l + r); return n.val + Math.max(l, r); }; go(tree(a)); return best; },
  },
  {
    section: "Dynamic Programming", pattern: "DP on graphs (DAG)", title: "Routes Through The Map", difficulty: "medium",
    fn: "count_dag_paths", params: [["nodes", "int"], ["edges", "int[][]"]], returns: "int",
    brief: `Edges \`[from, to]\` are one-way and never form a loop. Return how many different routes lead from node 0 to node \`nodes - 1\`.

### Constraints

- With one node, the start is the end, which is one route.
- Remember the answer for each node rather than walking the same routes again.`,
    tests: [[4, [[0, 1], [0, 2], [1, 3], [2, 3]]], [3, [[0, 1]]], [1, []], [5, [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [2, 4]]], [4, [[0, 1], [1, 2], [2, 3], [0, 3], [0, 2]]]],
    ref: (n: number, e: number[][]) => { const memo = new Map<number, number>(); const go = (u: number): number => { if (u === n - 1) return 1; if (memo.has(u)) return memo.get(u)!; const r = sum(e.filter(([a]) => a === u).map(([, b]) => go(b!))); memo.set(u, r); return r; }; return go(0); },
  },

  /* ===== Greedy ===== */
  {
    section: "Greedy", pattern: "Interval scheduling", title: "Clear The Clashes", difficulty: "medium",
    fn: "min_removals", params: [["intervals", "int[][]"]], returns: "int",
    brief: `Return the fewest intervals to remove so the rest do not overlap. Intervals that only touch, like \`[1, 2]\` and \`[2, 3]\`, do not overlap.

### Constraints

- Sort by end, and keep every interval that starts after the last one you kept.`,
    tests: [[[[1, 2], [2, 3], [3, 4], [1, 3]]], [[[1, 2], [1, 2], [1, 2]]], [[[1, 2], [2, 3]]], [[]], [[[1, 100], [11, 22], [1, 11], [2, 12]]]],
    ref: (iv: number[][]) => { const s = [...iv].sort((a, b) => a[1]! - b[1]!); let end = -Infinity, kept = 0; for (const [a, b] of s) if (a! >= end) { kept++; end = b!; } return iv.length - kept; },
  },
  {
    section: "Greedy", pattern: "Activity selection", title: "Busiest Day", difficulty: "easy",
    fn: "max_activities", params: [["starts", "int[]"], ["ends", "int[]"]], returns: "int",
    brief: `Activity \`i\` runs from \`starts[i]\` to \`ends[i]\`. You can do one at a time, and can start one at the same moment the previous one ends. Return the most activities you can do.

### Constraints

- There may be no activities.`,
    tests: [[[1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]], [[10, 12, 20], [20, 25, 30]], [[], []], [[1, 1, 1], [5, 5, 5]], [[5, 1, 3], [6, 3, 5]]],
    ref: (s: number[], e: number[]) => { const a = s.map((x, i) => [x, e[i]!] as const).sort((p, q) => p[1] - q[1]); let end = -Infinity, n = 0; for (const [x, y] of a) if (x >= end) { n++; end = y; } return n; },
  },
  {
    section: "Greedy", pattern: "Jump game", title: "Fewest Jumps", difficulty: "medium",
    fn: "min_jumps", params: [["jumps", "int[]"]], returns: "int",
    brief: `Each number is the furthest you may jump forward from that position. Return the fewest jumps to get from the first position to the last.

### Constraints

- The last position can always be reached. A single-element list needs 0 jumps.`,
    tests: [[[2, 3, 1, 1, 4]], [[2, 3, 0, 1, 4]], [[0]], [[1, 1, 1, 1]], [[10, 1, 1, 1]], [[1, 2, 1, 1, 1]]],
    ref: (a: number[]) => { const d = a.map(() => Infinity); d[0] = 0; for (let i = 0; i < a.length; i++) for (let j = 1; j <= a[i]! && i + j < a.length; j++) d[i + j] = Math.min(d[i + j]!, d[i]! + 1); return d[a.length - 1]; },
  },
  {
    section: "Greedy", pattern: "Huffman-style merging", title: "Cheapest Merges", difficulty: "medium",
    fn: "huffman_cost", params: [["weights", "int[]"]], returns: "int",
    brief: `Merging two piles costs the sum of their sizes and makes one pile of that size. Keep merging until one pile is left. Return the lowest possible total cost.

This is the cost of building a Huffman code.

### Constraints

- There is at least one pile. A single pile costs 0.
- Always merge the two smallest piles.`,
    tests: [[[2, 4, 3]], [[1, 8, 3, 5]], [[5]], [[1, 1, 1, 1]], [[5, 9, 12, 13, 16, 45]]],
    ref: (w: number[]) => { const a = [...w]; let cost = 0; while (a.length > 1) { a.sort((x, y) => x - y); const m = a.shift()! + a.shift()!; cost += m; a.push(m); } return cost; },
  },

  /* ===== Heap / Priority Queue ===== */
  {
    section: "Heap / Priority Queue", pattern: "Kth smallest", title: "Nearest To Home", difficulty: "medium", unordered: true,
    fn: "k_closest", params: [["points", "int[][]"], ["k", "int"]], returns: "int[][]",
    brief: `Each point is \`[x, y]\`. Return the \`k\` points closest to \`[0, 0]\`, in any order.

### Constraints

- The answer is always unique.
- Keep a max-heap of size \`k\` rather than sorting everything.`,
    tests: [[[[1, 3], [-2, 2]], 1], [[[3, 3], [5, -1], [-2, 4]], 2], [[[0, 1]], 1], [[[1, 1], [2, 2], [3, 3], [-1, 0]], 3]],
    ref: (p: number[][], k: number) => [...p].sort((a, b) => a[0]! ** 2 + a[1]! ** 2 - (b[0]! ** 2 + b[1]! ** 2)).slice(0, k),
  },
  {
    section: "Heap / Priority Queue", pattern: "Merge K sorted lists", title: "Merge Them All", difficulty: "hard",
    fn: "merge_k_sorted", params: [["lists", "int[][]"]], returns: "int[]",
    brief: `Each list is sorted. Merge all of them into one sorted list.

### Constraints

- There may be no lists, and any list may be empty.
- Keep a min-heap holding the front of each list.`,
    tests: [[[[1, 4, 5], [1, 3, 4], [2, 6]]], [[]], [[[]]], [[[5], [1, 2], [3]]], [[[-3, 0, 9], [-3], [10, 11]]]],
    ref: (ls: number[][]) => ls.flat().sort((a, b) => a - b),
  },
  {
    section: "Heap / Priority Queue", pattern: "Top K frequent", title: "Most Common", difficulty: "medium", unordered: true,
    fn: "top_k_frequent", params: [["nums", "int[]"], ["k", "int"]], returns: "int[]",
    brief: `Return the \`k\` numbers that appear most often, in any order.

### Constraints

- The answer is always unique.`,
    tests: [[[1, 1, 1, 2, 2, 3], 2], [[1], 1], [[4, 4, 5, 5, 5, 6], 1], [[-1, -1, 2, 2, 2, 3, 3, 3, 3], 2]],
    ref: (a: number[], k: number) => { const c = new Map<number, number>(); for (const x of a) c.set(x, (c.get(x) ?? 0) + 1); return [...c.entries()].sort((p, q) => q[1] - p[1]).slice(0, k).map(([x]) => x); },
  },
  {
    section: "Heap / Priority Queue", pattern: "Two heaps (median)", title: "Running Middle", difficulty: "hard",
    fn: "running_median", params: [["nums", "int[]"]], returns: "double[]",
    brief: `Numbers arrive one at a time. After each one, report the median of everything seen so far. With an even count, the median is the average of the two middle numbers.

### Constraints

- Answers are compared to 6 decimal places.
- Keep a max-heap for the lower half and a min-heap for the upper half.`,
    tests: [[[1, 2, 3]], [[5, 15, 1, 3]], [[]], [[-1, -2, -3, -4, -5]], [[2, 2, 2, 7]]],
    ref: (a: number[]) => a.map((_, i) => { const s = a.slice(0, i + 1).sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }),
  },

  /* ===== Bit Manipulation ===== */
  {
    section: "Bit Manipulation", pattern: "XOR tricks", title: "Two Lonely Numbers", difficulty: "medium", unordered: true,
    fn: "two_singles", params: [["nums", "int[]"]], returns: "int[]",
    brief: `Every number appears exactly twice, except two numbers that appear once. Return those two, in any order.

### Constraints

- Use constant extra space. XOR everything, then split the numbers by any bit where the two differ.`,
    tests: [[[1, 2, 1, 3, 2, 5]], [[-1, 0]], [[0, 1]], [[4, 4, 7, 9, 9, 8]]],
    ref: (a: number[]) => a.filter((x) => a.indexOf(x) === a.lastIndexOf(x)),
  },
  {
    section: "Bit Manipulation", pattern: "Bit counting", title: "Ones Up To N", difficulty: "easy",
    fn: "count_bits", params: [["n", "int"]], returns: "int[]",
    brief: `For every number from 0 to \`n\`, count the 1s in its binary form. Return the counts in order.

### Constraints

- \`i\` has the same count as \`i / 2\`, plus one if \`i\` is odd.`,
    tests: [[2], [5], [0], [16]],
    ref: (n: number) => Array.from({ length: n + 1 }, (_, i) => i.toString(2).split("1").length - 1),
  },
  {
    section: "Bit Manipulation", pattern: "Bitmasks as state", title: "No Shared Letters", difficulty: "medium",
    fn: "max_word_product", params: [["words", "string[]"]], returns: "int",
    brief: `Return the largest \`length(a) × length(b)\` for two words that share no letters, or 0 if every pair shares one.

### Constraints

- Words are lowercase. Store each word's letters as a 26-bit mask, so checking a pair is one AND.`,
    tests: [[["abcw", "baz", "foo", "bar", "xtfn", "abcdef"]], [["a", "ab", "abc", "d", "cd", "bcd", "abcd"]], [["a", "aa", "aaa", "aaaa"]], [["x"]]],
    ref: (w: string[]) => { let best = 0; for (let i = 0; i < w.length; i++) for (let j = i + 1; j < w.length; j++) if (![...w[i]!].some((c) => w[j]!.includes(c))) best = Math.max(best, w[i]!.length * w[j]!.length); return best; },
  },

  /* ===== Math & Geometry ===== */
  {
    section: "Math & Geometry", pattern: "GCD / LCM", title: "When They All Line Up", difficulty: "easy",
    fn: "lcm_of_all", params: [["periods", "int[]"]], returns: "int",
    brief: `Buses leave together, then each returns every \`periods[i]\` minutes. Return the first minute when they are all back together, the least common multiple.

### Constraints

- There is at least one period, and all are positive. The answer fits in a 64-bit integer.
- \`lcm(a, b) = a / gcd(a, b) × b\`. Divide before multiplying.`,
    tests: [[[4, 6]], [[3, 5, 7]], [[12]], [[2, 4, 8, 16]], [[1000000, 999999, 999998]]],
    ref: (a: number[]) => Number(a.map(BigInt).reduce((x, y) => (x / gcd(x, y)) * y)),
  },
  {
    section: "Math & Geometry", pattern: "Sieve of Eratosthenes", title: "Primes Below", difficulty: "medium",
    fn: "count_primes", params: [["n", "int"]], returns: "int",
    brief: `Return how many prime numbers are strictly less than \`n\`.

### Constraints

- \`n\` can be up to 5,000,000. Testing each number separately is too slow.`,
    tests: [[10], [0], [1], [2], [100], [5000000]],
    ref: (n: number) => { if (n < 3) return 0; const s = new Uint8Array(n); let c = 0; for (let i = 2; i < n; i++) { if (s[i]) continue; c++; for (let j = i * i; j < n; j += i) s[j] = 1; } return c; },
  },
  {
    section: "Math & Geometry", pattern: "Modular arithmetic", title: "Huge Powers", difficulty: "medium",
    fn: "power_mod", params: [["base", "int"], ["exponent", "int"], ["modulus", "int"]], returns: "int",
    brief: `Return \`base\` to the power \`exponent\`, modulo \`modulus\`.

### Constraints

- The exponent can be as large as 10^15, so multiply by repeated squaring.
- Intermediate products can pass 2^53. In JavaScript that needs \`BigInt\`; in C++ and Java, reduce before every multiplication.`,
    tests: [[2, 10, 1000], [3, 0, 7], [7, 1, 13], [2, 1000000000000000, 1000000007], [123456789, 987654321, 1000000007]],
    ref: (b: number, e: number, m: number) => { const ONE = BigInt(1), ZERO = BigInt(0), M = BigInt(m); let r = ONE, x = BigInt(b) % M, k = BigInt(e); while (k > ZERO) { if ((k & ONE) === ONE) r = (r * x) % M; x = (x * x) % M; k >>= ONE; } return Number(r % M); },
  },
  {
    section: "Math & Geometry", pattern: "Matrix traversal (spiral)", title: "Spiral Read", difficulty: "medium",
    fn: "spiral_order", params: [["grid", "int[][]"]], returns: "int[]",
    brief: `Read the grid in a clockwise spiral, starting at the top-left, and return the values in that order.

### Constraints

- Every row has the same length. The grid has at least one cell.`,
    tests: [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], [[[1]]], [[[1], [2], [3]]], [[[1, 2], [3, 4]]]],
    ref: (g: number[][]) => { const out: number[] = []; let t = 0, b = g.length - 1, l = 0, r = g[0]!.length - 1; while (t <= b && l <= r) { for (let j = l; j <= r; j++) out.push(g[t]![j]!); t++; for (let i = t; i <= b; i++) out.push(g[i]![r]!); r--; if (t <= b) { for (let j = r; j >= l; j--) out.push(g[b]![j]!); b--; } if (l <= r) { for (let i = b; i >= t; i--) out.push(g[i]![l]!); l++; } } return out; },
  },
  {
    section: "Math & Geometry", pattern: "Matrix rotation", title: "Quarter Turn", difficulty: "medium",
    fn: "rotate_grid", params: [["grid", "int[][]"]], returns: "int[][]",
    brief: `The grid is square. Return it rotated 90 degrees clockwise.

### Constraints

- A clockwise turn is a transpose followed by reversing each row.`,
    tests: [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1]]], [[[1, 2], [3, 4]]], [[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]]],
    ref: (g: number[][]) => g[0]!.map((_, j) => g.map((row) => row[j]!).reverse()),
  },
  {
    section: "Math & Geometry", pattern: "Line sweep", title: "City Skyline", difficulty: "hard",
    fn: "skyline", params: [["buildings", "int[][]"]], returns: "int[][]",
    brief: `Each building is \`[left, right, height]\`, a rectangle standing on flat ground. Return the outline of all of them as key points \`[x, height]\`, sorted by \`x\`. A key point is where the outline's height changes. The last one always drops to height 0.

No two consecutive key points may have the same height.

### Constraints

- There may be no buildings.
- Sweep across the edges from left to right, keeping the heights currently standing in a max-heap.`,
    tests: [[[[2, 9, 10], [3, 7, 15], [5, 12, 12], [15, 20, 10], [19, 24, 8]]], [[[0, 2, 3], [2, 5, 3]]], [[]], [[[1, 2, 1]]], [[[1, 5, 3], [1, 5, 5], [2, 3, 7]]]],
    ref: (bs: number[][]) => { const xs = [...new Set(bs.flatMap(([l, r]) => [l!, r!]))].sort((a, b) => a - b); const out: number[][] = []; let prev = 0; for (const x of xs) { const h = Math.max(0, ...bs.filter(([l, r]) => l! <= x && x < r!).map(([, , h]) => h!)); if (h !== prev) { out.push([x, h]); prev = h; } } return out; },
  },

  /* ===== Design Problems ===== */
  {
    section: "Design Problems", pattern: "LRU cache", title: "Least Recently Used", difficulty: "hard",
    fn: "lru_cache", params: [["capacity", "int"], ["ops", "string[]"], ["args", "int[][]"]], returns: "int[]",
    brief: `Simulate a cache holding at most \`capacity\` keys. \`args[i]\` belongs to \`ops[i]\`:

- \`put\` \`[key, value]\`: store the value. If the cache is full, first throw out the key used least recently.
- \`get\` \`[key]\`: report the value, or -1 if the key is absent.

Both \`get\` and \`put\` count as using a key. Return every reported value, in order.

### Constraints

- Both operations must take constant time. Use a hash map plus a doubly linked list.`,
    tests: [
      [2, ["put", "put", "get", "put", "get", "put", "get", "get", "get"], [[1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]],
      [1, ["put", "get", "put", "get", "get"], [[2, 1], [2], [3, 2], [2], [3]]],
      [2, ["put", "put", "put", "get", "get"], [[1, 1], [1, 5], [2, 2], [1], [2]]],
      [2, ["get"], [[9]]],
    ],
    ref: (cap: number, ops: string[], args: number[][]) => { const m = new Map<number, number>(), out: number[] = []; ops.forEach((op, i) => { const [k, v] = args[i]!; if (op === "get") { if (!m.has(k!)) { out.push(-1); return; } const val = m.get(k!)!; m.delete(k!); m.set(k!, val); out.push(val); } else { m.delete(k!); m.set(k!, v!); if (m.size > cap) m.delete(m.keys().next().value!); } }); return out; },
  },
  {
    section: "Design Problems", pattern: "LFU cache", title: "Least Frequently Used", difficulty: "hard",
    fn: "lfu_cache", params: [["capacity", "int"], ["ops", "string[]"], ["args", "int[][]"]], returns: "int[]",
    brief: `Like the LRU cache, except a full cache throws out the key used the fewest times. On a tie, it throws out the one of those used least recently. \`get\` and \`put\` each count as one use.

Return every value reported by \`get\` (-1 when absent), in order.

### Constraints

- A capacity of 0 stores nothing.`,
    tests: [
      [2, ["put", "put", "get", "put", "get", "get", "put", "get", "get", "get"], [[1, 1], [2, 2], [1], [3, 3], [2], [3], [4, 4], [1], [3], [4]]],
      [0, ["put", "get"], [[0, 0], [0]]],
      [2, ["put", "put", "get", "get", "put", "get", "get"], [[1, 1], [2, 2], [2], [2], [3, 3], [1], [2]]],
      [1, ["put", "put", "get", "get"], [[1, 1], [1, 2], [1], [2]]],
    ],
    ref: (cap: number, ops: string[], args: number[][]) => { const m = new Map<number, { v: number; f: number; t: number }>(), out: number[] = []; let time = 0; ops.forEach((op, i) => { const [k, v] = args[i]!; time++; if (op === "get") { const e = m.get(k!); if (!e) { out.push(-1); return; } e.f++; e.t = time; out.push(e.v); } else { if (cap === 0) return; const e = m.get(k!); if (e) { e.v = v!; e.f++; e.t = time; return; } if (m.size >= cap) { let victim = -1, best: { f: number; t: number } | null = null; for (const [kk, ee] of m) if (!best || ee.f < best.f || (ee.f === best.f && ee.t < best.t)) { best = ee; victim = kk; } m.delete(victim); } m.set(k!, { v: v!, f: 1, t: time }); } }); return out; },
  },
  {
    section: "Design Problems", pattern: "Design: news feed", title: "Tiny Twitter", difficulty: "hard",
    fn: "twitter", params: [["ops", "string[]"], ["args", "int[][]"]], returns: "int[][]",
    brief: `Simulate a feed. \`args[i]\` belongs to \`ops[i]\`:

- \`post\` \`[user, tweet]\`: the user posts a tweet with that id
- \`follow\` \`[follower, followee]\` and \`unfollow\` \`[follower, followee]\`
- \`feed\` \`[user]\`: report up to 10 tweet ids from the user and everyone they follow, newest first

Return every reported feed, in order.

### Constraints

- Tweet ids are all different. Following yourself changes nothing.
- Merge each person's newest tweets with a heap instead of sorting every tweet.`,
    tests: [
      [["post", "feed", "follow", "post", "feed", "unfollow", "feed"], [[1, 5], [1], [1, 2], [2, 6], [1], [1, 2], [1]]],
      [["feed"], [[7]]],
      [["post", "post", "post", "post", "post", "post", "post", "post", "post", "post", "post", "feed"], [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1]]],
      [["follow", "follow", "post", "post", "post", "feed", "feed"], [[1, 2], [1, 1], [2, 20], [1, 10], [3, 30], [1], [2]]],
    ],
    ref: (ops: string[], args: number[][]) => { const tweets: [number, number][] = [], follows = new Map<number, Set<number>>(), out: number[][] = []; ops.forEach((op, i) => { const [a, b] = args[i]!; if (op === "post") tweets.push([a!, b!]); else if (op === "follow") { if (a !== b) follows.set(a!, (follows.get(a!) ?? new Set()).add(b!)); } else if (op === "unfollow") follows.get(a!)?.delete(b!); else { const who = new Set([a!, ...(follows.get(a!) ?? [])]); out.push(tweets.filter(([u]) => who.has(u)).map(([, t]) => t).reverse().slice(0, 10)); } }); return out; },
  },
  {
    section: "Design Problems", pattern: "Design: rate limiter", title: "Quiet Logger", difficulty: "easy",
    fn: "should_print", params: [["timestamps", "int[]"], ["messages", "string[]"]], returns: "bool[]",
    brief: `Messages arrive at the given times, which never go backwards. A message may be printed only if the same message has not been printed in the last 10 seconds. If it was printed at time \`t\`, it may be printed again at \`t + 10\` or later.

Return, for each message, whether it gets printed.

### Constraints

- A message that is blocked does not reset its timer.`,
    tests: [[[1, 2, 3, 8, 10, 11], ["foo", "bar", "foo", "bar", "foo", "foo"]], [[0], ["x"]], [[], []], [[5, 5, 15, 16], ["a", "a", "a", "a"]]],
    ref: (ts: number[], ms: string[]) => { const last = new Map<string, number>(); return ts.map((t, i) => { const p = last.get(ms[i]!); if (p !== undefined && t < p + 10) return false; last.set(ms[i]!, t); return true; }); },
  },
  {
    section: "Design Problems", pattern: "Iterator design", title: "Step Through The Tree", difficulty: "medium",
    fn: "bst_iterator", params: [["root", "TreeNode"], ["ops", "string[]"]], returns: "int[]",
    brief: `Build an iterator over a binary search tree that returns values in increasing order, then run the operations:

- \`next\`: report the next value
- \`hasNext\`: report 1 if there is a next value, otherwise 0

Return every reported number, in order.

### Constraints

- \`next\` is only called when a value remains.
- Use memory proportional to the tree's height, not its size. Keep a stack of the left spine.`,
    tests: [[[7, 3, 15, null, null, 9, 20], ["next", "next", "hasNext", "next", "hasNext", "next", "hasNext", "next", "hasNext"]], [[1], ["hasNext", "next", "hasNext"]], [[], ["hasNext"]], [[2, 1, 3], ["next", "next", "next", "hasNext"]]],
    ref: (a: (number | null)[], ops: string[]) => { const vals: number[] = []; const go = (n: Node | null) => { if (!n) return; go(n.left); vals.push(n.val); go(n.right); }; go(tree(a)); let i = 0; return ops.map((op) => (op === "next" ? vals[i++]! : i < vals.length ? 1 : 0)); },
  },

  /* ===== Advanced / Hybrid ===== */
  {
    section: "Advanced / Hybrid", pattern: "Union-Find + sorting (Kruskal's)", title: "Cheapest Network", difficulty: "hard",
    fn: "min_network_cost", params: [["nodes", "int"], ["links", "int[][]"]], returns: "int",
    brief: `Each possible link is \`[a, b, cost]\` and works both ways. Return the cheapest total that connects all nodes, or -1 if they cannot all be connected.

### Constraints

- A single node costs 0.
- Sort links by cost, and use Union-Find to skip any link that would close a loop.`,
    tests: [[4, [[0, 1, 1], [1, 2, 2], [2, 3, 1], [0, 3, 4], [0, 2, 3]]], [3, [[0, 1, 5]]], [1, []], [3, [[0, 1, 1], [0, 1, 2], [1, 2, 7], [0, 2, 3]]]],
    ref: (n: number, e: number[][]) => { const uf = unionFind(n); let cost = 0, used = 0; for (const [a, b, w] of [...e].sort((x, y) => x[2]! - y[2]!)) if (uf.union(a!, b!)) { cost += w!; used++; } return used === n - 1 ? cost : -1; },
  },
  {
    section: "Advanced / Hybrid", pattern: "DFS + memoisation", title: "Longest Uphill Walk", difficulty: "hard",
    fn: "longest_increasing_path", params: [["grid", "int[][]"]], returns: "int",
    brief: `From any cell you may step up, down, left or right, but only onto a strictly bigger number. Return the number of cells on the longest such walk.

### Constraints

- The grid has at least one cell.
- Remember the best walk starting from each cell.`,
    tests: [[[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], [[[3, 4, 5], [3, 2, 6], [2, 2, 1]]], [[[1]]], [[[1, 2, 3, 4]]], [[[7, 7], [7, 7]]]],
    ref: (g: number[][]) => { const memo = new Map<string, number>(); const go = (r: number, c: number): number => { const k = `${r},${c}`; if (memo.has(k)) return memo.get(k)!; let best = 1; for (const [dr, dc] of DIRS) { const v = g[r + dr]?.[c + dc]; if (v !== undefined && v > g[r]![c]!) best = Math.max(best, 1 + go(r + dr, c + dc)); } memo.set(k, best); return best; }; let best = 0; g.forEach((row, r) => row.forEach((_, c) => (best = Math.max(best, go(r, c))))); return best; },
  },
  {
    section: "Advanced / Hybrid", pattern: "Binary search + greedy", title: "Fair Split", difficulty: "hard",
    fn: "split_array", params: [["nums", "int[]"], ["parts", "int"]], returns: "int",
    brief: `Cut the list into \`parts\` non-empty runs of neighbouring numbers. Return the smallest possible total for the heaviest run.

### Constraints

- \`parts\` is between 1 and the list's length. Numbers are zero or more.
- Binary search the answer. For a given limit, greedily count how many runs are needed.`,
    tests: [[[7, 2, 5, 10, 8], 2], [[1, 2, 3, 4, 5], 2], [[1, 4, 4], 3], [[10], 1], [[2, 3, 1, 2, 4, 3], 5], [[0, 0, 0], 2]],
    ref: (a: number[], k: number) => { const n = a.length; const d = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity)); d[0]![0] = 0; for (let i = 1; i <= n; i++) for (let p = 1; p <= k; p++) for (let j = p - 1; j < i; j++) d[i]![p] = Math.min(d[i]![p]!, Math.max(d[j]![p - 1]!, sum(a.slice(j, i)))); return d[n]![k]; },
  },
  {
    section: "Advanced / Hybrid", pattern: "Sliding window + HashMap", title: "Smallest Covering Window", difficulty: "hard",
    fn: "min_window", params: [["text", "string"], ["need", "string"]], returns: "string",
    brief: `Return the shortest run of neighbouring characters in \`text\` that contains every character of \`need\`, counting repeats. If several are equally short, return the one that starts first. Return an empty string if none exists.

### Constraints

- \`need\` is not empty. Keep counts of what the window still needs in a hash map.`,
    tests: [["ADOBECODEBANC", "ABC"], ["a", "a"], ["a", "aa"], ["aa", "aa"], ["abcabdebac", "cda"], ["bba", "ab"]],
    ref: (s: string, t: string) => { const need = new Map<string, number>(); for (const c of t) need.set(c, (need.get(c) ?? 0) + 1); let best = ""; for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) { if (best && j - i >= best.length) break; const have = new Map<string, number>(); for (const c of s.slice(i, j)) have.set(c, (have.get(c) ?? 0) + 1); if ([...need].every(([c, n]) => (have.get(c) ?? 0) >= n)) { best = s.slice(i, j); break; } } return best; },
  },
  {
    section: "Advanced / Hybrid", pattern: "Monotonic stack + DP", title: "Sum Of Minimums", difficulty: "hard",
    fn: "sum_subarray_mins", params: [["nums", "int[]"]], returns: "int",
    brief: `Take every run of one or more neighbouring numbers and find its minimum. Return the total of all those minimums, modulo 1,000,000,007.

### Constraints

- Numbers are positive.
- For each number, use a monotonic stack to find how far it stays the minimum on each side. That tells you how many runs it is the minimum of.`,
    tests: [[[3, 1, 2, 4]], [[11, 81, 94, 43, 3]], [[1]], [[2, 2, 2]], [[5, 4, 3, 2, 1]]],
    ref: (a: number[]) => { let total = 0; for (let i = 0; i < a.length; i++) { let m = Infinity; for (let j = i; j < a.length; j++) { m = Math.min(m, a[j]!); total += m; } } return total % 1000000007; },
  },
];

/* ---------- cross-checks for the references that are not brute force ---------- */

for (let n = 1; n <= 3000; n++) assert.equal(distinctDigits(n), distinctDigitsBrute(n), `digit DP at ${n}`);
for (let i = 0; i < 300; i++) {
  const piles = Array.from({ length: 1 + (i % 5) }, (_, j) => 1 + ((i * 7 + j * 13) % 40));
  const h = piles.length + (i % 9);
  assert.equal(minSpeed(piles, h), minSpeedBrute(piles, h), "binary search the answer");
}
for (const t of P.find((p) => p.fn === "solve_sudoku")!.tests) {
  assert.equal(sudokuSolutions(t[0] as string[][], 2).length, 1, "every sudoku has exactly one solution");
}

/* ---------- build, validate, write ---------- */

const slugify = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const slugs = new Set<string>();
const errors: string[] = [];

export const built = P.map((p) => {
  const signature: Signature = {
    name: p.fn,
    params: p.params.map(([name, type]) => ({ name, type })),
    returns: p.returns,
    ...(p.unordered ? { unordered: true } : {}),
  };
  const slug = slugify(p.title);
  assert.ok(!slugs.has(slug), `duplicate title ${p.title}`);
  slugs.add(slug);
  const tests = p.tests.map((args, i) => {
    const value = p.ref(...structuredClone(args));
    assert.notEqual(value, undefined, `${p.title}: reference returned nothing for ${JSON.stringify(args)}`);
    return { stdin: JSON.stringify(args), expectedStdout: expectedForm(value, p.returns), isSample: i < 2 };
  });
  errors.push(
    ...validateProblem({ slug, signature, points: POINTS[p.difficulty], timeLimitMs: 5000, starterCode: starterCodeFor(signature), tests }),
  );
  return { ...p, slug, signature, tests };
});

assert.deepEqual(errors, [], "every problem passes the console's validator");

const fnLine = (b: (typeof built)[number]) =>
  `${b.fn}(${b.params.map(([n, t]) => `${n}: ${t}`).join(", ")}) -> ${b.returns}`;

const sections = [...new Set(built.map((b) => b.section))];
const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let md = `# Problem bank

${built.length} problems covering every pattern on the list, ready to add at
\`/admin/problems/new\`. Every expected answer was computed by a reference
solution and checked by the same validator the console uses, so if the wizard
rejects one, it was mistyped when copying.

Regenerate this file with \`yarn tsx --conditions=react-server scripts/problem-bank.ts\`.

## How to add one

1. Copy the **URL name**, **Function**, difficulty and points into Details and Signature.
   Types go into the dropdowns exactly as written.
2. If the problem says **Any order: yes**, tick *Accept the answer in any order* under Returns.
3. Paste the brief into Statement.
4. Open **Paste several at once** under Tests, paste the whole tests block and press
   *Add them*. Then tick **Example** on the **first two**, which are the worked
   examples participants see. The rest stay hidden.
5. Leave the time limit at 5000 ms and run *Verify on judge* with your own solution.

**Shapes.** Arguments are a JSON array with one entry per parameter, so a single
list is \`[[1,2,3]]\`. Text answers are quoted. A \`ListNode\` is written as its
values, \`[1,2,3]\`. A \`TreeNode\` is written in level order with \`null\` for gaps,
\`[3,9,20,null,null,15,7]\`. An empty list or tree is \`[]\`. Graphs are \`int[][]\`
edge lists. Design problems pass their operations as parallel lists.

## Contents

${sections.map((s) => `- [${s}](#${anchor(s)}) (${built.filter((b) => b.section === s).length})`).join("\n")}
`;

for (const section of sections) {
  md += `\n---\n\n## ${section}\n`;
  for (const b of built.filter((x) => x.section === section)) {
    md += `
### ${b.title}

**Pattern:** ${b.pattern}  ·  **Difficulty:** ${b.difficulty}  ·  **Points:** ${POINTS[b.difficulty]}${b.unordered ? "  ·  **Any order:** yes" : ""}

| Field | Value |
|---|---|
| URL name | \`${b.slug}\` |
| Function | \`${fnLine(b)}\` |

\`\`\`markdown
${b.brief}
\`\`\`

**Tests.** Paste all of them, then tick Example on the first two.

\`\`\`text
${b.tests.map((t) => `${t.stdin} => ${t.expectedStdout}`).join("\n")}
\`\`\`
`;
  }
}

// Imported by the loader for its problems; only running this file writes the doc.
if (/(^|[\\/])problem-bank\.ts$/.test(process.argv[1] ?? "")) {
  writeFileSync("docs/PROBLEM-BANK.md", md);
  console.log(`problem-bank: ${built.length} problems, ${built.reduce((n, b) => n + b.tests.length, 0)} tests, all valid`);
}
