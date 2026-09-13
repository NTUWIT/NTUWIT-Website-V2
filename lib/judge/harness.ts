import type { Language } from "@/lib/languages";
import {
  answerType,
  camel,
  DOUBLE_PRECISION,
  isDesign,
  nodeKind,
  type Method,
  type NodeKind,
  type Param,
  type ParamType,
  type ReturnType,
  type Signature,
} from "@/lib/problems/signature";
import { CPP as CPP_TYPE, JAVA as JAVA_TYPE } from "@/lib/problems/starter";

/**
 * Wraps a participant's code in a runnable program. That program, not the
 * participant, is the entry point: it reads the test, calls their function or
 * class, and prints the result as canonical JSON. Helpers the participant
 * writes are fine; nothing they write can replace the call or read the test
 * first.
 *
 * - Python runs their code as a module named `solution`, so their own
 *   `if __name__ == "__main__":` block does not run, and tracebacks point at
 *   their own line numbers.
 * - JavaScript reads the test before their code loads and runs it in a worker.
 * - C++ renames any `main` they write, so it becomes an ordinary function.
 * - Java rejects a class named Main before judging (see runner.ts).
 *
 * Every language runs the call on a large stack: default stacks overflow on
 * the deep recursion that ordinary DFS solutions reach at LeetCode sizes.
 *
 * Linked lists and trees travel as JSON in LeetCode's format. A list may also
 * be `{"values":[...],"cycleAt":k}`, whose tail links back to node k.
 */

const CPP_READER: Record<ParamType, string> = {
  int: "__rd_int()",
  double: "__rd_double()",
  bool: "__rd_bool()",
  string: "__rd_str()",
  char: "__rd_char()",
  "int[]": "__rd_vec_int()",
  "double[]": "__rd_vec_double()",
  "bool[]": "__rd_vec_bool()",
  "string[]": "__rd_vec_str()",
  "char[]": "__rd_vec_char()",
  "int[][]": "__rd_mat_int()",
  "string[][]": "__rd_mat_str()",
  "char[][]": "__rd_mat_char()",
  "map<string,int>": "__rd_map_int()",
  ListNode: "__rd_list()",
  TreeNode: "__rd_tree()",
  NaryTree: "__rd_nary()",
  RandomList: "__rd_random()",
  Graph: "__rd_graph()",
};

const JAVA_READER: Record<ParamType, string> = {
  int: "rdInt()",
  double: "rdDouble()",
  bool: "rdBool()",
  string: "rdStr()",
  char: "rdChar()",
  "int[]": "rdIntArr()",
  "double[]": "rdDoubleArr()",
  "bool[]": "rdBoolArr()",
  "string[]": "rdStrArr()",
  "char[]": "rdCharArr()",
  "int[][]": "rdIntMat()",
  "string[][]": "rdStrMat()",
  "char[][]": "rdCharMat()",
  "map<string,int>": "rdMap()",
  ListNode: "rdList()",
  TreeNode: "rdTree()",
  NaryTree: "rdNary()",
  RandomList: "rdRandom()",
  Graph: "rdGraph()",
};

/** Python and JavaScript receive plain JSON; only nodes need building. */
const NODE_IN: Partial<Record<ParamType, string>> = {
  ListNode: "__to_list",
  TreeNode: "__to_tree",
  NaryTree: "__to_nary",
  RandomList: "__to_random",
  Graph: "__to_graph",
};
const NODE_OUT: Partial<Record<ParamType, string>> = {
  ListNode: "__from_list",
  TreeNode: "__from_tree",
  NaryTree: "__from_nary",
  RandomList: "__from_random",
  Graph: "__from_graph",
};

const scriptIn = (type: ParamType, expr: string) => (NODE_IN[type] ? `${NODE_IN[type]}(${expr})` : expr);
const scriptOut = (type: ParamType, expr: string) => `__fmt(${NODE_OUT[type] ? `${NODE_OUT[type]}(${expr})` : expr})`;

/** Index of the parameter whose final value is the answer, for a void function. */
const mutatedIndex = (sig: Signature) => sig.params.findIndex((p) => p.name === sig.mutates);

/* ================================ Python ================================ */

const PY_RUNTIME = `import json as __json, sys as __sys, io as __io, contextlib as __ctx
import threading as __threading, traceback as __traceback

# The test is read before the participant's code runs, so nothing they write
# can consume it.
__RAW = __sys.stdin.read()
__sys.stdin = __io.StringIO("")

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __to_list(a):
    values, cycle_at = (a["values"], a["cycleAt"]) if isinstance(a, dict) else (a, -1)
    nodes = [ListNode(v) for v in values]
    for x, y in zip(nodes, nodes[1:]):
        x.next = y
    if nodes and cycle_at >= 0:
        nodes[-1].next = nodes[cycle_at]
    return nodes[0] if nodes else None

def __to_tree(a):
    if not a:
        return None
    nodes = [None if v is None else TreeNode(v) for v in a]
    i = 1
    for node in nodes:
        if i >= len(nodes):
            break
        if node is None:
            continue
        node.left = nodes[i]
        i += 1
        if i < len(nodes):
            node.right = nodes[i]
            i += 1
    return nodes[0]

def __from_list(h):
    out, seen = [], set()
    while h is not None:
        if id(h) in seen:
            raise ValueError("the returned linked list loops back on itself, so it has no end to print")
        seen.add(id(h))
        out.append(h.val)
        h = h.next
    return out

def __from_tree(r):
    out, queue, i = [], [r], 0
    while i < len(queue):
        n = queue[i]
        i += 1
        if n is None:
            out.append(None)
            continue
        out.append(n.val)
        queue.append(n.left)
        queue.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out

# Every node built from the test, so a returned copy can be told from the original.
__INPUT = set()

def __to_nary(a):
    if not a:
        return None
    root = Node(a[0], [])
    __INPUT.add(id(root))
    queue, qi, i = [root], 0, 2
    while i < len(a) and qi < len(queue):
        parent = queue[qi]
        qi += 1
        while i < len(a) and a[i] is not None:
            child = Node(a[i], [])
            __INPUT.add(id(child))
            parent.children.append(child)
            queue.append(child)
            i += 1
        i += 1
    return root

def __from_nary(root):
    if root is None:
        return []
    out, queue, qi = [root.val, None], [root], 0
    while qi < len(queue):
        node = queue[qi]
        qi += 1
        for child in node.children or []:
            out.append(child.val)
            queue.append(child)
        out.append(None)
    while out and out[-1] is None:
        out.pop()
    return out

def __to_random(a):
    nodes = [Node(v) for v, _ in a]
    for x, y in zip(nodes, nodes[1:]):
        x.next = y
    for node, (_, r) in zip(nodes, a):
        node.random = None if r is None else nodes[r]
    __INPUT.update(id(n) for n in nodes)
    return nodes[0] if nodes else None

def __from_random(h):
    nodes, index = [], {}
    while h is not None:
        if id(h) in index:
            raise ValueError("the returned list loops back on itself, so it has no end to print")
        if id(h) in __INPUT:
            raise ValueError("the returned list reuses nodes from the input; return a deep copy with new nodes")
        index[id(h)] = len(nodes)
        nodes.append(h)
        h = h.next
    out = []
    for n in nodes:
        if n.random is not None and id(n.random) not in index:
            raise ValueError("a random pointer leads outside the returned list")
        out.append([n.val, None if n.random is None else index[id(n.random)]])
    return out

def __to_graph(adj):
    nodes = [Node(i + 1) for i in range(len(adj))]
    for node, row in zip(nodes, adj):
        node.neighbors = [nodes[j - 1] for j in row]
    __INPUT.update(id(n) for n in nodes)
    return nodes[0] if nodes else None

def __from_graph(start):
    if start is None:
        return []
    seen, queue, i = {id(start)}, [start], 0
    while i < len(queue):
        node = queue[i]
        i += 1
        if id(node) in __INPUT:
            raise ValueError("the returned graph reuses nodes from the input; return a deep copy with new nodes")
        for nb in node.neighbors:
            if id(nb) not in seen:
                seen.add(id(nb))
                queue.append(nb)
    return [[nb.val for nb in n.neighbors] for n in sorted(queue, key=lambda n: n.val)]

def __fmt(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return format(v, ".${DOUBLE_PRECISION}f")
    if isinstance(v, str):
        return __json.dumps(v, ensure_ascii=False)
    if isinstance(v, dict):
        return "{" + ",".join(__json.dumps(str(k), ensure_ascii=False) + ":" + __fmt(v[k]) for k in sorted(v, key=str)) + "}"
    if isinstance(v, (list, tuple, set, frozenset)):
        return "[" + ",".join(__fmt(x) for x in v) + "]"
    return __json.dumps(v, ensure_ascii=False)
`;

