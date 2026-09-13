/**
 * Proves, against a live judge and in every language, each capability that
 * real LeetCode problems need beyond "call a function, print the result":
 * design classes, in-place answers, character types, cyclic lists, deep
 * recursion, decimal tolerance, nested any-order answers, exact text escapes,
 * and a judge-owned entry point that participant code cannot replace.
 *
 * Run: yarn check:capabilities [language]
 */
import assert from "node:assert/strict";

import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import { starterCodeFor } from "@/lib/problems/starter";
import { validateProblem } from "@/lib/problems/validate";

type Case = {
  capability: string;
  signature: Signature;
  tests: { stdin: string; expectedStdout: string }[];
  solutions: Record<Language, string>;
  /** What every language must produce. Most cases expect "accepted". */
  verdict?: string;
  /** Text the Run view must show, for cases about the message rather than the answer. */
  stderrIncludes?: string;
};

const json = (value: unknown) => JSON.stringify(value);

const CASES: Case[] = [
  {
    capability: "Design class: the judge constructs it and calls its methods",
    signature: {
      name: "MinStack",
      params: [],
      returns: "void",
      methods: [
        { name: "push", params: [{ name: "val", type: "int" }], returns: "void" },
        { name: "pop", params: [], returns: "void" },
        { name: "top", params: [], returns: "int" },
        { name: "get_min", params: [], returns: "int" },
      ],
    },
    tests: [
      {
        stdin: json([["MinStack", "push", "push", "push", "get_min", "pop", "top", "get_min"], [[], [-2], [0], [-3], [], [], [], []]]),
        expectedStdout: "[null,null,null,null,-3,null,0,-2]",
      },
      { stdin: json([["MinStack", "push", "get_min"], [[], [7], []]]), expectedStdout: "[null,null,7]" },
    ],
    solutions: {
      python: `class MinStack:\n    def __init__(self):\n        self.s = []\n\n    def push(self, val):\n        self.s.append((val, min(val, self.s[-1][1]) if self.s else val))\n\n    def pop(self):\n        self.s.pop()\n\n    def top(self):\n        return self.s[-1][0]\n\n    def get_min(self):\n        return self.s[-1][1]\n`,
      javascript: `class MinStack {\n  constructor() { this.s = []; }\n  push(val) { this.s.push([val, this.s.length ? Math.min(val, this.s[this.s.length - 1][1]) : val]); }\n  pop() { this.s.pop(); }\n  top() { return this.s[this.s.length - 1][0]; }\n  getMin() { return this.s[this.s.length - 1][1]; }\n}\n`,
      cpp: `class MinStack {\n    std::vector<std::pair<long long, long long>> s;\npublic:\n    MinStack() {}\n    void push(long long val) { s.push_back({val, s.empty() ? val : std::min(val, s.back().second)}); }\n    void pop() { s.pop_back(); }\n    long long top() { return s.back().first; }\n    long long getMin() { return s.back().second; }\n};\n`,
      java: `class MinStack {\n    private final java.util.ArrayDeque<long[]> s = new java.util.ArrayDeque<>();\n    MinStack() {}\n    void push(long val) { s.push(new long[]{val, s.isEmpty() ? val : Math.min(val, s.peek()[1])}); }\n    void pop() { s.pop(); }\n    long top() { return s.peek()[0]; }\n    long getMin() { return s.peek()[1]; }\n}\n`,
    },
  },
  {
    capability: "In place on a grid: void, the answer is the changed argument",
    signature: { name: "rotate", params: [{ name: "matrix", type: "int[][]" }], returns: "void", mutates: "matrix" },
    tests: [
      { stdin: "[[[1,2,3],[4,5,6],[7,8,9]]]", expectedStdout: "[[7,4,1],[8,5,2],[9,6,3]]" },
      { stdin: "[[[1]]]", expectedStdout: "[[1]]" },
    ],
    solutions: {
      python: `def rotate(matrix):\n    matrix[:] = [list(r) for r in zip(*matrix[::-1])]\n`,
      javascript: `function rotate(matrix) {\n  const n = matrix.length;\n  const copy = matrix.map((r) => [...r]);\n  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) matrix[j][n - 1 - i] = copy[i][j];\n}\n`,
      cpp: `void rotate(std::vector<std::vector<long long>>& matrix) {\n    int n = matrix.size();\n    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) std::swap(matrix[i][j], matrix[j][i]);\n    for (auto &row : matrix) std::reverse(row.begin(), row.end());\n}\n`,
      java: `class Solution {\n    static void rotate(long[][] m) {\n        int n = m.length;\n        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) { long t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }\n        for (long[] row : m) for (int a = 0, b = n - 1; a < b; a++, b--) { long t = row[a]; row[a] = row[b]; row[b] = t; }\n    }\n}\n`,
    },
  },
  {
    capability: "char[] in place: Reverse String",
    signature: { name: "reverse_string", params: [{ name: "s", type: "char[]" }], returns: "void", mutates: "s" },
    tests: [
      { stdin: json([["h", "e", "l", "l", "o"]]), expectedStdout: '["o","l","l","e","h"]' },
      { stdin: json([["a"]]), expectedStdout: '["a"]' },
    ],
    solutions: {
      python: `def reverse_string(s):\n    s.reverse()\n`,
      javascript: `function reverseString(s) {\n  s.reverse();\n}\n`,
      cpp: `void reverseString(std::vector<char>& s) {\n    std::reverse(s.begin(), s.end());\n}\n`,
      java: `class Solution {\n    static void reverseString(char[] s) {\n        for (int a = 0, b = s.length - 1; a < b; a++, b--) { char t = s[a]; s[a] = s[b]; s[b] = t; }\n    }\n}\n`,
    },
  },
  {
    capability: "char[][] board in, char out",
    signature: { name: "most_common", params: [{ name: "board", type: "char[][]" }], returns: "char" },
    tests: [
      { stdin: json([[["a", "b"], ["b", "c"]]]), expectedStdout: '"b"' },
      { stdin: json([[["z"]]]), expectedStdout: '"z"' },
    ],
    solutions: {
      python: `from collections import Counter\n\ndef most_common(board):\n    return Counter(c for row in board for c in row).most_common(1)[0][0]\n`,
      javascript: `function mostCommon(board) {\n  const n = {};\n  for (const c of board.flat()) n[c] = (n[c] || 0) + 1;\n  return Object.keys(n).reduce((a, b) => (n[b] > n[a] ? b : a));\n}\n`,
      cpp: `char mostCommon(std::vector<std::vector<char>> board) {\n    std::map<char, int> n;\n    for (auto &r : board) for (char c : r) n[c]++;\n    return std::max_element(n.begin(), n.end(), [](auto &a, auto &b) { return a.second < b.second; })->first;\n}\n`,
      java: `class Solution {\n    static char mostCommon(char[][] board) {\n        int[] n = new int[128];\n        for (char[] r : board) for (char c : r) n[c]++;\n        char best = 0;\n        for (char c = 0; c < 128; c++) if (n[c] > n[best]) best = c;\n        return best;\n    }\n}\n`,
    },
  },
  {
    capability: "Linked list with a cycle as input (LeetCode's pos)",
    signature: { name: "has_cycle", params: [{ name: "head", type: "ListNode" }], returns: "bool" },
    tests: [
      { stdin: json([{ values: [3, 2, 0, -4], cycleAt: 1 }]), expectedStdout: "true" },
      { stdin: "[[1,2]]", expectedStdout: "false" },
      { stdin: json([{ values: [1], cycleAt: 0 }]), expectedStdout: "true" },
      { stdin: "[[]]", expectedStdout: "false" },
    ],
    solutions: {
      python: `def has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow, fast = slow.next, fast.next.next\n        if slow is fast:\n            return True\n    return False\n`,
      javascript: `function hasCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next; fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}\n`,
      cpp: `bool hasCycle(ListNode* head) {\n    ListNode *slow = head, *fast = head;\n    while (fast && fast->next) {\n        slow = slow->next; fast = fast->next->next;\n        if (slow == fast) return true;\n    }\n    return false;\n}\n`,
      java: `class Solution {\n    static boolean hasCycle(ListNode head) {\n        ListNode slow = head, fast = head;\n        while (fast != null && fast.next != null) {\n            slow = slow.next; fast = fast.next.next;\n            if (slow == fast) return true;\n        }\n        return false;\n    }\n}\n`,
    },
  },
  {
    capability: "Recursion 100,000 calls deep",
    signature: { name: "depth", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [
      { stdin: "[5]", expectedStdout: "5" },
      { stdin: "[100000]", expectedStdout: "100000" },
    ],
    solutions: {
      python: `def depth(n):\n    return 0 if n == 0 else 1 + depth(n - 1)\n`,
      javascript: `function depth(n) {\n  return n === 0 ? 0 : 1 + depth(n - 1);\n}\n`,
      cpp: `long long depth(long long n) {\n    return n == 0 ? 0 : 1 + depth(n - 1);\n}\n`,
      java: `class Solution {\n    static long depth(long n) {\n        return n == 0 ? 0 : 1 + depth(n - 1);\n    }\n}\n`,
    },
  },
  {
    capability: "Decimals within 1e-5 are accepted, as on LeetCode",
    signature: { name: "third", params: [{ name: "x", type: "double" }], returns: "double" },
    // A correct answer carrying a rounding error of 2e-6, which prints as
    // 0.333335 against an expected 0.333333.
    tests: [
      { stdin: "[1.0]", expectedStdout: "0.333333" },
      { stdin: "[3.0]", expectedStdout: "1.000000" },
    ],
    solutions: {
      python: `def third(x):\n    return x / 3 + 0.000002\n`,
      javascript: `function third(x) {\n  return x / 3 + 0.000002;\n}\n`,
      cpp: `double third(double x) {\n    return x / 3 + 0.000002;\n}\n`,
      java: `class Solution {\n    static double third(double x) {\n        return x / 3 + 0.000002;\n    }\n}\n`,
    },
  },
  {
    capability: "Any order, inside each group too",
    signature: { name: "group_anagrams", params: [{ name: "words", type: "string[]" }], returns: "string[][]", unordered: "deep" },
    tests: [
      { stdin: json([["eat", "tea", "tan", "ate", "nat", "bat"]]), expectedStdout: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
      { stdin: json([["a"]]), expectedStdout: '[["a"]]' },
    ],
    // Every language returns the groups, and the words inside them, reversed.
    solutions: {
      python: `def group_anagrams(words):\n    groups = {}\n    for w in words:\n        groups.setdefault("".join(sorted(w)), []).insert(0, w)\n    return list(groups.values())[::-1]\n`,
      javascript: `function groupAnagrams(words) {\n  const g = new Map();\n  for (const w of words) { const k = [...w].sort().join(""); g.set(k, [w, ...(g.get(k) || [])]); }\n  return [...g.values()].reverse();\n}\n`,
      cpp: `std::vector<std::vector<std::string>> groupAnagrams(std::vector<std::string> words) {\n    std::map<std::string, std::vector<std::string>> g;\n    for (auto &w : words) { auto k = w; std::sort(k.begin(), k.end()); g[k].insert(g[k].begin(), w); }\n    std::vector<std::vector<std::string>> out;\n    for (auto &kv : g) out.push_back(kv.second);\n    std::reverse(out.begin(), out.end());\n    return out;\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static List<List<String>> groupAnagrams(String[] words) {\n        Map<String, LinkedList<String>> g = new TreeMap<>();\n        for (String w : words) { char[] k = w.toCharArray(); Arrays.sort(k); g.computeIfAbsent(new String(k), x -> new LinkedList<>()).addFirst(w); }\n        List<List<String>> out = new ArrayList<>(g.values());\n        Collections.reverse(out);\n        return out;\n    }\n}\n`,
    },
  },
  {
    capability: "Text round-trips exactly: control characters, accents, emoji, quotes",
    signature: { name: "echo", params: [{ name: "text", type: "string" }], returns: "string" },
    tests: [
      { stdin: json(["tab\tcr\rbell é 😀 \"q\" \\"]), expectedStdout: json("tab\tcr\rbell é 😀 \"q\" \\") },
      { stdin: json([""]), expectedStdout: '""' },
    ],
    solutions: {
      python: `def echo(text):\n    return text\n`,
      javascript: `function echo(text) {\n  return text;\n}\n`,
      cpp: `std::string echo(std::string text) {\n    return text;\n}\n`,
      java: `class Solution {\n    static String echo(String text) {\n        return text;\n    }\n}\n`,
    },
  },
  {
    capability: "The judge owns the entry point: a participant's own main and top-level code cannot take over",
    signature: { name: "add_one", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [
      { stdin: "[1]", expectedStdout: "2" },
      { stdin: "[41]", expectedStdout: "42" },
    ],
    // Each tries to read the input itself and print something else, and uses
    // a helper. The judge must still call add_one and print only its answer.
    solutions: {
      python: `import sys\n\ndef helper(n):\n    return n + 1\n\ndef add_one(n):\n    return helper(n)\n\nif __name__ == "__main__":\n    print("hijack", sys.stdin.read())\n`,
      javascript: `const stolen = require("fs").readFileSync(0, "utf8");\nconsole.log("hijack", stolen);\nfunction helper(n) { return n + 1; }\nfunction addOne(n) { return helper(n); }\n`,
      cpp: `long long helper(long long n) { return n + 1; }\nlong long addOne(long long n) { return helper(n); }\nint main() {\n    std::string s; std::cin >> s;\n    std::cout << "hijack " << s;\n    return 0;\n}\n`,
      java: `class Solution {\n    static long helper(long n) { return n + 1; }\n    static long addOne(long n) { return helper(n); }\n    public static void main(String[] args) { System.out.println("hijack"); }\n}\n`,
    },
  },
  {
    capability: "A missing function is named in the error, not a bare NameError",
    signature: { name: "add_one", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[1]", expectedStdout: "2" }],
    verdict: "runtime_error",
    stderrIncludes: "Define a function called",
    solutions: {
      python: `def add_two(n):\n    return n + 2\n`,
      javascript: `function addTwo(n) {\n  return n + 2;\n}\n`,
      // C++ and Java cannot run without the function at all, so the compiler
      // names it instead.
      cpp: `long long addTwo(long long n) { return n + 2; }\n`,
      java: `class Solution {\n    static long addTwo(long n) { return n + 2; }\n}\n`,
    },
  },
  {
    capability: "Printing past the judge's output limit is a runtime error, not a time limit",
    signature: { name: "noisy", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[1]", expectedStdout: "1" }],
    verdict: "runtime_error",
    stderrIncludes: "printed more than the judge accepts",
    solutions: {
      python: `def noisy(n):\n    print("x" * 5000)\n    return n\n`,
      javascript: `function noisy(n) {\n  console.log("x".repeat(5000));\n  return n;\n}\n`,
      cpp: `long long noisy(long long n) {\n    std::cout << std::string(5000, 'x');\n    return n;\n}\n`,
      java: `class Solution {\n    static long noisy(long n) {\n        System.out.println("x".repeat(5000));\n        return n;\n    }\n}\n`,
    },
  },
  {
    capability: "N-ary tree as input",
    signature: { name: "max_depth", params: [{ name: "root", type: "NaryTree" }], returns: "int" },
    tests: [
      { stdin: "[[1,null,3,2,4,null,5,6]]", expectedStdout: "3" },
      { stdin: "[[]]", expectedStdout: "0" },
      { stdin: "[[1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14]]", expectedStdout: "5" },
    ],
    solutions: {
      python: `def max_depth(root):\n    return 0 if root is None else 1 + max((max_depth(c) for c in root.children), default=0)\n`,
      javascript: `function maxDepth(root) {\n  return root ? 1 + Math.max(0, ...root.children.map(maxDepth)) : 0;\n}\n`,
      cpp: `long long maxDepth(Node* root) {\n    if (!root) return 0;\n    long long best = 0;\n    for (Node* c : root->children) best = std::max(best, maxDepth(c));\n    return best + 1;\n}\n`,
      java: `class Solution {\n    static long maxDepth(Node root) {\n        if (root == null) return 0;\n        long best = 0;\n        for (Node c : root.children) best = Math.max(best, maxDepth(c));\n        return best + 1;\n    }\n}\n`,
    },
  },
  {
    capability: "List with random pointers: deep copy in, deep copy out",
    signature: { name: "copy_random_list", params: [{ name: "head", type: "RandomList" }], returns: "RandomList" },
    tests: [
      { stdin: "[[[7,null],[13,0],[11,4],[10,2],[1,0]]]", expectedStdout: "[[7,null],[13,0],[11,4],[10,2],[1,0]]" },
      { stdin: "[[[3,null],[3,0],[3,null]]]", expectedStdout: "[[3,null],[3,0],[3,null]]" },
      { stdin: "[[]]", expectedStdout: "[]" },
    ],
    solutions: {
      python: `def copy_random_list(head):\n    copies = {None: None}\n    node = head\n    while node:\n        copies[node] = Node(node.val)\n        node = node.next\n    node = head\n    while node:\n        copies[node].next = copies[node.next]\n        copies[node].random = copies[node.random]\n        node = node.next\n    return copies[head]\n`,
      javascript: `function copyRandomList(head) {\n  const copies = new Map([[null, null]]);\n  for (let n = head; n; n = n.next) copies.set(n, new Node(n.val));\n  for (let n = head; n; n = n.next) {\n    copies.get(n).next = copies.get(n.next);\n    copies.get(n).random = copies.get(n.random);\n  }\n  return copies.get(head);\n}\n`,
      cpp: `Node* copyRandomList(Node* head) {\n    std::unordered_map<Node*, Node*> copies{{nullptr, nullptr}};\n    for (Node* n = head; n; n = n->next) copies[n] = new Node(n->val);\n    for (Node* n = head; n; n = n->next) { copies[n]->next = copies[n->next]; copies[n]->random = copies[n->random]; }\n    return copies[head];\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static Node copyRandomList(Node head) {\n        Map<Node, Node> copies = new HashMap<>();\n        copies.put(null, null);\n        for (Node n = head; n != null; n = n.next) copies.put(n, new Node(n.val));\n        for (Node n = head; n != null; n = n.next) { copies.get(n).next = copies.get(n.next); copies.get(n).random = copies.get(n.random); }\n        return copies.get(head);\n    }\n}\n`,
    },
  },
  {
    capability: "Returning the original list instead of a copy is caught",
    signature: { name: "copy_random_list", params: [{ name: "head", type: "RandomList" }], returns: "RandomList" },
    tests: [{ stdin: "[[[7,null],[13,0]]]", expectedStdout: "[[7,null],[13,0]]" }],
    verdict: "runtime_error",
    stderrIncludes: "deep copy",
    solutions: {
      python: `def copy_random_list(head):\n    return head\n`,
      javascript: `function copyRandomList(head) {\n  return head;\n}\n`,
      cpp: `Node* copyRandomList(Node* head) {\n    return head;\n}\n`,
      java: `class Solution {\n    static Node copyRandomList(Node head) {\n        return head;\n    }\n}\n`,
    },
  },
  {
    capability: "Clone Graph",
    signature: { name: "clone_graph", params: [{ name: "node", type: "Graph" }], returns: "Graph" },
    tests: [
      { stdin: "[[[2,4],[1,3],[2,4],[1,3]]]", expectedStdout: "[[2,4],[1,3],[2,4],[1,3]]" },
      { stdin: "[[[]]]", expectedStdout: "[[]]" },
      { stdin: "[[]]", expectedStdout: "[]" },
    ],
    solutions: {
      python: `def clone_graph(node):\n    if node is None:\n        return None\n    copies = {node: Node(node.val)}\n    stack = [node]\n    while stack:\n        cur = stack.pop()\n        for nb in cur.neighbors:\n            if nb not in copies:\n                copies[nb] = Node(nb.val)\n                stack.append(nb)\n            copies[cur].neighbors.append(copies[nb])\n    return copies[node]\n`,
      javascript: `function cloneGraph(node) {\n  if (!node) return null;\n  const copies = new Map([[node, new Node(node.val, [])]]);\n  const stack = [node];\n  while (stack.length) {\n    const cur = stack.pop();\n    for (const nb of cur.neighbors) {\n      if (!copies.has(nb)) { copies.set(nb, new Node(nb.val, [])); stack.push(nb); }\n      copies.get(cur).neighbors.push(copies.get(nb));\n    }\n  }\n  return copies.get(node);\n}\n`,
      cpp: `Node* cloneGraph(Node* node) {\n    if (!node) return nullptr;\n    std::unordered_map<Node*, Node*> copies{{node, new Node(node->val)}};\n    std::vector<Node*> stack{node};\n    while (!stack.empty()) {\n        Node* cur = stack.back(); stack.pop_back();\n        for (Node* nb : cur->neighbors) {\n            if (!copies.count(nb)) { copies[nb] = new Node(nb->val); stack.push_back(nb); }\n            copies[cur]->neighbors.push_back(copies[nb]);\n        }\n    }\n    return copies[node];\n}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    static Node cloneGraph(Node node) {\n        if (node == null) return null;\n        Map<Node, Node> copies = new HashMap<>();\n        copies.put(node, new Node(node.val));\n        Deque<Node> stack = new ArrayDeque<>();\n        stack.push(node);\n        while (!stack.isEmpty()) {\n            Node cur = stack.pop();\n            for (Node nb : cur.neighbors) {\n                if (!copies.containsKey(nb)) { copies.put(nb, new Node(nb.val)); stack.push(nb); }\n                copies.get(cur).neighbors.add(copies.get(nb));\n            }\n        }\n        return copies.get(node);\n    }\n}\n`,
    },
  },
  {
    capability: "Interactive: the judge provides is_bad_version, reading a hidden value",
    signature: {
      name: "first_bad_version",
      params: [{ name: "n", type: "int" }],
      returns: "int",
      hidden: [{ name: "bad", type: "int" }],
      provided: {
        functions: [{ name: "is_bad_version", params: [{ name: "version", type: "int" }], returns: "bool" }],
        code: {
          python: `def is_bad_version(version):\n    return version >= bad\n`,
          javascript: `function isBadVersion(version) {\n  return version >= bad;\n}\n`,
          cpp: `bool isBadVersion(long long version) {\n    return version >= Hidden::bad;\n}\n`,
          java: `class Provided {\n    static boolean isBadVersion(long version) {\n        return version >= Hidden.bad;\n    }\n}\n`,
        },
      },
    },
    tests: [
      { stdin: "[5,4]", expectedStdout: "4" },
      { stdin: "[1,1]", expectedStdout: "1" },
      { stdin: "[2126753390,1702766719]", expectedStdout: "1702766719" },
    ],
    solutions: {
      python: `def first_bad_version(n):\n    lo, hi = 1, n\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if is_bad_version(mid):\n            hi = mid\n        else:\n            lo = mid + 1\n    return lo\n`,
      javascript: `function firstBadVersion(n) {\n  let lo = 1, hi = n;\n  while (lo < hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (isBadVersion(mid)) hi = mid; else lo = mid + 1;\n  }\n  return lo;\n}\n`,
      cpp: `long long firstBadVersion(long long n) {\n    long long lo = 1, hi = n;\n    while (lo < hi) {\n        long long mid = lo + (hi - lo) / 2;\n        if (isBadVersion(mid)) hi = mid; else lo = mid + 1;\n    }\n    return lo;\n}\n`,
      java: `class Solution extends Provided {\n    static long firstBadVersion(long n) {\n        long lo = 1, hi = n;\n        while (lo < hi) {\n            long mid = lo + (hi - lo) / 2;\n            if (isBadVersion(mid)) hi = mid; else lo = mid + 1;\n        }\n        return lo;\n    }\n}\n`,
    },
  },
  {
    capability: "Interactive: the hidden value is not reachable by name in Python or JavaScript",
    signature: {
      name: "first_bad_version",
      params: [{ name: "n", type: "int" }],
      returns: "int",
      hidden: [{ name: "bad", type: "int" }],
      provided: {
        functions: [{ name: "is_bad_version", params: [{ name: "version", type: "int" }], returns: "bool" }],
        code: {
          python: `def is_bad_version(version):\n    return version >= bad\n`,
          javascript: `function isBadVersion(version) {\n  return version >= bad;\n}\n`,
          cpp: `bool isBadVersion(long long version) {\n    return version >= Hidden::bad;\n}\n`,
          java: `class Provided {\n    static boolean isBadVersion(long version) {\n        return version >= Hidden.bad;\n    }\n}\n`,
        },
      },
    },
    tests: [{ stdin: "[5,4]", expectedStdout: "4" }],
    // Reading \`bad\` directly must fail. C++ and Java cannot hide a global, so
    // they only prove the call path; a cheat there is visible in the source.
    verdict: "runtime_error",
    solutions: {
      python: `def first_bad_version(n):\n    return bad\n`,
      javascript: `function firstBadVersion(n) {\n  return bad;\n}\n`,
      cpp: `long long firstBadVersion(long long n) {\n    return undefinedName;\n}\n`,
      java: `class Solution extends Provided {\n    static long firstBadVersion(long n) {\n        return undefinedName;\n    }\n}\n`,
    },
  },
  {
    capability: "Many right answers: a checker accepts any valid pair, not just the stored one",
    signature: {
      name: "any_pair",
      params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }],
      returns: "int[]",
      checker: `def check(args, expected, actual):\n    nums, target = args\n    return (isinstance(actual, list) and len(actual) == 2\n            and all(isinstance(i, int) and 0 <= i < len(nums) for i in actual)\n            and actual[0] != actual[1] and nums[actual[0]] + nums[actual[1]] == target)\n`,
    },
    // Stored answers are the first pair; every solution returns a different valid one.
    tests: [
      { stdin: "[[1,5,2,4,3],6]", expectedStdout: "[0,1]" },
      { stdin: "[[3,3,3],6]", expectedStdout: "[0,1]" },
    ],
    solutions: {
      python: `def any_pair(nums, target):\n    for i in range(len(nums) - 1, -1, -1):\n        for j in range(i):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n`,
      javascript: `function anyPair(nums, target) {\n  for (let i = nums.length - 1; i >= 0; i--) for (let j = 0; j < i; j++) if (nums[i] + nums[j] === target) return [i, j];\n}\n`,
      cpp: `std::vector<long long> anyPair(std::vector<long long> nums, long long target) {\n    for (int i = nums.size() - 1; i >= 0; i--) for (int j = 0; j < i; j++) if (nums[i] + nums[j] == target) return {i, j};\n    return {};\n}\n`,
      java: `class Solution {\n    static long[] anyPair(long[] nums, long target) {\n        for (int i = nums.length - 1; i >= 0; i--) for (int j = 0; j < i; j++) if (nums[i] + nums[j] == target) return new long[]{i, j};\n        return new long[0];\n    }\n}\n`,
    },
  },
  {
    capability: "Many right answers: the checker still rejects a wrong pair",
    signature: {
      name: "any_pair",
      params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }],
      returns: "int[]",
      checker: `def check(args, expected, actual):\n    nums, target = args\n    return (isinstance(actual, list) and len(actual) == 2\n            and all(isinstance(i, int) and 0 <= i < len(nums) for i in actual)\n            and actual[0] != actual[1] and nums[actual[0]] + nums[actual[1]] == target)\n`,
    },
    tests: [{ stdin: "[[1,5,2,4,3],6]", expectedStdout: "[0,1]" }],
    verdict: "wrong_answer",
    solutions: {
      python: `def any_pair(nums, target):\n    return [0, 0]\n`,
      javascript: `function anyPair(nums, target) {\n  return [0, 0];\n}\n`,
      cpp: `std::vector<long long> anyPair(std::vector<long long> nums, long long target) {\n    return {0, 0};\n}\n`,
      java: `class Solution {\n    static long[] anyPair(long[] nums, long target) {\n        return new long[]{0, 0};\n    }\n}\n`,
    },
  },
];

const only = process.argv[2] as Language | undefined;

async function main() {
  let failures = 0;

  for (const c of CASES) {
    // Every case must also be a problem an admin could author.
    if (!c.verdict) {
      const invalid = validateProblem({
        slug: "capability",
        signature: c.signature,
        points: 100,
        timeLimitMs: 5000,
        starterCode: starterCodeFor(c.signature),
        tests: c.tests.map((t, i) => ({ ...t, isSample: i === 0 })),
      });
      assert.deepEqual(invalid, [], `${c.capability}: not a valid problem`);
    }

    console.log(`\n${c.capability}`);
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
      const want = c.verdict ?? "accepted";
      const stderr = result.outcomes.map((o) => o.stderr ?? "").join("\n");
      // The missing-function message is the harness's own in Python and
      // JavaScript; the compilers report it their own way in C++ and Java.
      const messageMatters = c.stderrIncludes && !(c.stderrIncludes.startsWith("Define") && (language === "cpp" || language === "java"));
      const verdictOk =
        result.verdict === want ||
        (want === "runtime_error" &&
          (c.stderrIncludes?.startsWith("Define") || c.capability.includes("not reachable")) &&
          result.verdict === "compile_error");
      const ok = verdictOk && (!messageMatters || stderr.includes(c.stderrIncludes!));
      if (!ok) failures++;
      const detail = ok
        ? ""
        : result.outcomes
            .map((o) => `${o.verdict}: out=${(o.actual ?? "").trim().slice(0, 80)} err=${(o.stderr ?? "").trim().slice(0, 240)}`)
            .join(" | ");
      console.log(`  ${language.padEnd(11)} ${ok ? "ok" : "FAIL"}  ${detail}`);
    }
  }

  // Java: a class named Main collides with the judge's own, and gets a clear message.
  const clash = await runTests({
    language: "java",
    source: "public class Main {\n    static long addOne(long n) { return n + 1; }\n}\n",
    signature: { name: "add_one", params: [{ name: "n", type: "int" }], returns: "int" },
    tests: [{ stdin: "[1]", expectedStdout: "2" }],
    revealActual: true,
    timeLimitMs: 5000,
    memoryLimitKb: 262144,
  });
  const clashOk = clash.verdict === "compile_error" && (clash.outcomes[0]?.stderr ?? "").includes("Rename your class Main");
  if (!clashOk) failures++;
  console.log(`\nJava class named Main is refused with a clear message\n  java        ${clashOk ? "ok" : "FAIL"}`);

  assert.equal(failures, 0, `${failures} capability run(s) failed`);
  console.log("\ncheck-capabilities: every capability works in every language");
  process.exit(0);
}

void main();
