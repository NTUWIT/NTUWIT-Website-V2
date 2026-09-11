import type { Language } from "@/lib/languages";
import { camel, DOUBLE_PRECISION, type ParamType, type Signature } from "@/lib/problems/signature";
import { CPP as CPP_TYPE, JAVA as JAVA_TYPE } from "@/lib/problems/starter";

/**
 * Wraps a participant's function in a runnable program.
 *
 * Test input is a JSON array of arguments on stdin; the wrapper calls the
 * function and prints the return value as canonical JSON. Every language
 * formats doubles to the same precision and prints map keys sorted, so the
 * existing text comparison holds across languages without a type-aware
 * comparer.
 *
 * Linked lists and trees travel as JSON in LeetCode's format (`[1,2,3]` and
 * level order with nulls, `[1,null,2]`). The harness builds real nodes before
 * the call and flattens whatever node comes back, so a participant works with
 * `head.next` and `root.left` exactly as they would anywhere else.
 */

const CPP_READER: Record<ParamType, string> = {
  int: "__rd_int()",
  double: "__rd_double()",
  bool: "__rd_bool()",
  string: "__rd_str()",
  "int[]": "__rd_vec_int()",
  "double[]": "__rd_vec_double()",
  "bool[]": "__rd_vec_bool()",
  "string[]": "__rd_vec_str()",
  "int[][]": "__rd_mat_int()",
  "string[][]": "__rd_mat_str()",
  "map<string,int>": "__rd_map_int()",
  ListNode: "__rd_list()",
  TreeNode: "__rd_tree()",
};

const JAVA_READER: Record<ParamType, string> = {
  int: "rdInt()",
  double: "rdDouble()",
  bool: "rdBool()",
  string: "rdStr()",
  "int[]": "rdIntArr()",
  "double[]": "rdDoubleArr()",
  "bool[]": "rdBoolArr()",
  "string[]": "rdStrArr()",
  "int[][]": "rdIntMat()",
  "string[][]": "rdStrMat()",
  "map<string,int>": "rdMap()",
  ListNode: "rdList()",
  TreeNode: "rdTree()",
};

/** Python and JavaScript receive plain JSON; only nodes need building. */
const NODE_IN: Partial<Record<ParamType, string>> = { ListNode: "__to_list", TreeNode: "__to_tree" };
const NODE_OUT: Partial<Record<ParamType, string>> = { ListNode: "__from_list", TreeNode: "__from_tree" };

const convertArgs = (sig: Signature, line: (i: number, fn: string) => string) =>
  sig.params
    .map((p, i) => (NODE_IN[p.type] ? line(i, NODE_IN[p.type]!) : null))
    .filter(Boolean)
    .join("\n");

function pythonHarness(source: string, sig: Signature): string {
  const out = NODE_OUT[sig.returns];
  return `import json as __json, sys as __sys
from typing import *

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
    head = None
    for v in reversed(a):
        head = ListNode(v, head)
    return head

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
    out = []
    while h is not None:
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

${source}

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

if __name__ == "__main__":
    import contextlib as __ctx, io as __io
    __args = __json.loads(__sys.stdin.read() or "[]")
${convertArgs(sig, (i, fn) => `    __args[${i}] = ${fn}(__args[${i}])`)}
    # Debug prints must not corrupt the answer, so they are captured and sent
    # to stderr, where the Run view shows them.
    __buf = __io.StringIO()
    with __ctx.redirect_stdout(__buf):
        __result = ${sig.name}(*__args)
    if __buf.getvalue():
        __sys.stderr.write(__buf.getvalue())
    print(__fmt(${out ? `${out}(__result)` : "__result"}))
`;
}

function javascriptHarness(source: string, sig: Signature): string {
  const out = NODE_OUT[sig.returns];
  // Assigned to globalThis rather than declared: a participant who pastes
  // their own \`class ListNode\` then shadows these instead of colliding.
  return `globalThis.ListNode = class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
};
globalThis.TreeNode = class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
};

${source}

const __to_list = (a) => a.reduceRight((next, v) => new ListNode(v, next), null);
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
const __from_list = (h) => { const out = []; for (; h; h = h.next) out.push(h.val); return out; };
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

const __raw = require("fs").readFileSync(0, "utf8").trim();
const __args = __raw ? JSON.parse(__raw) : [];
${convertArgs(sig, (i, fn) => `__args[${i}] = ${fn}(__args[${i}]);`)}
// Debug logs must not corrupt the answer: capture them and send them to
// stderr, where the Run view shows them.
const __debug = [];
const __log = console.log;
console.log = (...a) => __debug.push(a.map(String).join(" "));
const __result = ${camel(sig.name)}(...__args);
console.log = __log;
if (__debug.length) process.stderr.write(__debug.join("\\n") + "\\n");
console.log(__fmt(${out ? `${out}(__result)` : "__result"}));
`;
}