function pythonBody(sig: Signature): string {
  if (!isDesign(sig)) {
    const convert = sig.params
      .map((p, i) => (NODE_IN[p.type] ? `    args[${i}] = ${NODE_IN[p.type]}(args[${i}])` : ""))
      .filter(Boolean)
      .join("\n");
    const answer =
      sig.returns === "void" ? scriptOut(answerType(sig), `args[${mutatedIndex(sig)}]`) : scriptOut(sig.returns, "result");
    return `    fn = ns.get(${JSON.stringify(sig.name)})
    if not callable(fn):
        raise NameError("Define a function called ${sig.name}. The judge calls it with each test's arguments.")
    args = __json.loads(__RAW or "[]")[:${sig.params.length}]
${convert}
    result = fn(*args)
    return ${answer}`;
  }

  const call = (m: Method) => {
    const invoke = `o.${m.name}(${m.params.map((p, k) => scriptIn(p.type, `a[${k}]`)).join(", ")})`;
    return m.returns === "void" ? `lambda o, a: (${invoke}, "null")[1]` : `lambda o, a: ${scriptOut(m.returns, invoke)}`;
  };
  return `    cls = ns.get(${JSON.stringify(sig.name)})
    if not isinstance(cls, type):
        raise NameError("Define a class called ${sig.name}. The judge creates it and calls its methods.")
    methods = {
${sig.methods!.map((m) => `        ${JSON.stringify(m.name)}: ${call(m)},`).join("\n")}
    }
    ops, values = __json.loads(__RAW)
    obj = cls(${sig.params.map((p, k) => scriptIn(p.type, `values[0][${k}]`)).join(", ")})
    out = ["null"]
    for op, a in zip(ops[1:], values[1:]):
        out.append(methods[op](obj, a))
    return "[" + ",".join(out) + "]"`;
}

/** LeetCode's Node, for whichever kind the problem uses. */
const PY_NODE: Record<NodeKind, string> = {
  NaryTree: `class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []
`,
  RandomList: `class Node:
    def __init__(self, x=0, next=None, random=None):
        self.val = int(x)
        self.next = next
        self.random = random
`,
  Graph: `class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []
`,
};

/**
 * An interactive problem's own functions run in a namespace of their own,
 * holding the hidden values; only the functions are handed to the
 * participant's code, so the answer is not sitting in their scope by name.
 */
function pythonProvided(sig: Signature, classes: string): string {
  if (!sig.provided) return "";
  const first = sig.params.length;
  const hidden = (sig.hidden ?? [])
    .map((h, i) => `        ${JSON.stringify(h.name)}: ${scriptIn(h.type, `__all[${first + i}]`)},`)
    .join("\n");
  return `    __all = __json.loads(__RAW or "[]")
    provided = {"__name__": "provided", ${classes}}
    exec("from typing import *", provided)
    provided.update({
${hidden}
    })
    exec(compile(__PROVIDED, "provided.py", "exec"), provided)
${sig.provided.functions.map((f) => `    ns[${JSON.stringify(f.name)}] = provided[${JSON.stringify(f.name)}]`).join("\n")}
`;
}

function pythonHarness(source: string, sig: Signature): string {
  const kind = nodeKind(sig);
  const classes = `"ListNode": ListNode, "TreeNode": TreeNode${kind ? ', "Node": Node' : ""}`;
  return `${PY_RUNTIME}
${kind ? PY_NODE[kind] : ""}
__SOURCE = ${JSON.stringify(source)}
${sig.provided ? `__PROVIDED = ${JSON.stringify(sig.provided.code.python)}` : ""}

def __solve():
    # The participant's code runs as a module named "solution", not "__main__":
    # a main block of their own does not run, and tracebacks show their lines.
    ns = {"__name__": "solution", ${classes}}
    exec("from typing import *", ns)
${pythonProvided(sig, classes)}    exec(compile(__SOURCE, "solution.py", "exec"), ns)
${pythonBody(sig)}

def __main():
    result, failure = {}, []
    # Debug prints must not corrupt the answer, so they are captured and sent
    # to stderr, where the Run view shows them.
    buf = __io.StringIO()
    def run():
        try:
            with __ctx.redirect_stdout(buf):
                result["text"] = __solve()
        except BaseException:
            failure.append(__traceback.format_exc())
    # Deep recursion is ordinary in DFS solutions; Python's default of 1,000
    # frames is not. The call runs on a thread with a large stack to match.
    __sys.setrecursionlimit(1_000_000)
    try:
        __threading.stack_size(256 * 1024 * 1024)
        worker = __threading.Thread(target=run)
        worker.start()
        worker.join()
    except (RuntimeError, ValueError, MemoryError):
        run()
    if buf.getvalue():
        __sys.stderr.write(buf.getvalue())
    if failure:
        __sys.stderr.write(failure[0])
        __sys.exit(1)
    print(result["text"])

__main()
`;
}

/* ============================== JavaScript ============================== */

function javascriptBody(sig: Signature): string {
  if (!isDesign(sig)) {
    const convert = sig.params
      .map((p, i) => (NODE_IN[p.type] ? `  args[${i}] = ${NODE_IN[p.type]}(args[${i}]);` : ""))
      .filter(Boolean)
      .join("\n");
    const answer =
      sig.returns === "void" ? scriptOut(answerType(sig), `args[${mutatedIndex(sig)}]`) : scriptOut(sig.returns, "result");
    return `  if (typeof __entry !== "function") {
    throw new Error("Define a function called ${camel(sig.name)}. The judge calls it with each test's arguments.");
  }
  const args = JSON.parse(__RAW || "[]").slice(0, ${sig.params.length});
${convert}
  const result = __entry(...args);
  return ${answer};`;
  }

  const cases = sig.methods!
    .map((m) => {
      const invoke = `obj.${camel(m.name)}(${m.params.map((p, k) => scriptIn(p.type, `a[${k}]`)).join(", ")})`;
      return m.returns === "void"
        ? `      case ${JSON.stringify(m.name)}: ${invoke}; out.push("null"); break;`
        : `      case ${JSON.stringify(m.name)}: out.push(${scriptOut(m.returns, invoke)}); break;`;
    })
    .join("\n");
  return `  if (typeof __entry !== "function") {
    throw new Error("Define a class called ${sig.name}. The judge creates it and calls its methods.");
  }
  const [ops, values] = JSON.parse(__RAW);
  const obj = new __entry(${sig.params.map((p, k) => scriptIn(p.type, `values[0][${k}]`)).join(", ")});
  const out = ["null"];
  for (let i = 1; i < ops.length; i++) {
    const a = values[i];
    switch (ops[i]) {
${cases}
      default: throw new Error("unknown operation " + ops[i]);
    }
  }
  return "[" + out.join(",") + "]";`;
}

