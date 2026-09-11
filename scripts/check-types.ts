/**
 * Runs one real solution per question category, in every language, against a
 * live judge. Structural checks prove the harness is generated; only this
 * proves it compiles and round-trips linked lists, trees, maps and sets.
 *
 * Run: yarn check:types [language]
 */
import assert from "node:assert/strict";

import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import { validateProblem } from "@/lib/problems/validate";
import { starterCodeFor } from "@/lib/problems/starter";

type Case = {
  category: string;
  signature: Signature;
  tests: { stdin: string; expectedStdout: string }[];
  solutions: Record<Language, string>;
};

const CASES: Case[] = [
  {
    category: "Linked list in and out",
    signature: { name: "reverse_list", params: [{ name: "head", type: "ListNode" }], returns: "ListNode" },
    tests: [
      { stdin: "[[1,2,3,4]]", expectedStdout: "[4,3,2,1]" },
      { stdin: "[[]]", expectedStdout: "[]" },
    ],
    solutions: {
      python: `def reverse_list(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n`,
      javascript: `function reverseList(head) {\n  let prev = null;\n  while (head) { const next = head.next; head.next = prev; prev = head; head = next; }\n  return prev;\n}\n`,
      cpp: `ListNode* reverseList(ListNode* head) {\n    ListNode* prev = nullptr;\n    while (head) { ListNode* n = head->next; head->next = prev; prev = head; head = n; }\n    return prev;\n}\n`,
      java: `class Solution {\n    static ListNode reverseList(ListNode head) {\n        ListNode prev = null;\n        while (head != null) { ListNode n = head.next; head.next = prev; prev = head; head = n; }\n        return prev;\n    }\n}\n`,
    },
  },
  {
    category: "BFS on a tree",
    signature: { name: "level_order", params: [{ name: "root", type: "TreeNode" }], returns: "int[][]" },
    tests: [
      { stdin: "[[3,9,20,null,null,15,7]]", expectedStdout: "[[3],[9,20],[15,7]]" },
      { stdin: "[[]]", expectedStdout: "[]" },
    ],
    solutions: {
      python: `from collections import deque\n\ndef level_order(root):\n    out, q = [], deque([root] if root else [])\n    while q:\n        level = []\n        for _ in range(len(q)):\n            n = q.popleft()\n            level.append(n.val)\n            if n.left: q.append(n.left)\n            if n.right: q.append(n.right)\n        out.append(level)\n    return out\n`,
      javascript: `function levelOrder(root) {\n  const out = []; let q = root ? [root] : [];\n  while (q.length) {\n    out.push(q.map((n) => n.val));\n    q = q.flatMap((n) => [n.left, n.right].filter(Boolean));\n  }\n  return out;\n}\n`,
      cpp: `std::vector<std::vector<long long>> levelOrder(TreeNode* root) {\n    std::vector<std::vector<long long>> out; std::queue<TreeNode*> q; if (root) q.push(root);\n    while (!q.empty()) {\n        std::vector<long long> level;\n        for (int i = q.size(); i > 0; i--) { auto n = q.front(); q.pop(); level.push_back(n->val); if (n->left) q.push(n->left); if (n->right) q.push(n->right); }\n        out.push_back(level);\n    }\n    return out;\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static List<List<Integer>> levelOrder(TreeNode root) {\n        List<List<Integer>> out = new ArrayList<>(); Deque<TreeNode> q = new ArrayDeque<>(); if (root != null) q.add(root);\n        while (!q.isEmpty()) {\n            List<Integer> level = new ArrayList<>();\n            for (int i = q.size(); i > 0; i--) { TreeNode n = q.poll(); level.add(n.val); if (n.left != null) q.add(n.left); if (n.right != null) q.add(n.right); }\n            out.add(level);\n        }\n        return out;\n    }\n}\n`,
    },
  },
  {
    category: "Tree in and out (DFS)",
    signature: { name: "invert_tree", params: [{ name: "root", type: "TreeNode" }], returns: "TreeNode" },
    tests: [
      { stdin: "[[4,2,7,1,3,6,9]]", expectedStdout: "[4,7,2,9,6,3,1]" },
      { stdin: "[[1,2]]", expectedStdout: "[1,null,2]" },
      { stdin: "[[]]", expectedStdout: "[]" },
    ],
    solutions: {
      python: `def invert_tree(root):\n    if root:\n        root.left, root.right = invert_tree(root.right), invert_tree(root.left)\n    return root\n`,
      javascript: `function invertTree(root) {\n  if (root) [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];\n  return root;\n}\n`,
      cpp: `TreeNode* invertTree(TreeNode* root) {\n    if (root) { auto l = invertTree(root->right); root->right = invertTree(root->left); root->left = l; }\n    return root;\n}\n`,
      java: `class Solution {\n    static TreeNode invertTree(TreeNode root) {\n        if (root != null) { TreeNode l = invertTree(root.right); root.right = invertTree(root.left); root.left = l; }\n        return root;\n    }\n}\n`,
    },
  },
  {
    category: "Backtracking, any order",
    signature: { name: "subsets", params: [{ name: "nums", type: "int[]" }], returns: "int[][]", unordered: true },
    tests: [{ stdin: "[[1,2,3]]", expectedStdout: "[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]" }],
    solutions: {
      python: `def subsets(nums):\n    out = []\n    def go(i, path):\n        if i == len(nums):\n            out.append(path[:])\n            return\n        go(i + 1, path)\n        path.append(nums[i]); go(i + 1, path); path.pop()\n    go(0, [])\n    return out\n`,
      javascript: `function subsets(nums) {\n  return nums.reduce((acc, n) => acc.concat(acc.map((s) => [...s, n])), [[]]);\n}\n`,
      cpp: `std::vector<std::vector<long long>> subsets(std::vector<long long> nums) {\n    std::vector<std::vector<long long>> out{{}};\n    for (auto n : nums) { int k = out.size(); for (int i = 0; i < k; i++) { auto s = out[i]; s.push_back(n); out.push_back(s); } }\n    return out;\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static List<List<Long>> subsets(long[] nums) {\n        List<List<Long>> out = new ArrayList<>(); out.add(new ArrayList<>());\n        for (long n : nums) { int k = out.size(); for (int i = 0; i < k; i++) { List<Long> s = new ArrayList<>(out.get(i)); s.add(n); out.add(s); } }\n        return out;\n    }\n}\n`,
    },
  },
  {
    category: "Hashmap returned as an object",
    signature: { name: "word_count", params: [{ name: "words", type: "string[]" }], returns: "map<string,int>" },
    tests: [
      { stdin: '[["b","a","b","café"]]', expectedStdout: '{"a":1,"b":2,"café":1}' },
      { stdin: "[[]]", expectedStdout: "{}" },
    ],
    solutions: {
      python: `from collections import Counter\n\ndef word_count(words):\n    return Counter(words)\n`,
      javascript: `function wordCount(words) {\n  const m = new Map();\n  for (const w of words) m.set(w, (m.get(w) ?? 0) + 1);\n  return m;\n}\n`,
      cpp: `std::unordered_map<std::string, int> wordCount(std::vector<std::string> words) {\n    std::unordered_map<std::string, int> m;\n    for (auto &w : words) m[w]++;\n    return m;\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static Map<String, Integer> wordCount(String[] words) {\n        Map<String, Integer> m = new HashMap<>();\n        for (String w : words) m.merge(w, 1, Integer::sum);\n        return m;\n    }\n}\n`,
    },
  },
  {
    category: "Hashmap as an argument",
    signature: {
      name: "most_frequent",
      params: [{ name: "counts", type: "map<string,int>" }],
      returns: "string",
    },
    tests: [{ stdin: '[{"x":1,"y":5,"z":2}]', expectedStdout: '"y"' }],
    solutions: {
      python: `def most_frequent(counts):\n    return max(counts, key=counts.get)\n`,
      javascript: `function mostFrequent(counts) {\n  return Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a));\n}\n`,
      cpp: `std::string mostFrequent(std::map<std::string, long long> counts) {\n    return std::max_element(counts.begin(), counts.end(), [](auto &a, auto &b) { return a.second < b.second; })->first;\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static String mostFrequent(Map<String, Long> counts) {\n        return Collections.max(counts.entrySet(), Map.Entry.comparingByValue()).getKey();\n    }\n}\n`,
    },
  },
  {
    category: "Set returned natively, any order",
    signature: { name: "unique", params: [{ name: "nums", type: "int[]" }], returns: "int[]", unordered: true },
    tests: [{ stdin: "[[3,1,3,2,1]]", expectedStdout: "[1,2,3]" }],
    solutions: {
      python: `def unique(nums):\n    return set(nums)\n`,
      javascript: `function unique(nums) {\n  return new Set(nums);\n}\n`,
      cpp: `std::vector<long long> unique(std::vector<long long> nums) {\n    std::unordered_set<long long> s(nums.begin(), nums.end());\n    return {s.begin(), s.end()};\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static Set<Long> unique(long[] nums) {\n        Set<Long> s = new HashSet<>();\n        for (long n : nums) s.add(n);\n        return s;\n    }\n}\n`,
    },
  },
  {
    category: "Priority queue / heap",
    signature: {
      name: "kth_largest",
      params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }],
      returns: "int",
    },
    tests: [{ stdin: "[[3,2,1,5,6,4],2]", expectedStdout: "5" }],
    solutions: {
      python: `import heapq\n\ndef kth_largest(nums, k):\n    return heapq.nlargest(k, nums)[-1]\n`,
      javascript: `function kthLargest(nums, k) {\n  return [...nums].sort((a, b) => b - a)[k - 1];\n}\n`,
      cpp: `long long kthLargest(std::vector<long long> nums, long long k) {\n    std::priority_queue<long long, std::vector<long long>, std::greater<long long>> pq;\n    for (auto n : nums) { pq.push(n); if ((long long)pq.size() > k) pq.pop(); }\n    return pq.top();\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static long kthLargest(long[] nums, long k) {\n        PriorityQueue<Long> pq = new PriorityQueue<>();\n        for (long n : nums) { pq.add(n); if (pq.size() > k) pq.poll(); }\n        return pq.peek();\n    }\n}\n`,
    },
  },
  {
    category: "DFS on a grid graph",
    signature: { name: "num_islands", params: [{ name: "grid", type: "string[][]" }], returns: "int" },
    tests: [
      {
        stdin: '[[["1","1","0","0"],["1","0","0","1"],["0","0","1","1"]]]',
        expectedStdout: "2",
      },
    ],
    solutions: {
      python: `def num_islands(grid):\n    def sink(r, c):\n        if 0 <= r < len(grid) and 0 <= c < len(grid[0]) and grid[r][c] == "1":\n            grid[r][c] = "0"\n            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)): sink(r + dr, c + dc)\n            return 1\n        return 0\n    return sum(sink(r, c) for r in range(len(grid)) for c in range(len(grid[0])))\n`,
      javascript: `function numIslands(grid) {\n  const sink = (r, c) => {\n    if (grid[r]?.[c] !== "1") return 0;\n    grid[r][c] = "0";\n    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);\n    return 1;\n  };\n  let n = 0;\n  grid.forEach((row, r) => row.forEach((_, c) => (n += sink(r, c))));\n  return n;\n}\n`,
      cpp: `static int sink(std::vector<std::vector<std::string>> &g, int r, int c) {\n    if (r < 0 || c < 0 || r >= (int)g.size() || c >= (int)g[0].size() || g[r][c] != "1") return 0;\n    g[r][c] = "0"; sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);\n    return 1;\n}\nlong long numIslands(std::vector<std::vector<std::string>> grid) {\n    long long n = 0;\n    for (int r = 0; r < (int)grid.size(); r++) for (int c = 0; c < (int)grid[0].size(); c++) n += sink(grid, r, c);\n    return n;\n}\n`,
      java: `class Solution {\n    static int sink(String[][] g, int r, int c) {\n        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || !g[r][c].equals("1")) return 0;\n        g[r][c] = "0"; sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);\n        return 1;\n    }\n    static long numIslands(String[][] grid) {\n        long n = 0;\n        for (int r = 0; r < grid.length; r++) for (int c = 0; c < grid[0].length; c++) n += sink(grid, r, c);\n        return n;\n    }\n}\n`,
    },
  },
  {
    category: "BFS on a graph (edge list)",
    signature: {
      name: "shortest_path",
      params: [
        { name: "n", type: "int" },
        { name: "edges", type: "int[][]" },
        { name: "src", type: "int" },
        { name: "dst", type: "int" },
      ],
      returns: "int",
    },
    tests: [
      { stdin: "[5,[[0,1],[1,2],[0,3],[3,4],[4,2]],0,2]", expectedStdout: "2" },
      { stdin: "[3,[[0,1]],0,2]", expectedStdout: "-1" },
    ],
    solutions: {
      python: `from collections import deque\n\ndef shortest_path(n, edges, src, dst):\n    adj = [[] for _ in range(n)]\n    for a, b in edges:\n        adj[a].append(b); adj[b].append(a)\n    dist = {src: 0}; q = deque([src])\n    while q:\n        u = q.popleft()\n        for v in adj[u]:\n            if v not in dist:\n                dist[v] = dist[u] + 1; q.append(v)\n    return dist.get(dst, -1)\n`,
      javascript: `function shortestPath(n, edges, src, dst) {\n  const adj = Array.from({ length: n }, () => []);\n  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }\n  const dist = new Map([[src, 0]]); const q = [src];\n  for (let i = 0; i < q.length; i++) for (const v of adj[q[i]]) if (!dist.has(v)) { dist.set(v, dist.get(q[i]) + 1); q.push(v); }\n  return dist.get(dst) ?? -1;\n}\n`,
      cpp: `long long shortestPath(long long n, std::vector<std::vector<long long>> edges, long long src, long long dst) {\n    std::vector<std::vector<int>> adj(n); for (auto &e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }\n    std::vector<long long> d(n, -1); d[src] = 0; std::queue<int> q; q.push(src);\n    while (!q.empty()) { int u = q.front(); q.pop(); for (int v : adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); } }\n    return d[dst];\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static long shortestPath(long n, long[][] edges, long src, long dst) {\n        List<List<Integer>> adj = new ArrayList<>(); for (int i = 0; i < n; i++) adj.add(new ArrayList<>());\n        for (long[] e : edges) { adj.get((int) e[0]).add((int) e[1]); adj.get((int) e[1]).add((int) e[0]); }\n        long[] d = new long[(int) n]; Arrays.fill(d, -1); d[(int) src] = 0; Deque<Integer> q = new ArrayDeque<>(); q.add((int) src);\n        while (!q.isEmpty()) { int u = q.poll(); for (int v : adj.get(u)) if (d[v] < 0) { d[v] = d[u] + 1; q.add(v); } }\n        return d[(int) dst];\n    }\n}\n`,
    },
  },
];

