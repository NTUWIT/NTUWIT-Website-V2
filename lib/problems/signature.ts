import type { Language } from "@/lib/languages";

/**
 * A problem's shape. Participants write a function, or for a design problem a
 * class; the platform generates the program around it that reads the test,
 * calls their code and prints what comes back. That program is the entry
 * point, not anything the participant writes, so nobody loses points to input
 * parsing and nobody can change how their code is called.
 */
export const PARAM_TYPES = [
  "int",
  "double",
  "bool",
  "string",
  "char",
  "int[]",
  "double[]",
  "bool[]",
  "string[]",
  "char[]",
  "int[][]",
  "string[][]",
  "char[][]",
  "map<string,int>",
  /** JSON `[1,2,3]`, or `{"values":[...],"cycleAt":k}` for a list whose tail links back to node k. */
  "ListNode",
  /** JSON level order with nulls, LeetCode style: `[1,null,2]`. */
  "TreeNode",
  /** An N-ary tree, LeetCode style: level order, each node's children followed by null, `[1,null,3,2,4,null,5,6]`. */
  "NaryTree",
  /** A list whose nodes also point anywhere in it: `[[val, randomIndex or null], ...]`. */
  "RandomList",
  /** An undirected graph as an adjacency list: node i+1 has value i+1, and the function gets node 1. */
  "Graph",
] as const;

export type ParamType = (typeof PARAM_TYPES)[number];

/**
 * Types whose nodes LeetCode calls `Node`. A problem can use one of them, not
 * two, because each language gets a single class of that name.
 */
export const NODE_KINDS = ["NaryTree", "RandomList", "Graph"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** What a function or method gives back. `void` changes an argument instead. */
export const RETURN_TYPES = [...PARAM_TYPES, "void"] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

export type Param = { name: string; type: ParamType };

export type Method = { name: string; params: Param[]; returns: ReturnType };

/**
 * Functions the judge supplies for an interactive problem, such as First Bad
 * Version's `is_bad_version`. The author writes them in every language; they
 * can read the hidden arguments, which the participant's function never sees.
 */
export type Provided = {
  functions: Method[];
  code: Record<Language, string>;
};

export type Signature = {
  /** snake_case function name, or the PascalCase class name of a design problem. */
  name: string;
  /** The function's parameters, or the class constructor's. */
  params: Param[];
  /** Ignored for a design problem, where each method declares its own. */
  returns: ReturnType;
  /** With `returns: "void"`: the parameter changed in place, whose final value is the answer. */
  mutates?: string;
  /**
   * Any order of the returned list is accepted. `true` reorders the outer list
   * only, as for subsets; `"deep"` also reorders each inner list, as for
   * grouped anagrams.
   */
  unordered?: boolean | "deep";
  /** Present on a design problem: the methods the judge calls, in the order a test lists them. */
  methods?: Method[];
  /** Values each test carries after the arguments, kept from the participant and read by `provided`. */
  hidden?: Param[];
  /** The judge's own functions that participant code may call. */
  provided?: Provided;
  /**
   * For problems with many right answers: Python defining
   * `check(args, expected, actual) -> bool`. It replaces the exact comparison.
   */
  checker?: string;
};

export const isDesign = (sig: Signature): boolean => Array.isArray(sig.methods) && sig.methods.length > 0;

/** Every type the signature mentions, anywhere. */
export function typesIn(sig: Signature): string[] {
  const all: string[] = [sig.returns, ...sig.params.map((p) => p.type), ...(sig.hidden ?? []).map((p) => p.type)];
  for (const m of [...(sig.methods ?? []), ...(sig.provided?.functions ?? [])]) {
    all.push(m.returns, ...m.params.map((p) => p.type));
  }
  return all;
}

/** The `Node` kind this problem uses, if any. */
export function nodeKind(sig: Signature): NodeKind | null {
  const types = typesIn(sig);
  return NODE_KINDS.find((k) => types.includes(k)) ?? null;
}

/** Types that can be changed in place and handed back as the answer. */
export const MUTABLE_TYPES: ParamType[] = [
  "int[]", "double[]", "bool[]", "string[]", "char[]", "int[][]", "string[][]", "char[][]",
];

/** The type printed as the answer of a function problem. */
export function answerType(sig: Signature): ParamType {
  if (sig.returns !== "void") return sig.returns;
  const mutated = sig.params.find((p) => p.name === sig.mutates);
  return mutated ? mutated.type : "int[]";
}

export const camel = (snake: string): string =>
  snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Doubles are formatted to this many decimals in every language before comparison. */
export const DOUBLE_PRECISION = 6;