const JS_NODE: Record<NodeKind, string> = {
  NaryTree: `globalThis.Node = class Node {
  constructor(val = null, children = []) { this.val = val; this.children = children; }
};`,
  RandomList: `globalThis.Node = class Node {
  constructor(val = 0, next = null, random = null) { this.val = val; this.next = next; this.random = random; }
};`,
  Graph: `globalThis.Node = class Node {
  constructor(val = 0, neighbors = []) { this.val = val; this.neighbors = neighbors; }
};`,
};

/** The interactive problem's own functions, in a closure holding the hidden values. */
function javascriptProvided(sig: Signature): { setup: string; bindings: string } {
  if (!sig.provided) return { setup: "", bindings: "" };
  const first = sig.params.length;
  const names = sig.provided.functions.map((f) => camel(f.name));
  const hidden = (sig.hidden ?? [])
    .map((h, i) => `      const ${camel(h.name)} = ${scriptIn(h.type, `__all[${first + i}]`)};`)
    .join("\n");
  return {
    setup: `    const __all = JSON.parse(__RAW || "[]");
    const __provided = (() => {
${hidden}
${sig.provided.code.javascript}
;return { ${names.map((n) => `${n}: typeof ${n} === "function" ? ${n} : null`).join(", ")} };
    })();
`,
    bindings: names.map((n) => `      const ${n} = __provided.${n};`).join("\n") + "\n",
  };
}

function javascriptHarness(source: string, sig: Signature): string {
  const entryName = isDesign(sig) ? sig.name : camel(sig.name);
  const kind = nodeKind(sig);
  const provided = javascriptProvided(sig);
  // Assigned to globalThis rather than declared: a participant who pastes
  // their own \`class ListNode\` then shadows these instead of colliding.
  return `const { Worker, isMainThread, workerData } = require("worker_threads");

globalThis.ListNode = class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
};
globalThis.TreeNode = class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
};
${kind ? JS_NODE[kind] : ""}

const __to_list = (a) => {
  const values = Array.isArray(a) ? a : a.values;
  const cycleAt = Array.isArray(a) ? -1 : a.cycleAt;
  const nodes = values.map((v) => new ListNode(v));
  nodes.forEach((n, i) => { n.next = nodes[i + 1] ?? null; });
  if (nodes.length && cycleAt >= 0) nodes[nodes.length - 1].next = nodes[cycleAt];
  return nodes[0] ?? null;
};
const __to_tree = (a) => {
  if (!a.length) return null;
  const nodes = a.map((v) => (v === null ? null : new TreeNode(v)));
  let i = 1;
  for (const node of nodes) {
    if (i >= nodes.length) break;
    if (!node) continue;
    node.left = nodes[i++];
    if (i < nodes.length) node.right = nodes[i++];
  }
  return nodes[0];
};
const __from_list = (h) => {
  const out = [], seen = new Set();
  for (; h; h = h.next) {
    if (seen.has(h)) throw new Error("the returned linked list loops back on itself, so it has no end to print");
    seen.add(h);
    out.push(h.val);
  }
  return out;
};
const __from_tree = (r) => {
  const out = [], queue = [r];
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    if (!n) { out.push(null); continue; }
    out.push(n.val);
    queue.push(n.left, n.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
// Every node built from the test, so a returned copy can be told from the original.
const __INPUT = new Set();
const __to_nary = (a) => {
  if (!a.length) return null;
  const root = new Node(a[0], []);
  __INPUT.add(root);
  const queue = [root];
  let i = 2, qi = 0;
  while (i < a.length && qi < queue.length) {
    const parent = queue[qi++];
    while (i < a.length && a[i] !== null) {
      const child = new Node(a[i++], []);
      __INPUT.add(child);
      parent.children.push(child);
      queue.push(child);
    }
    i++;
  }
  return root;
};
const __from_nary = (root) => {
  if (!root) return [];
  const out = [root.val, null], queue = [root];
  for (let i = 0; i < queue.length; i++) {
    for (const child of queue[i].children || []) { out.push(child.val); queue.push(child); }
    out.push(null);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};
const __to_random = (a) => {
  const nodes = a.map(([v]) => new Node(v, null, null));
  nodes.forEach((n, i) => {
    n.next = nodes[i + 1] ?? null;
    n.random = a[i][1] === null ? null : nodes[a[i][1]];
    __INPUT.add(n);
  });
  return nodes[0] ?? null;
};
const __from_random = (h) => {
  const nodes = [], index = new Map();
  for (; h; h = h.next) {
    if (index.has(h)) throw new Error("the returned list loops back on itself, so it has no end to print");
    if (__INPUT.has(h)) throw new Error("the returned list reuses nodes from the input; return a deep copy with new nodes");
    index.set(h, nodes.length);
    nodes.push(h);
  }
  return nodes.map((n) => {
    if (n.random && !index.has(n.random)) throw new Error("a random pointer leads outside the returned list");
    return [n.val, n.random ? index.get(n.random) : null];
  });
};
const __to_graph = (adj) => {
  const nodes = adj.map((_, i) => new Node(i + 1, []));
  nodes.forEach((n, i) => { n.neighbors = adj[i].map((j) => nodes[j - 1]); __INPUT.add(n); });
  return nodes[0] ?? null;
};
const __from_graph = (start) => {
  if (!start) return [];
  const seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    if (__INPUT.has(queue[i])) throw new Error("the returned graph reuses nodes from the input; return a deep copy with new nodes");
    for (const n of queue[i].neighbors) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return queue.sort((a, b) => a.val - b.val).map((n) => n.neighbors.map((m) => m.val));
};

const __fmt = (v) => {
  if (v == null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(${DOUBLE_PRECISION});
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v) || ArrayBuffer.isView(v) || v instanceof Set) return "[" + Array.from(v, __fmt).join(",") + "]";
  if (v instanceof Map) return __fmt(Object.fromEntries(v));
  if (typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + __fmt(v[k])).join(",") + "}";
  return JSON.stringify(v);
};

function __solve(__RAW) {
  // Debug logs must not corrupt the answer: capture them, including any from
  // the participant's top-level code, and send them to stderr.
  const __debug = [];
  const __log = console.log;
  console.log = (...a) => __debug.push(a.map(String).join(" "));
  try {
    // The participant's code, in its own scope. It runs after the test was
    // read, so it cannot consume the input.
${provided.setup}    const __entry = (() => {
${provided.bindings}${source}
;return typeof ${entryName} === "function" ? ${entryName} : null;
    })();
    const text = (() => {
${javascriptBody(sig)}
    })();
    console.log = __log;
    process.stdout.write(text + "\\n");
  } finally {
    console.log = __log;
    if (__debug.length) process.stderr.write(__debug.join("\\n") + "\\n");
  }
}

if (isMainThread) {
  const raw = require("fs").readFileSync(0, "utf8");
  // A worker gets a large stack; Node's default overflows near 10,000 frames,
  // which an ordinary recursive DFS reaches at LeetCode sizes.
  let worker = null;
  try {
    worker = new Worker(__filename, { workerData: raw, resourceLimits: { stackSizeMb: 256 } });
  } catch {
    __solve(raw);
  }
  if (worker) {
    worker.on("error", (e) => {
      process.stderr.write(String((e && e.stack) || e) + "\\n");
      process.exitCode = 1;
    });
    worker.on("exit", (code) => {
      if (code !== 0 && !process.exitCode) process.exitCode = code;
    });
  }
} else {
  __solve(workerData);
}
`;
}

