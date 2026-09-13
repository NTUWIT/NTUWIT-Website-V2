/**
 * Validates a problem and its test cases against its own signature.
 *
 * Test cases are hand-authored JSON strings. Without this, a single malformed
 * hidden test (wrong arity, wrong type, unparseable expected value) is only
 * discovered during an event, as a room full of correct solutions failing.
 *
 * Pure and dependency-free so it can run in a script, in a seed, in a test, in
 * the route that checks custom input, and in the browser as the wizard is typed.
 */
import { MAX_OUTPUT_BYTES, MAX_STDIN_BYTES, REQUEST_TIMEOUT_MS } from "@/lib/judge/limits";
import { LANGUAGES, type Language } from "@/lib/languages";
import {
  answerType,
  DOUBLE_PRECISION,
  isDesign,
  MUTABLE_TYPES,
  NODE_KINDS,
  PARAM_TYPES,
  RETURN_TYPES,
  type ParamType,
  type Signature,
  typesIn,
} from "./signature";

const bytes = (text: string) => new TextEncoder().encode(text).length;

export type ProblemLike = {
  slug: string;
  signature: Signature;
  points: number;
  timeLimitMs: number;
  starterCode: Partial<Record<Language, string>>;
  tests: { stdin: string; expectedStdout: string; isSample?: boolean }[];
};

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Does a parsed JSON value match the declared type? */
export function matchesType(value: unknown, type: ParamType): boolean {
  switch (type) {
    case "int":
      return isInt(value);
    case "double":
      return typeof value === "number" && Number.isFinite(value);
    case "bool":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "char":
      // One ASCII character: C++'s char is a single byte, so anything wider
      // would read differently from one language to the next.
      return typeof value === "string" && value.length === 1 && value.charCodeAt(0) < 128;
    case "int[]":
    case "double[]":
    case "bool[]":
    case "string[]":
    case "char[]": {
      const inner = type.slice(0, -2) as ParamType;
      return Array.isArray(value) && value.every((item) => matchesType(item, inner));
    }
    case "int[][]":
    case "string[][]":
    case "char[][]": {
      const inner = type.slice(0, -2) as ParamType;
      return Array.isArray(value) && value.every((row) => matchesType(row, inner));
    }
    case "map<string,int>":
      return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.values(value).every((v) => matchesType(v, "int"))
      );
    case "ListNode": {
      if (matchesType(value, "int[]")) return true;
      // A list whose tail links back to node `cycleAt`, as LeetCode's `pos`.
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
      const { values, cycleAt, ...rest } = value as Record<string, unknown>;
      return (
        Object.keys(rest).length === 0 &&
        matchesType(values, "int[]") &&
        isInt(cycleAt) &&
        cycleAt >= -1 &&
        cycleAt < (values as number[]).length
      );
    }
    case "NaryTree":
      // Level order: the root, a null, then each node's children followed by
      // a null. Trailing nulls are trimmed, as LeetCode prints it.
      return (
        Array.isArray(value) &&
        value.every((v) => v === null || isInt(v)) &&
        (value.length === 0 ||
          (value[0] !== null && value.at(-1) !== null && (value.length === 1 || value[1] === null)))
      );
    case "RandomList":
      return (
        Array.isArray(value) &&
        value.every(
          (pair) =>
            Array.isArray(pair) &&
            pair.length === 2 &&
            isInt(pair[0]) &&
            (pair[1] === null || (isInt(pair[1]) && pair[1] >= 0 && pair[1] < value.length)),
        )
      );
    case "Graph":
      // Adjacency list: row i lists the values of node i+1's neighbours.
      return (
        matchesType(value, "int[][]") &&
        (value as number[][]).every((row) => row.every((j) => j >= 1 && j <= (value as number[][]).length))
      );
    case "TreeNode":
      // Level order with nulls for missing children. The root is never null and
      // trailing nulls are trimmed, which is the one form the harness prints.
      return (
        Array.isArray(value) &&
        value.every((v) => v === null || matchesType(v, "int")) &&
        (value.length === 0 || (value[0] !== null && value.at(-1) !== null))
      );
  }
}

