/**
 * A problem's function signature. Participants write a function; the platform
 * generates the surrounding program that feeds it arguments and prints the
 * return value, so nobody loses points to input parsing.
 */
export const PARAM_TYPES = [
  "int",
  "double",
  "bool",
  "string",
  "int[]",
  "double[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
  "map<string,int>",
  /** JSON `[1,2,3]`, handed to the function as the head of a linked list. */
  "ListNode",
  /** JSON level order with nulls, LeetCode style: `[1,null,2]`. */
  "TreeNode",
] as const;

export type ParamType = (typeof PARAM_TYPES)[number];

export type Signature = {
  /** snake_case; converted to camelCase for javascript, c++, and java. */
  name: string;
  params: { name: string; type: ParamType }[];
  returns: ParamType;
  /**
   * Any order of the returned list is accepted: sets, subsets, permutations.
   * Only the top level is reordered; each element must still match exactly.
   */
  unordered?: boolean;
};

export const camel = (snake: string): string =>
  snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Doubles are formatted to this many decimals in every language before comparison. */
export const DOUBLE_PRECISION = 6;