/* ================================= C++ ================================== */

const CPP_RUNTIME = String.raw`#include <bits/stdc++.h>
#include <ucontext.h>

struct ListNode {
    int val; ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *n) : val(x), next(n) {}
};
struct TreeNode {
    int val; TreeNode *left; TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {}
};

static std::string __in;
static size_t __pos = 0;
static void __ws() { while (__pos < __in.size() && isspace((unsigned char)__in[__pos])) __pos++; }
static void __eat(char c) { __ws(); if (__pos < __in.size() && __in[__pos] == c) __pos++; }
static bool __at(char c) { __ws(); return __pos < __in.size() && __in[__pos] == c; }
static long long __rd_int() { __ws(); size_t s = __pos; if (__pos < __in.size() && (__in[__pos] == '-' || __in[__pos] == '+')) __pos++; while (__pos < __in.size() && isdigit((unsigned char)__in[__pos])) __pos++; return std::stoll(__in.substr(s, __pos - s)); }
static double __rd_double() { __ws(); size_t s = __pos; while (__pos < __in.size() && (isdigit((unsigned char)__in[__pos]) || strchr("+-.eE", __in[__pos]))) __pos++; return std::stod(__in.substr(s, __pos - s)); }
static bool __rd_bool() { __ws(); if (__in.compare(__pos, 4, "true") == 0) { __pos += 4; return true; } __pos += 5; return false; }
static bool __rd_null() { __ws(); if (__in.compare(__pos, 4, "null") == 0) { __pos += 4; return true; } return false; }
static void __utf8(std::string &o, unsigned cp) {
    if (cp < 0x80) o += (char)cp;
    else if (cp < 0x800) { o += (char)(0xC0 | (cp >> 6)); o += (char)(0x80 | (cp & 0x3F)); }
    else if (cp < 0x10000) { o += (char)(0xE0 | (cp >> 12)); o += (char)(0x80 | ((cp >> 6) & 0x3F)); o += (char)(0x80 | (cp & 0x3F)); }
    else { o += (char)(0xF0 | (cp >> 18)); o += (char)(0x80 | ((cp >> 12) & 0x3F)); o += (char)(0x80 | ((cp >> 6) & 0x3F)); o += (char)(0x80 | (cp & 0x3F)); }
}
static unsigned __hex4() { unsigned v = (unsigned)std::stoul(__in.substr(__pos, 4), nullptr, 16); __pos += 4; return v; }
// Every JSON escape, so text round-trips exactly as Python and JavaScript read it.
static std::string __rd_str() {
    __ws(); __eat('"'); std::string out;
    while (__pos < __in.size() && __in[__pos] != '"') {
        char c = __in[__pos++];
        if (c != '\\') { out += c; continue; }
        char e = __in[__pos++];
        switch (e) {
            case 'n': out += '\n'; break;
            case 't': out += '\t'; break;
            case 'r': out += '\r'; break;
            case 'b': out += '\b'; break;
            case 'f': out += '\f'; break;
            case 'u': {
                unsigned cp = __hex4();
                if (cp >= 0xD800 && cp < 0xDC00 && __in.compare(__pos, 2, "\\u") == 0) {
                    __pos += 2;
                    unsigned lo = __hex4();
                    cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                }
                __utf8(out, cp);
                break;
            }
            default: out += e;
        }
    }
    __pos++; return out;
}
static char __rd_char() { std::string s = __rd_str(); return s.empty() ? '\0' : s[0]; }
template <class F> static auto __rd_vec(F f) -> std::vector<decltype(f())> {
    std::vector<decltype(f())> v; __eat('[');
    if (__at(']')) { __pos++; return v; }
    while (true) { v.push_back(f()); if (__at(',')) { __pos++; continue; } __eat(']'); break; }
    return v;
}
static std::vector<long long> __rd_vec_int() { return __rd_vec(__rd_int); }
static std::vector<double> __rd_vec_double() { return __rd_vec(__rd_double); }
static std::vector<std::string> __rd_vec_str() { return __rd_vec(__rd_str); }
static std::vector<char> __rd_vec_char() { return __rd_vec(__rd_char); }
static std::vector<bool> __rd_vec_bool() { auto t = __rd_vec(__rd_bool); return std::vector<bool>(t.begin(), t.end()); }
static std::vector<std::vector<long long>> __rd_mat_int() { return __rd_vec(__rd_vec_int); }
static std::vector<std::vector<std::string>> __rd_mat_str() { return __rd_vec(__rd_vec_str); }
static std::vector<std::vector<char>> __rd_mat_char() { return __rd_vec(__rd_vec_char); }
static std::map<std::string, long long> __rd_map_int() {
    std::map<std::string, long long> m; __eat('{');
    if (__at('}')) { __pos++; return m; }
    while (true) { std::string k = __rd_str(); __eat(':'); m[k] = __rd_int(); if (__at(',')) { __pos++; continue; } __eat('}'); break; }
    return m;
}
static ListNode *__rd_list() {
    std::vector<long long> values; long long cycleAt = -1;
    if (__at('{')) {
        __pos++;
        while (!__at('}')) {
            std::string key = __rd_str(); __eat(':');
            if (key == "values") values = __rd_vec_int(); else cycleAt = __rd_int();
            if (__at(',')) __pos++;
        }
        __pos++;
    } else {
        values = __rd_vec_int();
    }
    std::vector<ListNode *> nodes;
    for (long long v : values) nodes.push_back(new ListNode((int)v));
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    if (!nodes.empty() && cycleAt >= 0) nodes.back()->next = nodes[cycleAt];
    return nodes.empty() ? nullptr : nodes[0];
}
static TreeNode *__rd_tree() {
    auto nodes = __rd_vec([] { return __rd_null() ? (TreeNode *)nullptr : new TreeNode((int)__rd_int()); });
    if (nodes.empty()) return nullptr;
    size_t i = 1;
    for (size_t q = 0; q < nodes.size() && i < nodes.size(); q++) {
        if (!nodes[q]) continue;
        nodes[q]->left = nodes[i++];
        if (i < nodes.size()) nodes[q]->right = nodes[i++];
    }
    return nodes[0];
}

static std::string __ser(bool v) { return v ? "true" : "false"; }
static std::string __ser(long long v) { return std::to_string(v); }
static std::string __ser(int v) { return std::to_string((long long)v); }
static std::string __ser(double v) { char b[64]; snprintf(b, sizeof b, "%.${DOUBLE_PRECISION}f", v); return std::string(b); }
// Escaped exactly as JSON.stringify and Python's json.dumps do.
static std::string __ser(const std::string &s) {
    std::string o = "\"";
    for (unsigned char c : s) {
        switch (c) {
            case '"': o += "\\\""; break;
            case '\\': o += "\\\\"; break;
            case '\n': o += "\\n"; break;
            case '\t': o += "\\t"; break;
            case '\r': o += "\\r"; break;
            case '\b': o += "\\b"; break;
            case '\f': o += "\\f"; break;
            default:
                if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
                else o += (char)c;
        }
    }
    return o + "\"";
}
static std::string __ser(char c) { return __ser(std::string(1, c)); }
static std::string __ser(const char *s) { return __ser(std::string(s)); }
template <class T> static std::string __ser(const std::vector<T> &v) {
    std::string o = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) o += ","; o += __ser(v[i]); }
    return o + "]";
}
template <class V> static std::string __ser(const std::map<std::string, V> &m) {
    std::string o = "{"; bool first = true;
    for (auto &kv : m) { if (!first) o += ","; first = false; o += __ser(kv.first) + ":" + __ser(kv.second); }
    return o + "}";
}
template <class V> static std::string __ser(const std::unordered_map<std::string, V> &m) {
    return __ser(std::map<std::string, V>(m.begin(), m.end()));
}
static std::string __ser(ListNode *h) {
    std::vector<long long> v; std::unordered_set<ListNode *> seen;
    for (; h; h = h->next) {
        if (!seen.insert(h).second) throw std::runtime_error("the returned linked list loops back on itself, so it has no end to print");
        v.push_back(h->val);
    }
    return __ser(v);
}
static std::string __ser(TreeNode *r) {
    std::vector<TreeNode *> q{r}; std::vector<std::string> out;
    for (size_t i = 0; i < q.size(); i++) {
        if (!q[i]) { out.push_back("null"); continue; }
        out.push_back(std::to_string(q[i]->val));
        q.push_back(q[i]->left); q.push_back(q[i]->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string o = "[";
    for (size_t i = 0; i < out.size(); i++) { if (i) o += ","; o += out[i]; }
    return o + "]";
}
`;

