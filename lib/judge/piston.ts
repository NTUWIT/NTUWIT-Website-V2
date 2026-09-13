import "server-only";

import { z } from "zod";

import { JudgeError } from "@/lib/errors";
import { REQUEST_TIMEOUT_MS } from "./limits";
import type { Language } from "@/lib/languages";

/**
 * The ONLY module aware of Piston's HTTP contract. Swapping the execution
 * backend means rewriting this file and nothing else.
 */

const PISTON_URL = process.env.PISTON_URL;
/** Shared secret checked by the reverse proxy in front of Piston. */
const PISTON_TOKEN = process.env.PISTON_TOKEN;

export { REQUEST_TIMEOUT_MS } from "./limits";

/** Piston runtime identifiers and the file extension each expects. */
const RUNTIME: Record<Language, { language: string; version: string; file: string }> = {
  python: { language: "python", version: "3.12.0", file: "main.py" },
  javascript: { language: "javascript", version: "20.11.1", file: "main.js" },
  cpp: { language: "c++", version: "10.2.0", file: "main.cpp" },
  java: { language: "java", version: "15.0.2", file: "Main.java" },
};

const pistonResponse = z.object({
  run: z.object({
    stdout: z.string(),
    stderr: z.string(),
    // Piston reports `code: null` when the process was killed by a signal.
    code: z.number().nullable(),
    signal: z.string().nullable(),
    // Set when Piston killed the run itself, e.g. "stdout length exceeded".
    message: z.string().nullable().optional(),
  }),
  compile: z
    .object({
      stdout: z.string(),
      stderr: z.string(),
      code: z.number().nullable(),
    })
    .optional(),
});

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  compileError: string | null;
  /** Piston's own reason for killing the run, when it gave one. */
  message?: string | null;
};

export async function execute(args: {
  language: Language;
  source: string;
  stdin: string;
  timeLimitMs: number;
  memoryLimitKb: number;
}): Promise<ExecResult> {
  if (!PISTON_URL) throw new JudgeError("PISTON_URL is not set");

  const runtime = RUNTIME[args.language];

  let response: Response;
  try {
    response = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Piston has no auth of its own; the proxy in front of it rejects any
        // request without this header, so the box is not an open execution
        // endpoint for anyone who finds the address.
        ...(PISTON_TOKEN ? { "X-Piston-Token": PISTON_TOKEN } : {}),
      },
      // A judge that stops responding must fail this request rather than eat
      // the whole platform function budget.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.file, content: args.source }],
        stdin: args.stdin,
        run_timeout: args.timeLimitMs,
        compile_timeout: 10_000,
        run_memory_limit: args.memoryLimitKb * 1024,
      }),
    });
  } catch {
    // Covers abort, DNS failure, and connection refused alike.
    throw new JudgeError("judge unreachable");
  }

  if (!response.ok) throw new JudgeError(`judge returned ${response.status}`);

  const parsed = pistonResponse.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new JudgeError("unrecognised judge response");

  const { run, compile } = parsed.data;

  // Most languages report a failed build as a `compile` stage. Java's Piston
  // package compiles inside the run step instead, so a javac failure arrives
  // as a non-zero run exit and is indistinguishable from a crash without
  // reading the message.
  // ponytail: string match on javac's own wording; if more languages behave
  // this way, move to a per-language compile-failure matcher.
  const javacFailed =
    !compile && run.code !== 0 && /^error: compilation failed$/m.test(run.stderr);

  return {
    stdout: run.stdout,
    stderr: run.stderr,
    exitCode: run.code,
    signal: run.signal,
    message: run.message ?? null,
    compileError: javacFailed
      ? run.stderr
      : compile && compile.code !== 0
        ? compile.stderr || compile.stdout
        : null,
  };
}