/** How the harness prints a value, so expected output can be checked. */
export function expectedForm(value: unknown, type: ParamType): string {
  if (type === "double") return (value as number).toFixed(DOUBLE_PRECISION);
  if (type === "double[]") {
    return `[${(value as number[]).map((v) => v.toFixed(DOUBLE_PRECISION)).join(",")}]`;
  }
  if (type === "bool") return value ? "true" : "false";
  if (type === "map<string,int>") {
    // Keys are printed sorted in every language, so authors may write them in
    // any order but the canonical form is the sorted one.
    const map = value as Record<string, number>;
    return `{${Object.keys(map)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${map[k]}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const parse = (text: string): { ok: true; value: unknown } | { ok: false } => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
};

/**
 * Checks one test's arguments against the signature, returning a sentence for
 * the author or null when they fit. A design problem's arguments are
 * LeetCode's two lists: the operations, starting with the class name, and the
 * arguments for each.
 */
export function checkArguments(sig: Signature, args: unknown): string | null {
  if (!Array.isArray(args)) return "Arguments must be a JSON array.";

  if (!isDesign(sig)) {
    // Hidden values follow the arguments: the judge's provided functions read
    // them, the participant's function never receives them.
    const all = [...sig.params, ...(sig.hidden ?? [])];
    if (args.length !== all.length) {
      const hidden = sig.hidden?.length ? ` plus ${sig.hidden.length} hidden value${sig.hidden.length === 1 ? "" : "s"}` : "";
      return `${args.length} value${args.length === 1 ? "" : "s"} given; the test needs ${sig.params.length} argument${sig.params.length === 1 ? "" : "s"}${hidden}.`;
    }
    for (const [i, param] of all.entries()) {
      const what = i < sig.params.length ? `Argument ${i + 1}` : "Hidden value";
      if (!matchesType(args[i], param.type)) return `${what} ("${param.name}") is not a valid ${param.type}.`;
    }
    return null;
  }

  const [ops, values] = args as [unknown, unknown];
  if (args.length !== 2 || !Array.isArray(ops) || !Array.isArray(values)) {
    return 'A design test is two lists: the operations, then their arguments, e.g. [["MinStack","push"],[[],[3]]].';
  }
  if (ops.length === 0 || ops.length !== values.length) return "The two lists must be the same length, and not empty.";
  if (ops[0] !== sig.name) return `The first operation must be "${sig.name}", which creates the object.`;
  for (const [i, op] of ops.entries()) {
    const params = i === 0 ? sig.params : sig.methods!.find((m) => m.name === op)?.params;
    if (!params) return `Operation ${i + 1}, "${String(op)}", is not one of the class's methods.`;
    const given = values[i];
    if (!Array.isArray(given) || given.length !== params.length) {
      return `Operation ${i + 1} ("${String(op)}") takes ${params.length} argument${params.length === 1 ? "" : "s"}.`;
    }
    for (const [k, param] of params.entries()) {
      if (!matchesType(given[k], param.type)) {
        return `Operation ${i + 1} ("${String(op)}"): "${param.name}" is not a valid ${param.type}.`;
      }
    }
  }
  return null;
}

/**
 * Checks an expected answer, returning a sentence for the author or null. The
 * answer has to be exactly what the harness would print for some valid value,
 * otherwise no correct solution can pass. String answers are printed quoted,
 * which is the single easiest thing for an author to get wrong.
 */
export function checkExpected(sig: Signature, expectedText: string, args: unknown): string | null {
  const text = expectedText.trim();
  if (!text) return "The expected answer is empty.";
  const parsed = parse(text);

  if (!isDesign(sig)) {
    const type = answerType(sig);
    if (!parsed.ok) return type === "string" ? 'A text answer must be quoted, e.g. "hello".' : "The expected answer is not valid JSON.";
    if (!matchesType(parsed.value, type)) return `The expected answer is not a valid ${type}.`;
    const canonical = expectedForm(parsed.value, type);
    return canonical === text ? null : `Write it exactly as the judge prints it: ${canonical}`;
  }

  // One entry per operation: null for the constructor and for methods that
  // return nothing, the method's value otherwise. This is LeetCode's format.
  const ops = (Array.isArray(args) ? args[0] : []) as string[];
  if (!parsed.ok || !Array.isArray(parsed.value)) return "The expected answer must be a JSON list with one entry per operation.";
  if (parsed.value.length !== ops.length) return `The answer needs one entry per operation: ${ops.length}.`;
  const parts: string[] = [];
  for (const [i, op] of ops.entries()) {
    const returns = i === 0 ? "void" : (sig.methods!.find((m) => m.name === op)?.returns ?? "void");
    const value = parsed.value[i];
    if (returns === "void") {
      if (value !== null) return `Entry ${i + 1} ("${op}") returns nothing, so it must be null.`;
      parts.push("null");
      continue;
    }
    if (!matchesType(value, returns)) return `Entry ${i + 1} ("${op}") is not a valid ${returns}.`;
    parts.push(expectedForm(value, returns));
  }
  const canonical = `[${parts.join(",")}]`;
  return canonical === text ? null : `Write it exactly as the judge prints it: ${canonical}`;
}

const SNAKE = /^[a-z][a-z0-9_]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