/** LeetCode's Node, with its reader and writer, for whichever kind the problem uses. */
const CPP_NODE: Record<NodeKind, string> = {
  NaryTree: String.raw`
struct Node {
    int val; std::vector<Node *> children;
    Node() : val(0) {}
    Node(int v) : val(v) {}
    Node(int v, std::vector<Node *> c) : val(v), children(c) {}
};
static std::unordered_set<Node *> __input_nodes;
static Node *__rd_nary() {
    auto vals = __rd_vec([] { return __rd_null() ? LLONG_MIN : __rd_int(); });
    if (vals.empty()) return nullptr;
    std::vector<Node *> queue{new Node((int)vals[0])};
    __input_nodes.insert(queue[0]);
    size_t i = 2, qi = 0;
    while (i < vals.size() && qi < queue.size()) {
        Node *parent = queue[qi++];
        while (i < vals.size() && vals[i] != LLONG_MIN) {
            Node *c = new Node((int)vals[i++]);
            __input_nodes.insert(c); parent->children.push_back(c); queue.push_back(c);
        }
        i++;
    }
    return queue[0];
}
static std::string __ser(Node *root) {
    if (!root) return "[]";
    std::vector<std::string> out{std::to_string(root->val), "null"};
    std::vector<Node *> queue{root};
    for (size_t i = 0; i < queue.size(); i++) {
        for (Node *c : queue[i]->children) { if (!c) continue; out.push_back(std::to_string(c->val)); queue.push_back(c); }
        out.push_back("null");
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string o = "[";
    for (size_t i = 0; i < out.size(); i++) { if (i) o += ","; o += out[i]; }
    return o + "]";
}
`,
  RandomList: String.raw`
struct Node {
    int val; Node *next; Node *random;
    Node(int v) : val(v), next(nullptr), random(nullptr) {}
};
static std::unordered_set<Node *> __input_nodes;
static Node *__rd_random() {
    auto pairs = __rd_vec([] {
        __eat('['); long long v = __rd_int(); __eat(','); long long r = __rd_null() ? -1 : __rd_int(); __eat(']');
        return std::make_pair(v, r);
    });
    std::vector<Node *> nodes;
    for (auto &p : pairs) { nodes.push_back(new Node((int)p.first)); __input_nodes.insert(nodes.back()); }
    for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
    for (size_t i = 0; i < nodes.size(); i++) if (pairs[i].second >= 0) nodes[i]->random = nodes[pairs[i].second];
    return nodes.empty() ? nullptr : nodes[0];
}
static std::string __ser(Node *h) {
    std::vector<Node *> nodes; std::unordered_map<Node *, size_t> index;
    for (; h; h = h->next) {
        if (index.count(h)) throw std::runtime_error("the returned list loops back on itself, so it has no end to print");
        if (__input_nodes.count(h)) throw std::runtime_error("the returned list reuses nodes from the input; return a deep copy with new nodes");
        index[h] = nodes.size(); nodes.push_back(h);
    }
    std::string o = "[";
    for (size_t i = 0; i < nodes.size(); i++) {
        Node *r = nodes[i]->random;
        if (r && !index.count(r)) throw std::runtime_error("a random pointer leads outside the returned list");
        if (i) o += ",";
        o += "[" + std::to_string(nodes[i]->val) + "," + (r ? std::to_string(index[r]) : std::string("null")) + "]";
    }
    return o + "]";
}
`,
  Graph: String.raw`
struct Node {
    int val; std::vector<Node *> neighbors;
    Node() : val(0) {}
    Node(int v) : val(v) {}
    Node(int v, std::vector<Node *> n) : val(v), neighbors(n) {}
};
static std::unordered_set<Node *> __input_nodes;
static Node *__rd_graph() {
    auto adj = __rd_mat_int();
    std::vector<Node *> nodes;
    for (size_t i = 0; i < adj.size(); i++) { nodes.push_back(new Node((int)i + 1)); __input_nodes.insert(nodes.back()); }
    for (size_t i = 0; i < adj.size(); i++) for (long long j : adj[i]) nodes[i]->neighbors.push_back(nodes[j - 1]);
    return nodes.empty() ? nullptr : nodes[0];
}
static std::string __ser(Node *start) {
    if (!start) return "[]";
    std::vector<Node *> queue{start}; std::unordered_set<Node *> seen{start};
    for (size_t i = 0; i < queue.size(); i++) {
        if (__input_nodes.count(queue[i])) throw std::runtime_error("the returned graph reuses nodes from the input; return a deep copy with new nodes");
        for (Node *n : queue[i]->neighbors) if (seen.insert(n).second) queue.push_back(n);
    }
    std::sort(queue.begin(), queue.end(), [](Node *a, Node *b) { return a->val < b->val; });
    std::string o = "[";
    for (size_t i = 0; i < queue.size(); i++) {
        if (i) o += ",";
        o += "[";
        for (size_t k = 0; k < queue[i]->neighbors.size(); k++) { if (k) o += ","; o += std::to_string(queue[i]->neighbors[k]->val); }
        o += "]";
    }
    return o + "]";
}
`,
};

/** Hidden values in a namespace the provided code reads, then the provided code. */
function cppProvided(sig: Signature): string {
  if (!sig.provided) return "";
  const hidden = (sig.hidden ?? []).map((h) => `    ${CPP_TYPE[h.type]} ${camel(h.name)};`).join("\n");
  return `
namespace Hidden {
${hidden}
}

// The judge's provided functions.
${sig.provided.code.cpp}
`;
}

const CPP_MAIN = String.raw`
// The call runs on a 256 MB stack of its own: the default 8 MB overflows on
// the deep recursion that ordinary DFS solutions reach at LeetCode sizes.
static ucontext_t __main_ctx, __solve_ctx;
static void __trampoline() { __solve(); }

int main() {
    std::ostringstream __ss; __ss << std::cin.rdbuf(); __in = __ss.str();
    const size_t size = 256u << 20;
    void *stack = malloc(size);
    if (!stack) { __solve(); return 0; }
    getcontext(&__solve_ctx);
    __solve_ctx.uc_stack.ss_sp = stack;
    __solve_ctx.uc_stack.ss_size = size;
    __solve_ctx.uc_link = &__main_ctx;
    makecontext(&__solve_ctx, __trampoline, 0);
    swapcontext(&__main_ctx, &__solve_ctx);
    return 0;
}
`;

