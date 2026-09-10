import type { Language } from "@/lib/languages";
import { camel, DOUBLE_PRECISION, type ParamType, type Signature } from "@/lib/problems/signature";

/**
 * Wraps a participant's function in a runnable program.
 *
 * Test input is a JSON array of arguments on stdin; the wrapper calls the
 * function and prints the return value as canonical JSON. Every language
 * formats doubles to the same precision, so the existing text comparison holds
 * across languages without a type-aware comparer.
 */

const CPP_TYPE: Record<ParamType, string> = {
  int: "long long",
  double: "double",
  bool: "bool",
  string: "std::string",
  "int[]": "std::vector<long long>",
  "double[]": "std::vector<double>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "int[][]": "std::vector<std::vector<long long>>",
};

const JAVA_TYPE: Record<ParamType, string> = {
  int: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  "int[]": "long[]",
  "double[]": "double[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "int[][]": "long[][]",
};

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
};

function pythonHarness(source: string, sig: Signature): string {
  return `import json as __json, sys as __sys

${source}

def __fmt(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return format(v, ".${DOUBLE_PRECISION}f")
    if isinstance(v, str):
        return __json.dumps(v, ensure_ascii=False)
    if isinstance(v, (list, tuple)):
        return "[" + ",".join(__fmt(x) for x in v) + "]"
    return __json.dumps(v, ensure_ascii=False)

if __name__ == "__main__":
    import contextlib as __ctx, io as __io
    __args = __json.loads(__sys.stdin.read() or "[]")
    # Debug prints must not corrupt the answer, so they are captured and sent
    # to stderr, where the Run view shows them.
    __buf = __io.StringIO()
    with __ctx.redirect_stdout(__buf):
        __result = ${sig.name}(*__args)
    if __buf.getvalue():
        __sys.stderr.write(__buf.getvalue())
    print(__fmt(__result))
`;
}

function javascriptHarness(source: string, sig: Signature): string {
  return `${source}

const __fmt = (v) => {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(${DOUBLE_PRECISION});
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(__fmt).join(",") + "]";
  return JSON.stringify(v);
};

const __raw = require("fs").readFileSync(0, "utf8").trim();
const __args = __raw ? JSON.parse(__raw) : [];
// Debug logs must not corrupt the answer: capture them and send them to
// stderr, where the Run view shows them.
const __debug = [];
const __log = console.log;
console.log = (...a) => __debug.push(a.map(String).join(" "));
const __result = ${camel(sig.name)}(...__args);
console.log = __log;
if (__debug.length) process.stderr.write(__debug.join("\\n") + "\\n");
console.log(__fmt(__result));
`;
}