const CPP_RUNTIME = `#include <bits/stdc++.h>

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
static std::string __rd_str() {
    __ws(); __eat('"'); std::string out;
    while (__pos < __in.size() && __in[__pos] != '"') {
        if (__in[__pos] == '\\\\') { __pos++; char c = __in[__pos++]; out += c == 'n' ? '\\n' : c == 't' ? '\\t' : c; }
        else out += __in[__pos++];
    }
    __pos++; return out;
}
template <class F> static auto __rd_vec(F f) -> std::vector<decltype(f())> {
    std::vector<decltype(f())> v; __eat('[');
    if (__at(']')) { __pos++; return v; }
    while (true) { v.push_back(f()); if (__at(',')) { __pos++; continue; } __eat(']'); break; }
    return v;
}
static std::vector<long long> __rd_vec_int() { return __rd_vec(__rd_int); }
static std::vector<double> __rd_vec_double() { return __rd_vec(__rd_double); }
static std::vector<std::string> __rd_vec_str() { return __rd_vec(__rd_str); }
static std::vector<bool> __rd_vec_bool() { auto t = __rd_vec(__rd_bool); return std::vector<bool>(t.begin(), t.end()); }
static std::vector<std::vector<long long>> __rd_mat_int() { return __rd_vec(__rd_vec_int); }
static std::vector<std::vector<std::string>> __rd_mat_str() { return __rd_vec(__rd_vec_str); }
static std::map<std::string, long long> __rd_map_int() {
    std::map<std::string, long long> m; __eat('{');
    if (__at('}')) { __pos++; return m; }
    while (true) { std::string k = __rd_str(); __eat(':'); m[k] = __rd_int(); if (__at(',')) { __pos++; continue; } __eat('}'); break; }
    return m;
}
static ListNode *__rd_list() {
    auto v = __rd_vec_int(); ListNode *h = nullptr;
    for (size_t i = v.size(); i-- > 0;) h = new ListNode((int)v[i], h);
    return h;
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
static std::string __ser(const std::string &s) {
    std::string o = "\\"";
    for (char c : s) { if (c == '"' || c == '\\\\') { o += '\\\\'; o += c; } else if (c == '\\n') o += "\\\\n"; else if (c == '\\t') o += "\\\\t"; else o += c; }
    return o + "\\"";
}
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
    std::vector<long long> v;
    for (; h; h = h->next) v.push_back(h->val);
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

function cppHarness(source: string, sig: Signature): string {
  const reads = sig.params
    .map((p, i) => `    ${CPP_TYPE[p.type]} __a${i} = ${CPP_READER[p.type]}; ${i < sig.params.length - 1 ? "__eat(',');" : ""}`)
    .join("\n");
  const call = `${camel(sig.name)}(${sig.params.map((_, i) => `__a${i}`).join(", ")})`;
  return `${CPP_RUNTIME}
${source}

