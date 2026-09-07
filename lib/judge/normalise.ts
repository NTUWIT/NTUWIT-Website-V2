/**
 * Output comparison rule, stated in every problem statement so participants
 * know what is compared: trailing whitespace is stripped from each line and
 * trailing newlines are stripped from the whole output, then the result must
 * match exactly.
 */
export function normaliseOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

export function outputMatches(actual: string, expected: string): boolean {
  return normaliseOutput(actual) === normaliseOutput(expected);
}
