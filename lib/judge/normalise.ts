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

/**
 * The top-level list as a sorted multiset. The harness prints canonical JSON
 * (doubles at fixed precision are still valid JSON), so each element's text is
 * a stable sort key. Anything that is not a JSON list is left as it was.
 */
function sortedList(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return value;
    return JSON.stringify(parsed.map((item) => JSON.stringify(item)).sort());
  } catch {
    return value;
  }
}

export function outputMatches(actual: string, expected: string, unordered = false): boolean {
  const a = normaliseOutput(actual);
  const e = normaliseOutput(expected);
  if (a === e) return true;
  return unordered && sortedList(a) === sortedList(e);
}
