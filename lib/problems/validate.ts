/**
 * Validates a problem and its test cases against its own signature.
 *
 * Test cases are hand-authored JSON strings. Without this, a single malformed
 * hidden test (wrong arity, wrong type, unparseable expected value) is only
 * discovered during an event, as a room full of correct solutions failing.
 *
 * Pure and dependency-free so it can run in a script, in a seed, or in a test.
 */
import { REQUEST_TIMEOUT_MS } from "@/lib/judge/limits";
import { LANGUAGES, type Language } from "@/lib/languages";
import { DOUBLE_PRECISION, PARAM_TYPES, type ParamType, type Signature } from "./signature";

export type ProblemLike = {
  slug: string;
  signature: Signature;
  points: number;
  timeLimitMs: number;
  starterCode: Partial<Record<Language, string>>;
  tests: { stdin: string; expectedStdout: string; isSample?: boolean }[];
};

/** Does a parsed JSON value match the declared parameter type? */
export function matchesType(value: unknown, type: ParamType): boolean {
  switch (type) {
    case "int":
      return typeof value === "number" && Number.isInteger(value);
    case "double":
      return typeof value === "number" && Number.isFinite(value);
    case "bool":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "int[]":
    case "double[]":
    case "bool[]":
    case "string[]": {
      const inner = type.slice(0, -2) as ParamType;
      return Array.isArray(value) && value.every((item) => matchesType(item, inner));
    }
    case "int[][]":
      return (
        Array.isArray(value) && value.every((row) => matchesType(row, "int[]"))
      );
  }
}

/** How the harness prints a return value, so expected output can be checked. */
export function expectedForm(value: unknown, type: ParamType): string {
  if (type === "double") return (value as number).toFixed(DOUBLE_PRECISION);
  if (type === "bool") return value ? "true" : "false";
  return JSON.stringify(value);
}

export function validateProblem(problem: ProblemLike): string[] {
  const problems: string[] = [];
  const at = (message: string) => problems.push(`${problem.slug}: ${message}`);

  const { signature: sig } = problem;

  if (!/^[a-z][a-z0-9_]*$/.test(sig.name)) {
    at(`signature name "${sig.name}" must be snake_case`);
  }
  if (!PARAM_TYPES.includes(sig.returns)) {
    at(`unknown return type "${sig.returns}"`);
  }
  for (const param of sig.params) {
    if (!PARAM_TYPES.includes(param.type)) {
      at(`parameter "${param.name}" has unknown type "${param.type}"`);
    }
    if (!/^[a-z][a-z0-9_]*$/.test(param.name)) {
      at(`parameter name "${param.name}" must be snake_case`);
    }
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

    let args: unknown;
    try {
      args = JSON.parse(test.stdin);
    } catch {
      at(`${where}: stdin is not valid JSON`);
      return;
    }

    if (!Array.isArray(args)) {
      at(`${where}: stdin must be a JSON array of arguments`);
      return;
    }
    if (args.length !== sig.params.length) {
      at(`${where}: ${args.length} arguments given, signature declares ${sig.params.length}`);
      return;
    }
    sig.params.forEach((param, position) => {
      if (!matchesType(args[position], param.type)) {
        at(
          `${where}: argument ${position + 1} ("${param.name}") is not a valid ${param.type}`,
        );
      }
    });

    if (test.expectedStdout.trim() === "") {
      at(`${where}: expected output is empty`);
      return;
    }

    // The expected output has to be exactly what the harness would print for
    // some value of the return type, otherwise no correct solution can pass.
    // String returns are printed JSON-quoted, which is the single easiest thing
    // for a problem author to get wrong: storing `world hello` instead of
    // `"world hello"` makes every correct solution fail.
    let expected: unknown;
    try {
      expected = JSON.parse(test.expectedStdout);
    } catch {
      at(`${where}: expected output "${test.expectedStdout}" is not valid JSON for ${sig.returns}`);
      return;
    }
    if (!matchesType(expected, sig.returns)) {
      at(`${where}: expected output is not a valid ${sig.returns}`);
      return;
    }
    const canonical = expectedForm(expected, sig.returns);
    if (canonical !== test.expectedStdout.trim()) {
      at(
        `${where}: expected output "${test.expectedStdout}" is not in the form the ` +
          `harness prints ("${canonical}")`,
      );
    }
  });

  return problems;
}