const CPP_RUNTIME = `#include <bits/stdc++.h>

static std::string __in;
static size_t __pos = 0;
static void __ws() { while (__pos < __in.size() && isspace((unsigned char)__in[__pos])) __pos++; }
static void __eat(char c) { __ws(); if (__pos < __in.size() && __in[__pos] == c) __pos++; }
static long long __rd_int() { __ws(); size_t s = __pos; if (__pos < __in.size() && (__in[__pos] == '-' || __in[__pos] == '+')) __pos++; while (__pos < __in.size() && isdigit((unsigned char)__in[__pos])) __pos++; return std::stoll(__in.substr(s, __pos - s)); }
static double __rd_double() { __ws(); size_t s = __pos; while (__pos < __in.size() && (isdigit((unsigned char)__in[__pos]) || strchr("+-.eE", __in[__pos]))) __pos++; return std::stod(__in.substr(s, __pos - s)); }
static bool __rd_bool() { __ws(); if (__in.compare(__pos, 4, "true") == 0) { __pos += 4; return true; } __pos += 5; return false; }
static std::string __rd_str() {
    __ws(); __eat('"'); std::string out;
    while (__pos < __in.size() && __in[__pos] != '"') {
        if (__in[__pos] == '\\\\') { __pos++; char c = __in[__pos++]; out += c == 'n' ? '\\n' : c == 't' ? '\\t' : c; }
        else out += __in[__pos++];
    }
    __pos++; return out;
}
template <class F> static auto __rd_vec(F f) -> std::vector<decltype(f())> {
    std::vector<decltype(f())> v; __eat('['); __ws();
    if (__pos < __in.size() && __in[__pos] == ']') { __pos++; return v; }
    while (true) { v.push_back(f()); __ws(); if (__pos < __in.size() && __in[__pos] == ',') { __pos++; continue; } __eat(']'); break; }
    return v;
}
static std::vector<long long> __rd_vec_int() { return __rd_vec(__rd_int); }
static std::vector<double> __rd_vec_double() { return __rd_vec(__rd_double); }
static std::vector<std::string> __rd_vec_str() { return __rd_vec(__rd_str); }
static std::vector<bool> __rd_vec_bool() { auto t = __rd_vec(__rd_bool); return std::vector<bool>(t.begin(), t.end()); }
static std::vector<std::vector<long long>> __rd_mat_int() { return __rd_vec(__rd_vec_int); }

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
    private static long rdInt() { ws(); int s = pos; if (pos < in.length() && (in.charAt(pos) == '-' || in.charAt(pos) == '+')) pos++; while (pos < in.length() && Character.isDigit(in.charAt(pos))) pos++; return Long.parseLong(in.substring(s, pos)); }
    private static double rdDouble() { ws(); int s = pos; while (pos < in.length() && (Character.isDigit(in.charAt(pos)) || "+-.eE".indexOf(in.charAt(pos)) >= 0)) pos++; return Double.parseDouble(in.substring(s, pos)); }
    private static boolean rdBool() { ws(); if (in.startsWith("true", pos)) { pos += 4; return true; } pos += 5; return false; }
    private static String rdStr() {
        ws(); eat('"'); StringBuilder b = new StringBuilder();
        while (pos < in.length() && in.charAt(pos) != '"') {
            char c = in.charAt(pos++);
            if (c == '\\\\') { char e = in.charAt(pos++); b.append(e == 'n' ? '\\n' : e == 't' ? '\\t' : e); }
            else b.append(c);
        }
        pos++; return b.toString();
    }
    private static java.util.List<Object> rdArr(java.util.function.Supplier<Object> f) {
        java.util.List<Object> v = new java.util.ArrayList<>(); eat('['); ws();
        if (pos < in.length() && in.charAt(pos) == ']') { pos++; return v; }
        while (true) { v.add(f.get()); ws(); if (pos < in.length() && in.charAt(pos) == ',') { pos++; continue; } eat(']'); break; }
        return v;
    }
    private static long[] rdIntArr() { java.util.List<Object> v = rdArr(() -> rdInt()); long[] a = new long[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Long) v.get(i); return a; }
    private static double[] rdDoubleArr() { java.util.List<Object> v = rdArr(() -> rdDouble()); double[] a = new double[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Double) v.get(i); return a; }
    private static boolean[] rdBoolArr() { java.util.List<Object> v = rdArr(() -> rdBool()); boolean[] a = new boolean[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (Boolean) v.get(i); return a; }
    private static String[] rdStrArr() { java.util.List<Object> v = rdArr(() -> rdStr()); String[] a = new String[v.size()]; for (int i = 0; i < a.length; i++) a[i] = (String) v.get(i); return a; }
    private static long[][] rdIntMat() { java.util.List<Object> v = rdArr(() -> rdIntArr()); long[][] a = new long[v.size()][]; for (int i = 0; i < a.length; i++) a[i] = (long[]) v.get(i); return a; }

    private static String ser(Object v) {
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
        if (v != null && v.getClass().isArray()) {
            StringBuilder b = new StringBuilder("[");
            int n = java.lang.reflect.Array.getLength(v);
            for (int i = 0; i < n; i++) { if (i > 0) b.append(','); b.append(ser(java.lang.reflect.Array.get(v, i))); }
            return b.append(']').toString();
        }
        return String.valueOf(v);
    }
`;

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
        out.println(ser(result));
        out.flush();
    }
}

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
