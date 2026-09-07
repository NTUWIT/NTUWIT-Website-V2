import { z } from "zod";

import { LANGUAGES } from "@/lib/languages";

/** Generous enough for any reasonable solution, small enough to bound judge payloads. */
export const MAX_SOURCE_BYTES = 64_000;

/** A custom test's arguments, as a JSON array. Small: it is typed by hand. */
export const MAX_CUSTOM_ARGS_BYTES = 4_000;

export const submissionInput = z.object({
  problemId: z.uuid(),
  language: z.enum(LANGUAGES),
  source: z.string().max(MAX_SOURCE_BYTES),
  /** Run only: extra arguments to try. Never scored, never persisted. */
  customArgs: z.string().max(MAX_CUSTOM_ARGS_BYTES).optional(),
});

export type SubmissionInput = z.infer<typeof submissionInput>;

/**
 * Parses an untrusted request body. Unknown keys (a client-supplied `userId`,
 * `timeLimitMs`, `points`, or test cases) are stripped by zod rather than
 * reaching any downstream code.
 */
export async function parseBody(request: Request): Promise<SubmissionInput | null> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return null;
  }
  const parsed = submissionInput.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
