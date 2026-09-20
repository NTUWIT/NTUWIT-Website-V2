import "server-only";

import { z } from "zod";

import { JudgeError } from "@/lib/errors";
import { INPUT_MARKER } from "./harness";
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

/** The file each run's test input is written to. The harness removes it on start. */
export const INPUT_FILE = "input.json";

/**
 * The test's text as literals in place of INPUT_MARKER. C++ takes adjacent raw
 * strings; Java takes an array of chunks, because one string constant in a
 * class file cannot exceed 65,535 bytes.
 */
function embedInput(language: "cpp" | "java", source: string, text: string): string {
  const CHUNK = 8000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK) chunks.push(text.slice(i, i + CHUNK));
  const literals =
    language === "cpp"
      ? chunks.length
        ? chunks.map((c) => `R"__WIT(${c})__WIT"`).join("\n")
        : '""'
      : chunks.length
        ? chunks
            .map((c) => `"${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`)
            .join(",\n")
        : '""';
  return source.replace(INPUT_MARKER, () => literals);
}

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
        // The test never travels as stdin: Piston truncates what it pipes to
        // a process at about 200 KB. Python and JavaScript get it as a file,
        // which the harness reads and deletes before participant code runs.
        // C++ and Java compile every file they are sent, so for them the test
        // is written into the source as string literals instead.
        files:
          args.language === "cpp" || args.language === "java"
            ? [{ name: runtime.file, content: embedInput(args.language, args.source, args.stdin) }]
            : [
                { name: runtime.file, content: args.source },
                { name: INPUT_FILE, content: args.stdin },
              ],
        stdin: "",
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
  // A string match on javac's own wording. If another language ever behaves
  // this way, this becomes a per-language compile-failure matcher.
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
