import type { Signature } from "@/lib/problems/signature";

/**
 * Output comparison rule, stated in every problem statement so participants
 * know what is compared: trailing whitespace is stripped from each line and
 * trailing newlines are stripped from the whole output, then the result must
 * match exactly, unless the problem says otherwise below.
 */
export function normaliseOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export type MatchOptions = {
  /** Reorder the returned list before comparing: the outer list, or every level. */
  unordered?: boolean | "deep";
  /** Compare numbers within 1e-5, as LeetCode does for decimal answers. */
  approx?: boolean;
};

/** How a problem's answers are compared, read from its signature. */
export function matchOptions(sig: Signature): MatchOptions {
  const types = sig.methods ? sig.methods.map((m) => m.returns) : [sig.returns];
  return {
    unordered: sig.unordered,
    approx: types.some((t) => t === "double" || t === "double[]"),
  };
}

const TOLERANCE = 1e-5;

/** The harness prints canonical JSON, so each element's text is a stable sort key. */
const sortList = (list: unknown[]) =>
  [...list].sort((a, b) => {
    const x = JSON.stringify(a), y = JSON.stringify(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });

function reorder(value: unknown, mode: true | "deep"): unknown {
  if (!Array.isArray(value)) return value;
  return sortList(mode === "deep" ? value.map((item) => (Array.isArray(item) ? sortList(item) : item)) : value);
}

function same(a: unknown, b: unknown, approx: boolean): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return approx ? Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(b)) : a === b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => same(item, b[i], approx));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], approx))
    );
  }
  return a === b;
}

export function outputMatches(actual: string, expected: string, options: MatchOptions | boolean = {}): boolean {
  // A bare boolean is the old `unordered` flag.
  const opts: MatchOptions = typeof options === "boolean" ? { unordered: options } : options;
  const a = normaliseOutput(actual);
  const e = normaliseOutput(expected);
  if (a === e) return true;
  if (!opts.unordered && !opts.approx) return false;

  let left: unknown, right: unknown;
  try {
    left = JSON.parse(a);
    right = JSON.parse(e);
  } catch {
    return false;
  }
  if (opts.unordered) {
    left = reorder(left, opts.unordered);
    right = reorder(right, opts.unordered);
  }
  return same(left, right, Boolean(opts.approx));
}