export function validateProblem(problem: ProblemLike): string[] {
  const problems: string[] = [];
  const at = (message: string) => problems.push(`${problem.slug}: ${message}`);
  const { signature: sig } = problem;

  const checkParams = (params: { name: string; type: string }[], owner: string) => {
    const seen = new Set<string>();
    for (const param of params) {
      if (!(PARAM_TYPES as readonly string[]).includes(param.type)) at(`${owner} parameter "${param.name}" has unknown type "${param.type}"`);
      if (!SNAKE.test(param.name)) at(`${owner} parameter name "${param.name}" must be snake_case`);
      if (seen.has(param.name)) at(`${owner} has two parameters named "${param.name}"`);
      seen.add(param.name);
    }
  };

  if (isDesign(sig)) {
    if (!PASCAL.test(sig.name)) at(`class name "${sig.name}" must be PascalCase, e.g. MinStack`);
    checkParams(sig.params, "constructor");
    const names = new Set<string>();
    for (const method of sig.methods!) {
      if (!SNAKE.test(method.name)) at(`method name "${method.name}" must be snake_case`);
      if (names.has(method.name)) at(`two methods are named "${method.name}"`);
      names.add(method.name);
      if (!(RETURN_TYPES as readonly string[]).includes(method.returns)) at(`method "${method.name}" has unknown return type "${method.returns}"`);
      checkParams(method.params, `method "${method.name}"`);
    }
  } else {
    if (!SNAKE.test(sig.name)) at(`signature name "${sig.name}" must be snake_case`);
    if (!(RETURN_TYPES as readonly string[]).includes(sig.returns)) at(`unknown return type "${sig.returns}"`);
    checkParams(sig.params, "function");
    if (sig.returns === "void") {
      const mutated = sig.params.find((p) => p.name === sig.mutates);
      if (!mutated) at("a function that returns nothing must name the parameter it changes, whose final value is the answer");
      else if (!MUTABLE_TYPES.includes(mutated.type)) at(`"${mutated.name}" is a ${mutated.type}, which cannot be changed in place; use a list or grid`);
    } else if (sig.mutates) {
      at("only a function that returns nothing can name a parameter it changes");
    }
  }

  // LeetCode calls all three of these Node, and so do we: one per problem.
  const kinds = [...new Set(typesIn(sig).filter((t) => (NODE_KINDS as readonly string[]).includes(t)))];
  if (kinds.length > 1) at(`${kinds.join(" and ")} both use a class called Node; a problem can use only one of them`);

  if (sig.hidden?.length || sig.provided) {
    if (isDesign(sig)) at("hidden values and provided functions are for function problems, not design classes");
    checkParams(sig.hidden ?? [], "hidden");
    for (const h of sig.hidden ?? []) {
      if (sig.params.some((p) => p.name === h.name)) at(`hidden value "${h.name}" has the same name as a parameter`);
    }
    if (!sig.provided || sig.provided.functions.length === 0) {
      at("hidden values need at least one provided function to read them");
    } else {
      const names = new Set<string>();
      for (const fn of sig.provided.functions) {
        if (!SNAKE.test(fn.name)) at(`provided function name "${fn.name}" must be snake_case`);
        if (names.has(fn.name)) at(`two provided functions are named "${fn.name}"`);
        names.add(fn.name);
        checkParams(fn.params, `provided function "${fn.name}"`);
      }
      for (const language of LANGUAGES) {
        if (!sig.provided.code[language]?.trim()) at(`provided functions have no ${language} code`);
      }
      if (sig.provided.code.java && !/\bclass\s+Provided\b/.test(sig.provided.code.java)) {
        at("the Java provided code must declare class Provided, which Solution extends");
      }
    }
  }

  if (sig.checker !== undefined && !/\bdef\s+check\s*\(/.test(sig.checker)) {
    at("the checker must define check(args, expected, actual) in Python");
  }

  if (problem.points <= 0) at("points must be positive");

  // FINDING #8: the judge's own HTTP abort is a hard ceiling independent of the
  // problem. A problem authored at or above it can never return a real verdict.
  if (problem.timeLimitMs >= REQUEST_TIMEOUT_MS) {
    at(
      `timeLimitMs ${problem.timeLimitMs} is at or above the judge request ceiling ` +
        `${REQUEST_TIMEOUT_MS}, so a slow-but-legal run reports JUDGE_UNAVAILABLE`,
    );
  }

  for (const language of LANGUAGES) {
    const starter = problem.starterCode[language];
    if (!starter || starter.trim() === "") at(`missing starter code for ${language}`);
  }

  if (problem.tests.length === 0) at("has no test cases");
  if (!problem.tests.some((test) => test.isSample)) {
    at("has no sample test, participants would see no worked example");
  }

  problem.tests.forEach((test, index) => {
    const where = `test ${index + 1}`;
    const args = parse(test.stdin);
    if (!args.ok) {
      at(`${where}: stdin is not valid JSON`);
      return;
    }
    const argProblem = checkArguments(sig, args.value);
    if (argProblem) {
      at(`${where}: ${argProblem}`);
      return;
    }

    // Past either limit the judge cannot carry the test at all, so no
    // solution could ever pass it: the request is refused, or the run is
    // killed for printing too much.
    if (bytes(test.stdin) > MAX_STDIN_BYTES) {
      at(`${where}: arguments are ${bytes(test.stdin)} bytes; the judge accepts at most ${MAX_STDIN_BYTES}`);
    }
    // The harness prints the answer plus a newline, and the run is killed at the limit.
    if (bytes(test.expectedStdout.trim()) + 1 >= MAX_OUTPUT_BYTES) {
      at(`${where}: the answer is ${bytes(test.expectedStdout.trim())} bytes; the judge can print at most ${MAX_OUTPUT_BYTES - 2}`);
    }

    const expectedProblem = checkExpected(sig, test.expectedStdout, args.value);
    if (expectedProblem) at(`${where}: ${expectedProblem}`);
  });

  return problems;
}