const only = process.argv[2] as Language | undefined;
let failures = 0;

async function main() {
for (const c of CASES) {
  // Every fixture must also be a problem an admin could author.
  const invalid = validateProblem({
    slug: c.signature.name,
    signature: c.signature,
    points: 100,
    timeLimitMs: 5000,
    starterCode: starterCodeFor(c.signature),
    tests: c.tests.map((t, i) => ({ ...t, isSample: i === 0 })),
  });
  assert.deepEqual(invalid, [], `${c.category} fixture is not a valid problem`);

  console.log(`\n${c.category}`);
  for (const language of only ? [only] : LANGUAGES) {
    const result = await runTests({
      language,
      source: c.solutions[language],
      signature: c.signature,
      tests: c.tests,
      revealActual: true,
      timeLimitMs: 5000,
      memoryLimitKb: 262144,
    });
    const ok = result.verdict === "accepted";
    if (!ok) failures++;
    const detail = ok
      ? ""
      : result.outcomes
          .filter((o) => !o.passed)
          .map((o) => `${o.verdict}: ${(o.actual ?? "").trim()} ${(o.stderr ?? "").trim().slice(0, 300)}`)
          .join(" | ");
    console.log(`  ${language.padEnd(11)} ${ok ? "ok" : "FAIL"}  ${detail}`);
  }
}

assert.equal(failures, 0, `${failures} language run(s) failed`);
console.log("\ncheck-types: every category round-trips in every language");
}

void main();