const cppReads = (params: Param[], prefix: string) =>
  params
    .map((p, i) => `    ${CPP_TYPE[p.type]} ${prefix}${i} = ${CPP_READER[p.type]};${i < params.length - 1 ? " __eat(',');" : ""}`)
    .join("\n");

const cppAnswer = (type: ReturnType, expr: string) => (type === "void" ? `"null"` : `__ser(${expr})`);

function cppSolve(sig: Signature): string {
  const capture = `    std::ostringstream __dbg;
    std::streambuf *__old = std::cout.rdbuf(__dbg.rdbuf());`;
  const release = `    std::cout.rdbuf(__old);
    if (!__dbg.str().empty()) std::cerr << __dbg.str();`;

  if (!isDesign(sig)) {
    const call = `${camel(sig.name)}(${sig.params.map((_, i) => `__a${i}`).join(", ")})`;
    const invoke = sig.returns === "void" ? `    ${call};` : `    auto __result = ${call};`;
    const answer = sig.returns === "void" ? `__ser(__a${mutatedIndex(sig)})` : "__ser(__result)";
    return `static void __solve() {
    __eat('[');
${cppReads(sig.params, "__a")}
${(sig.hidden ?? []).map((h) => `    __eat(','); Hidden::${camel(h.name)} = ${CPP_READER[h.type]};`).join("\n")}
    __eat(']');
    // Debug output written to std::cout must not corrupt the answer.
${capture}
${invoke}
    std::string __text = ${answer};
${release}
    std::cout << __text << std::endl;
}
`;
  }

  const branches = sig.methods!
    .map((m, index) => {
      const call = `__obj->${camel(m.name)}(${m.params.map((_, i) => `__m${i}`).join(", ")})`;
      const run = m.returns === "void" ? `${call}; __out.push_back("null");` : `__out.push_back(${cppAnswer(m.returns, call)});`;
      return `        ${index === 0 ? "if" : "else if"} (__op == ${JSON.stringify(m.name)}) {
${cppReads(m.params, "__m").replace(/^/gm, "        ")}
            ${run}
        }`;
    })
    .join("\n");
  return `static void __solve() {
    __eat('[');
    std::vector<std::string> __ops = __rd_vec_str();
    __eat(','); __eat('[');
    __eat('[');
${cppReads(sig.params, "__c")}
    __eat(']');
${capture}
    ${sig.name} *__obj = new ${sig.name}(${sig.params.map((_, i) => `__c${i}`).join(", ")});
    std::vector<std::string> __out{"null"};
    for (size_t __i = 1; __i < __ops.size(); __i++) {
        __eat(','); __eat('[');
        const std::string &__op = __ops[__i];
${branches}
        else throw std::runtime_error("unknown operation " + __op);
        __eat(']');
    }
${release}
    std::string __text = "[";
    for (size_t __i = 0; __i < __out.size(); __i++) { if (__i) __text += ","; __text += __out[__i]; }
    std::cout << __text << "]" << std::endl;
}
`;
}

function cppHarness(source: string, sig: Signature): string {
  // A \`main\` the participant writes becomes an ordinary function, so it can
  // neither clash with the judge's entry point nor replace it.
  const kind = nodeKind(sig);
  return `${CPP_RUNTIME}${kind ? CPP_NODE[kind] : ""}${cppProvided(sig)}
#define main __participant_main
${source}
#undef main

${cppSolve(sig)}${CPP_MAIN}`;
}

/* ================================= Java ================================= */

const JAVA_RUNTIME = String.raw`    private static String in;
    private static int pos = 0;
    private static void ws() { while (pos < in.length() && Character.isWhitespace(in.charAt(pos))) pos++; }
    private static void eat(char c) { ws(); if (pos < in.length() && in.charAt(pos) == c) pos++; }
    private static boolean at(char c) { ws(); return pos < in.length() && in.charAt(pos) == c; }
    private static long rdInt() { ws(); int s = pos; if (pos < in.length() && (in.charAt(pos) == '-' || in.charAt(pos) == '+')) pos++; while (pos < in.length() && Character.isDigit(in.charAt(pos))) pos++; return Long.parseLong(in.substring(s, pos)); }
    private static double rdDouble() { ws(); int s = pos; while (pos < in.length() && (Character.isDigit(in.charAt(pos)) || "+-.eE".indexOf(in.charAt(pos)) >= 0)) pos++; return Double.parseDouble(in.substring(s, pos)); }
    private static boolean rdBool() { ws(); if (in.startsWith("true", pos)) { pos += 4; return true; } pos += 5; return false; }
    private static boolean rdNull() { ws(); if (in.startsWith("null", pos)) { pos += 4; return true; } return false; }
    // Every JSON escape, so text round-trips exactly as Python and JavaScript read it.
    private static String rdStr() {
        ws(); eat('"'); StringBuilder b = new StringBuilder();
        while (pos < in.length() && in.charAt(pos) != '"') {
            char c = in.charAt(pos++);
            if (c != '\\') { b.append(c); continue; }
            char e = in.charAt(pos++);
            switch (e) {
                case 'n': b.append('\n'); break;
                case 't': b.append('\t'); break;
                case 'r': b.append('\r'); break;
                case 'b': b.append('\b'); break;
                case 'f': b.append('\f'); break;
                case 'u': b.append((char) Integer.parseInt(in.substring(pos, pos + 4), 16)); pos += 4; break;
                default: b.append(e);
            }
        }
        pos++; return b.toString();
    }
    private static char rdChar() { String s = rdStr(); return s.isEmpty() ? '\0' : s.charAt(0); }
    private static List<Object> rdArr(java.util.function.Supplier<Object> f) {
        List<Object> v = new ArrayList<>(); eat('[');
        if (at(']')) { pos++; return v; }
        while (true) { v.add(f.get()); if (at(',')) { pos++; continue; } eat(']'); break; }
        return v;
    }
    private static long[] rdIntArr() { List<Object> v = rdArr(() -> rdInt()); long[] a = new long[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Long) v.get(i); return a; }
    private static double[] rdDoubleArr() { List<Object> v = rdArr(() -> rdDouble()); double[] a = new double[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Double) v.get(i); return a; }
    private static boolean[] rdBoolArr() { List<Object> v = rdArr(() -> rdBool()); boolean[] a = new boolean[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Boolean) v.get(i); return a; }
    private static String[] rdStrArr() { List<Object> v = rdArr(() -> rdStr()); String[] a = new String[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (String) v.get(i); return a; }
    private static char[] rdCharArr() { List<Object> v = rdArr(() -> rdChar()); char[] a = new char[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Character) v.get(i); return a; }
    private static long[][] rdIntMat() { List<Object> v = rdArr(() -> rdIntArr()); long[][] a = new long[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (long[]) v.get(i); return a; }
    private static String[][] rdStrMat() { List<Object> v = rdArr(() -> rdStrArr()); String[][] a = new String[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (String[]) v.get(i); return a; }
    private static char[][] rdCharMat() { List<Object> v = rdArr(() -> rdCharArr()); char[][] a = new char[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (char[]) v.get(i); return a; }
    private static Map<String, Long> rdMap() {
        Map<String, Long> m = new HashMap<>(); eat('{');
        if (at('}')) { pos++; return m; }
        while (true) { String k = rdStr(); eat(':'); m.put(k, rdInt()); if (at(',')) { pos++; continue; } eat('}'); break; }
        return m;
    }
    private static ListNode rdList() {
        long[] values; long cycleAt = -1;
        if (at('{')) {
            pos++; values = new long[0];
            while (!at('}')) {
                String key = rdStr(); eat(':');
                if (key.equals("values")) values = rdIntArr(); else cycleAt = rdInt();
                if (at(',')) pos++;
            }
            pos++;
        } else {
            values = rdIntArr();
        }
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode((int) values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (nodes.length > 0 && cycleAt >= 0) nodes[nodes.length - 1].next = nodes[(int) cycleAt];
        return nodes.length == 0 ? null : nodes[0];
    }
    private static TreeNode rdTree() {
        List<Object> v = rdArr(() -> rdNull() ? null : new TreeNode((int) rdInt()));
        if (v.isEmpty()) return null;
        int i = 1;
        for (int q = 0; q < v.size() && i < v.size(); q++) {
            TreeNode n = (TreeNode) v.get(q);
            if (n == null) continue;
            n.left = (TreeNode) v.get(i++);
            if (i < v.size()) n.right = (TreeNode) v.get(i++);
        }
        return (TreeNode) v.get(0);
    }

    private static String serList(ListNode h) {
        List<Object> v = new ArrayList<>();
        Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        for (; h != null; h = h.next) {
            if (!seen.add(h)) throw new IllegalStateException("the returned linked list loops back on itself, so it has no end to print");
            v.add(h.val);
        }
        return ser(v);
    }
    private static String serTree(TreeNode r) {
        List<TreeNode> q = new ArrayList<>(); q.add(r); List<String> out = new ArrayList<>();
        for (int i = 0; i < q.size(); i++) {
            TreeNode n = q.get(i);
            if (n == null) { out.add("null"); continue; }
            out.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }
    // Escaped exactly as JSON.stringify and Python's json.dumps do.
    private static String serStr(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\t': b.append("\\t"); break;
                case '\r': b.append("\\r"); break;
                case '\b': b.append("\\b"); break;
                case '\f': b.append("\\f"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }
    private static String ser(Object v) {
        if (v == null) return "null";
        if (v instanceof Boolean) return ((Boolean) v) ? "true" : "false";
        if (v instanceof Double || v instanceof Float) return String.format("%.${DOUBLE_PRECISION}f", ((Number) v).doubleValue());
        if (v instanceof Number) return String.valueOf(((Number) v).longValue());
        if (v instanceof Character) return serStr(String.valueOf(v));
        if (v instanceof String) return serStr((String) v);
        if (v instanceof ListNode) return serList((ListNode) v);
        if (v instanceof TreeNode) return serTree((TreeNode) v);
        if (v instanceof Map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) sorted.put(String.valueOf(e.getKey()), e.getValue());
            StringBuilder b = new StringBuilder("{");
            for (Map.Entry<String, Object> e : sorted.entrySet()) { if (b.length() > 1) b.append(','); b.append(serStr(e.getKey())).append(':').append(ser(e.getValue())); }
            return b.append('}').toString();
        }
        // Lists and sets are accepted as well as arrays, so a participant can
        // return List<List<Integer>> without converting.
        if (v instanceof Iterable) {
            StringBuilder b = new StringBuilder("[");
            for (Object x : (Iterable<?>) v) { if (b.length() > 1) b.append(','); b.append(ser(x)); }
            return b.append(']').toString();
        }
        if (v.getClass().isArray()) {
            StringBuilder b = new StringBuilder("[");
            int n = java.lang.reflect.Array.getLength(v);
            for (int i = 0; i < n; i++) { if (i > 0) b.append(','); b.append(ser(java.lang.reflect.Array.get(v, i))); }
            return b.append(']').toString();
        }
        return String.valueOf(v);
    }
`;