int main() {
    std::ostringstream __ss; __ss << std::cin.rdbuf(); __in = __ss.str();
    __eat('[');
${reads}
    __eat(']');
    // Debug output written to std::cout must not corrupt the answer.
    std::ostringstream __dbg;
    std::streambuf *__old = std::cout.rdbuf(__dbg.rdbuf());
    auto __result = ${call};
    std::cout.rdbuf(__old);
    if (!__dbg.str().empty()) std::cerr << __dbg.str();
    std::cout << __ser(__result) << std::endl;
    return 0;
}
`;
}

const JAVA_RUNTIME = `    private static String in;
    private static int pos = 0;
    private static void ws() { while (pos < in.length() && Character.isWhitespace(in.charAt(pos))) pos++; }
    private static void eat(char c) { ws(); if (pos < in.length() && in.charAt(pos) == c) pos++; }
    private static boolean at(char c) { ws(); return pos < in.length() && in.charAt(pos) == c; }
    private static long rdInt() { ws(); int s = pos; if (pos < in.length() && (in.charAt(pos) == '-' || in.charAt(pos) == '+')) pos++; while (pos < in.length() && Character.isDigit(in.charAt(pos))) pos++; return Long.parseLong(in.substring(s, pos)); }
    private static double rdDouble() { ws(); int s = pos; while (pos < in.length() && (Character.isDigit(in.charAt(pos)) || "+-.eE".indexOf(in.charAt(pos)) >= 0)) pos++; return Double.parseDouble(in.substring(s, pos)); }
    private static boolean rdBool() { ws(); if (in.startsWith("true", pos)) { pos += 4; return true; } pos += 5; return false; }
    private static boolean rdNull() { ws(); if (in.startsWith("null", pos)) { pos += 4; return true; } return false; }
    private static String rdStr() {
        ws(); eat('"'); StringBuilder b = new StringBuilder();
        while (pos < in.length() && in.charAt(pos) != '"') {
            char c = in.charAt(pos++);
            if (c == '\\\\') { char e = in.charAt(pos++); b.append(e == 'n' ? '\\n' : e == 't' ? '\\t' : e); }
            else b.append(c);
        }
        pos++; return b.toString();
    }
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
    private static long[][] rdIntMat() { List<Object> v = rdArr(() -> rdIntArr()); long[][] a = new long[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (long[]) v.get(i); return a; }
    private static String[][] rdStrMat() { List<Object> v = rdArr(() -> rdStrArr()); String[][] a = new String[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (String[]) v.get(i); return a; }
    private static Map<String, Long> rdMap() {
        Map<String, Long> m = new HashMap<>(); eat('{');
        if (at('}')) { pos++; return m; }
        while (true) { String k = rdStr(); eat(':'); m.put(k, rdInt()); if (at(',')) { pos++; continue; } eat('}'); break; }
        return m;
    }
    private static ListNode rdList() { long[] v = rdIntArr(); ListNode h = null; for (int i = v.length - 1; i >= 0; i--) h = new ListNode((int) v[i], h); return h; }
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
        for (; h != null; h = h.next) v.add(h.val);
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
    private static String ser(Object v) {
        if (v == null) return "null";
        if (v instanceof Boolean) return ((Boolean) v) ? "true" : "false";
        if (v instanceof Double || v instanceof Float) return String.format("%.${DOUBLE_PRECISION}f", ((Number) v).doubleValue());
        if (v instanceof Number) return String.valueOf(((Number) v).longValue());
        if (v instanceof String) {
            StringBuilder b = new StringBuilder("\\"");
            for (char c : ((String) v).toCharArray()) {
                if (c == '"' || c == '\\\\') b.append('\\\\').append(c);
                else if (c == '\\n') b.append("\\\\n");
                else if (c == '\\t') b.append("\\\\t");
                else b.append(c);
            }
            return b.append('"').toString();
        }
        if (v instanceof Map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) sorted.put(String.valueOf(e.getKey()), e.getValue());
            StringBuilder b = new StringBuilder("{");
            for (Map.Entry<String, Object> e : sorted.entrySet()) { if (b.length() > 1) b.append(','); b.append(ser(e.getKey())).append(':').append(ser(e.getValue())); }
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

function javaHarness(rawSource: string, sig: Signature): string {
  const { imports, body: source } = hoistJavaImports(rawSource);
  const reads = sig.params
    .map((p, i) => `        ${JAVA_TYPE[p.type]} a${i} = ${JAVA_READER[p.type]}; ${i < sig.params.length - 1 ? "eat(',');" : ""}`)
    .join("\n");
  const call = `Solution.${camel(sig.name)}(${sig.params.map((_, i) => `a${i}`).join(", ")})`;
  // A null node is an empty list or tree, not the JSON null a plain object
  // would print, so node returns are serialised by their declared type.
  const print =
    sig.returns === "ListNode"
      ? "serList((ListNode) result)"
      : sig.returns === "TreeNode"
        ? "serTree((TreeNode) result)"
        : "ser(result)";
  return `import java.util.*;
${imports.filter((line) => line !== "import java.util.*;").join("\n")}

public class Main {
${JAVA_RUNTIME}
    public static void main(String[] args) throws Exception {
        in = new String(System.in.readAllBytes(), "UTF-8");
        eat('[');
${reads}
        eat(']');
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
        Object result = ${call};
        System.setOut(out);
        if (dbg.size() > 0) err.print(dbg.toString("UTF-8"));
        out.println(${print});
        out.flush();
    }
}

${JAVA_NODES}

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
