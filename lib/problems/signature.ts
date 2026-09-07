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
] as const;

export type ParamType = (typeof PARAM_TYPES)[number];

export type Signature = {
  /** snake_case; converted to camelCase for javascript, c++, and java. */
  name: string;
  params: { name: string; type: ParamType }[];
  returns: ParamType;
};

export const camel = (snake: string): string =>
  snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Doubles are formatted to this many decimals in every language before comparison. */
export const DOUBLE_PRECISION = 6;