const JAVA_NODES = `class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val; TreeNode left; TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}`;

/**
 * Java requires every `import` at the top of the file, but participant source
 * is appended below `class Main`. A Java author reaching for `import
 * java.util.*;` out of habit would otherwise get a compile error that has
 * nothing to do with their solution, so the imports are lifted out and placed
 * with the harness's own.
 */
function hoistJavaImports(source: string): { imports: string[]; body: string } {
  const imports: string[] = [];
  const body = source
    .split("\n")
    .filter((line) => {
      if (/^\s*import\s+[\w.*]+\s*;/.test(line)) {
        imports.push(line.trim());
        return false;
      }
      return true;
    })
    .join("\n");
  return { imports: [...new Set(imports)], body };
}

const javaReads = (params: Param[], prefix: string, indent: string) =>
  params
    .map((p, i) => `${indent}${JAVA_TYPE[p.type]} ${prefix}${i} = ${JAVA_READER[p.type]};${i < params.length - 1 ? " eat(',');" : ""}`)
    .join("\n");

/** A null node is an empty list or tree, not the JSON null a plain object prints. */
const JAVA_SERIALISER: Partial<Record<ParamType, string>> = {
  ListNode: "serList((ListNode) ",
  TreeNode: "serTree((TreeNode) ",
  NaryTree: "serNary((Node) ",
  RandomList: "serRandom((Node) ",
  Graph: "serGraph((Node) ",
};
const javaAnswer = (type: ParamType, expr: string) =>
  JAVA_SERIALISER[type] ? `${JAVA_SERIALISER[type]}${expr})` : `ser(${expr})`;

const JAVA_NODE: Record<NodeKind, string> = {
  NaryTree: `class Node {
    public int val; public List<Node> children;
    public Node() { children = new ArrayList<>(); }
    public Node(int val) { this.val = val; children = new ArrayList<>(); }
    public Node(int val, List<Node> children) { this.val = val; this.children = children; }
}`,
  RandomList: `class Node {
    int val; Node next; Node random;
    public Node(int val) { this.val = val; }
}`,
  Graph: `class Node {
    public int val; public List<Node> neighbors;
    public Node() { neighbors = new ArrayList<>(); }
    public Node(int val) { this.val = val; neighbors = new ArrayList<>(); }
    public Node(int val, ArrayList<Node> neighbors) { this.val = val; this.neighbors = neighbors; }
}`,
};

const JAVA_INPUT = `    private static final Set<Object> inputNodes = Collections.newSetFromMap(new IdentityHashMap<>());
`;

const JAVA_KIND_RUNTIME: Record<NodeKind, string> = {
  NaryTree: JAVA_INPUT + String.raw`    private static Node rdNary() {
        List<Object> v = rdArr(() -> rdNull() ? null : (Object) rdInt());
        if (v.isEmpty()) return null;
        Node root = new Node((int) (long) (Long) v.get(0));
        inputNodes.add(root);
        List<Node> queue = new ArrayList<>(); queue.add(root);
        int i = 2, qi = 0;
        while (i < v.size() && qi < queue.size()) {
            Node parent = queue.get(qi++);
            while (i < v.size() && v.get(i) != null) {
                Node c = new Node((int) (long) (Long) v.get(i++));
                inputNodes.add(c); parent.children.add(c); queue.add(c);
            }
            i++;
        }
        return root;
    }
    private static String serNary(Node root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>(); out.add(String.valueOf(root.val)); out.add("null");
        List<Node> queue = new ArrayList<>(); queue.add(root);
        for (int i = 0; i < queue.size(); i++) {
            List<Node> kids = queue.get(i).children;
            if (kids != null) for (Node c : kids) { if (c == null) continue; out.add(String.valueOf(c.val)); queue.add(c); }
            out.add("null");
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }
`,
  RandomList: JAVA_INPUT + String.raw`    private static Node rdRandom() {
        List<Object> pairs = rdArr(() -> { eat('['); long v = rdInt(); eat(','); long r = rdNull() ? -1 : rdInt(); eat(']'); return new long[]{v, r}; });
        Node[] nodes = new Node[pairs.size()];
        for (int i = 0; i < nodes.length; i++) { nodes[i] = new Node((int) ((long[]) pairs.get(i))[0]); inputNodes.add(nodes[i]); }
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        for (int i = 0; i < nodes.length; i++) { long r = ((long[]) pairs.get(i))[1]; if (r >= 0) nodes[i].random = nodes[(int) r]; }
        return nodes.length == 0 ? null : nodes[0];
    }
    private static String serRandom(Node h) {
        List<Node> nodes = new ArrayList<>(); Map<Node, Integer> index = new IdentityHashMap<>();
        for (; h != null; h = h.next) {
            if (index.containsKey(h)) throw new IllegalStateException("the returned list loops back on itself, so it has no end to print");
            if (inputNodes.contains(h)) throw new IllegalStateException("the returned list reuses nodes from the input; return a deep copy with new nodes");
            index.put(h, nodes.size()); nodes.add(h);
        }
        List<String> out = new ArrayList<>();
        for (Node n : nodes) {
            if (n.random != null && !index.containsKey(n.random)) throw new IllegalStateException("a random pointer leads outside the returned list");
            out.add("[" + n.val + "," + (n.random == null ? "null" : String.valueOf(index.get(n.random))) + "]");
        }
        return "[" + String.join(",", out) + "]";
    }
`,
  Graph: JAVA_INPUT + String.raw`    private static Node rdGraph() {
        long[][] adj = rdIntMat();
        Node[] nodes = new Node[adj.length];
        for (int i = 0; i < adj.length; i++) { nodes[i] = new Node(i + 1); inputNodes.add(nodes[i]); }
        for (int i = 0; i < adj.length; i++) for (long j : adj[i]) nodes[i].neighbors.add(nodes[(int) j - 1]);
        return nodes.length == 0 ? null : nodes[0];
    }
    private static String serGraph(Node start) {
        if (start == null) return "[]";
        List<Node> queue = new ArrayList<>(); queue.add(start);
        Set<Node> seen = Collections.newSetFromMap(new IdentityHashMap<>()); seen.add(start);
        for (int i = 0; i < queue.size(); i++) {
            if (inputNodes.contains(queue.get(i))) throw new IllegalStateException("the returned graph reuses nodes from the input; return a deep copy with new nodes");
            for (Node n : queue.get(i).neighbors) if (seen.add(n)) queue.add(n);
        }
        queue.sort((a, b) -> Integer.compare(a.val, b.val));
        List<String> out = new ArrayList<>();
        for (Node n : queue) {
            List<String> row = new ArrayList<>();
            for (Node m : n.neighbors) row.add(String.valueOf(m.val));
            out.add("[" + String.join(",", row) + "]");
        }
        return "[" + String.join(",", out) + "]";
    }
`,
};

function javaSolve(sig: Signature): string {
  if (!isDesign(sig)) {
    const call = `Solution.${camel(sig.name)}(${sig.params.map((_, i) => `a${i}`).join(", ")})`;
    const invoke = sig.returns === "void" ? `        ${call};` : `        Object result = ${call};`;
    const answer = sig.returns === "void" ? `ser(a${mutatedIndex(sig)})` : javaAnswer(sig.returns, "result");
    return `    private static String solve() throws Exception {
        eat('[');
${javaReads(sig.params, "a", "        ")}
${(sig.hidden ?? []).map((h) => `        eat(','); Hidden.${camel(h.name)} = ${JAVA_READER[h.type]};`).join("\n")}
        eat(']');
${invoke}
        return ${answer};
    }`;
  }

  const cases = sig.methods!
    .map((m) => {
      const call = `obj.${camel(m.name)}(${m.params.map((_, i) => `m${i}`).join(", ")})`;
      const run = m.returns === "void" ? `${call}; outs.add("null");` : `outs.add(${javaAnswer(m.returns, call)});`;
      return `                case ${JSON.stringify(m.name)}: {
${javaReads(m.params, "m", "                    ")}
                    ${run}
                    break;
                }`;
    })
    .join("\n");
  return `    private static String solve() throws Exception {
        eat('['); String[] ops = rdStrArr(); eat(','); eat('[');
        eat('[');
${javaReads(sig.params, "c", "        ")}
        eat(']');
        ${sig.name} obj = new ${sig.name}(${sig.params.map((_, i) => `c${i}`).join(", ")});
        List<String> outs = new ArrayList<>();
        outs.add("null");
        for (int i = 1; i < ops.length; i++) {
            eat(','); eat('[');
            switch (ops[i]) {
${cases}
                default: throw new IllegalArgumentException("unknown operation " + ops[i]);
            }
            eat(']');
        }
        return "[" + String.join(",", outs) + "]";
    }`;
}

function javaHarness(rawSource: string, sig: Signature): string {
  const participant = hoistJavaImports(rawSource);
  const provided = sig.provided ? hoistJavaImports(sig.provided.code.java) : null;
  const imports = [...new Set([...participant.imports, ...(provided?.imports ?? [])])];
  const source = participant.body;
  const kind = nodeKind(sig);
  // Hidden values in a class the provided code reads; the provided code is
  // the author's class Provided, which the participant's Solution extends.
  const hidden = sig.provided
    ? `class Hidden {
${(sig.hidden ?? []).map((h) => `    static ${JAVA_TYPE[h.type]} ${camel(h.name)};`).join("\n")}
}

${provided!.body}
`
    : "";
  return `import java.util.*;
${imports.filter((line) => line !== "import java.util.*;").join("\n")}

public class Main {
${JAVA_RUNTIME}${kind ? JAVA_KIND_RUNTIME[kind] : ""}
${javaSolve(sig)}

    public static void main(String[] args) throws Exception {
        in = new String(System.in.readAllBytes(), "UTF-8");
        // The container's default charset is not UTF-8, so answers and debug
        // output both go through streams that are explicitly UTF-8. Without
        // this every non-ASCII character is written as '?'.
        java.io.PrintStream out = new java.io.PrintStream(
            new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8");
        java.io.PrintStream err = new java.io.PrintStream(
            new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8");
        // Debug output printed by the solution must not corrupt the answer.
        java.io.ByteArrayOutputStream dbg = new java.io.ByteArrayOutputStream();
        System.setOut(new java.io.PrintStream(dbg, true, "UTF-8"));
        // The call runs on a thread with a 256 MB stack: the JVM's default
        // overflows on the deep recursion ordinary DFS solutions reach.
        final String[] text = new String[1];
        final Throwable[] failure = new Throwable[1];
        Thread worker = new Thread(null, () -> {
            try { text[0] = solve(); } catch (Throwable e) { failure[0] = e; }
        }, "solve", 256L << 20);
        worker.start();
        worker.join();
        System.setOut(out);
        if (dbg.size() > 0) err.print(dbg.toString("UTF-8"));
        if (failure[0] != null) {
            failure[0].printStackTrace(err);
            err.flush();
            System.exit(1);
        }
        out.println(text[0]);
        out.flush();
    }
}

${JAVA_NODES}
${kind ? JAVA_NODE[kind] : ""}

${hidden}
${source}
`;
}

export function wrapSource(args: {
  language: Language;
  source: string;
  signature: Signature;
}): string {
  switch (args.language) {
    case "python":
      return pythonHarness(args.source, args.signature);
    case "javascript":
      return javascriptHarness(args.source, args.signature);
    case "cpp":
      return cppHarness(args.source, args.signature);
    case "java":
      return javaHarness(args.source, args.signature);
  }
}
