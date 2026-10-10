"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import {
  archiveProblem,
  assignProblemToSet,
  closeRunningSessions,
  createProblem,
  createSet,
  deleteProblem,
  deleteSet,
  getActiveSelection,
  getProblemById,
  getSet,
  insertSession,
  listSetProblemIds,
  setActiveSelection,
  setEventEndsAt,
  setProblemOrder,
  unarchiveProblem,
  updateProblem,
  updateSet,
} from "@/lib/db/queries";
import { isReorderOf } from "@/lib/order";
import { runTests } from "@/lib/judge/runner";
import { LANGUAGES, type Language } from "@/lib/languages";
import { PARAM_TYPES, RETURN_TYPES } from "@/lib/problems/signature";
import { MAX_SOURCE_BYTES } from "@/lib/validation";
import { starterCodeFor } from "@/lib/problems/starter";
import { validateProblem } from "@/lib/problems/validate";

/**
 * Every action re-checks the role. A server action is a public endpoint: the
 * page component's guard does not protect it.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; errors: string[] };

const failed = (...errors: string[]): ActionResult => ({ ok: false, errors });

async function guard(): Promise<ActionResult | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return failed("You are not signed in as an admin.");
  }
}

/* ---------- the session clock ---------- */

/**
 * Records a timed session for the results page. It must never stop a session
 * from starting, so a failure is reported in the message instead of thrown.
 */
async function recordSession(startsAt: Date, endsAt: Date): Promise<string> {
  try {
    const active = await getActiveSelection();
    const label = active.setId
      ? ((await getSet(active.setId))?.name ?? "Problem set")
      : active.problemId
        ? ((await getProblemById(active.problemId))?.title ?? "Problem")
        : "Session";
    await insertSession(label, startsAt, endsAt);
    return "";
  } catch (error) {
    console.error("recordSession failed", error);
    return " The session could not be recorded for Results; use a custom time range there.";
  }
}

/** Ends the recorded session early when its timer is cleared. Never blocks. */
async function closeSession() {
  try {
    await closeRunningSessions(new Date());
  } catch (error) {
    console.error("closeSession failed", error);
  }
}

export async function startEvent(minutes: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
    return failed("Length must be between 1 minute and 24 hours.");
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  await closeSession();
  await setEventEndsAt(endsAt);
  const warning = await recordSession(startsAt, endsAt);
  revalidatePath("/", "layout");
  return { ok: true, message: `Countdown running until ${endsAt.toLocaleTimeString()}.${warning}` };
}

export async function stopEvent(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await setEventEndsAt(null);
  await closeSession();
  revalidatePath("/", "layout");
  return { ok: true, message: "Countdown cleared." };
}

/* ---------- sets and activation ---------- */

export async function updateSetDetails(
  setId: string,
  name: string,
  description: string,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return failed("Give the set a name of 2 to 80 characters.");
  if (description.length > 500) return failed("Keep the description under 500 characters.");
  if (!(await getSet(setId))) return failed("That set no longer exists.");

  await updateSet(setId, trimmed, description.trim() || null);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** Saves a new order. Refused unless it is exactly the set's current problems, rearranged. */
export async function reorderSet(setId: string, orderedIds: string[]): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) {
    return failed("That order is not valid.");
  }
  const current = await listSetProblemIds(setId);
  if (!isReorderOf(current, orderedIds)) {
    return failed("The set changed while you were editing. Reload the page and try again.");
  }

  await setProblemOrder(setId, orderedIds);
  revalidatePath("/", "layout");
  return { ok: true, message: "Order saved." };
}

export async function addSet(name: string, description: string, order: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (name.trim().length < 2) return failed("Give the set a name.");

  await createSet(name.trim(), description.trim() || null, order);
  revalidatePath("/admin");
  return { ok: true, message: `Created "${name.trim()}".` };
}

export async function removeSet(setId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await deleteSet(setId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Set deleted. Its problems are now unassigned." };
}

export async function moveProblem(problemId: string, setId: string | null): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await assignProblemToSet(problemId, setId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Moved." };
}

/**
 * Opens exactly one thing to participants, optionally on a clock. Anything not
 * in the active selection is invisible and unreachable, including to a stale
 * tab: the judge routes re-check on every request.
 */
export async function activate(args: {
  setId?: string | null;
  problemId?: string | null;
  minutes?: number | null;
}): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const setId = args.setId ?? null;
  const problemId = args.problemId ?? null;
  if (setId && problemId) return failed("Activate a set or a single problem, not both.");
  if (!setId && !problemId) return failed("Nothing selected to activate.");

  const minutes = args.minutes ?? null;
  if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60)) {
    return failed("The timer must be between 1 minute and 24 hours.");
  }

  const startsAt = new Date();
  const endsAt = minutes === null ? null : new Date(startsAt.getTime() + minutes * 60_000);
  await closeSession();
  await setActiveSelection({ setId, problemId, endsAt });
  const warning = endsAt ? await recordSession(startsAt, endsAt) : "";

  revalidatePath("/", "layout");
  return {
    ok: true,
    message:
      minutes === null ? "Live now, with no timer." : `Live now for ${minutes} minutes.${warning}`,
  };
}

/** Closes everything. Scores already earned are untouched. */
export async function deactivateAll(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await setActiveSelection({ setId: null, problemId: null, endsAt: null });
  await closeSession();
  revalidatePath("/", "layout");
  return { ok: true, message: "Nothing is live. Scores are kept." };
}

export async function removeProblem(problemId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await deleteProblem(problemId);
  } catch (error) {
    if (error instanceof Error && error.message === "HAS_SUBMISSIONS") {
      return failed(
        "People have already run or submitted code on this problem, so deleting it would erase their history. Archive it instead.",
      );
    }
    return failed("Could not delete that problem.");
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Problem deleted." };
}

/** Hides a problem but keeps every submission and run. */
export async function archive(problemId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const active = await getActiveSelection();
  if (active.problemId === problemId) {
    return failed("This problem is open to participants. End the session before archiving it.");
  }
  await archiveProblem(problemId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Archived. Its submissions and results are kept." };
}

export async function unarchive(problemId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await unarchiveProblem(problemId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Restored to Not in a set." };
}

/* ---------- authoring ---------- */

const paramShape = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Parameter names must be snake_case."),
  type: z.enum(PARAM_TYPES),
});

const methodShape = z.object({ name: z.string(), params: z.array(paramShape).max(8), returns: z.enum(RETURN_TYPES) });

// Names are checked loosely here and precisely by validateProblem, which knows
// whether this is a function (snake_case) or a design class (PascalCase).
const signatureShape = z.object({
  name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "The name may use letters, numbers and underscores."),
  params: z.array(paramShape).max(8),
  returns: z.enum(RETURN_TYPES),
  mutates: z.string().optional(),
  unordered: z.union([z.boolean(), z.literal("deep")]).optional(),
  methods: z.array(methodShape).max(16).optional(),
  hidden: z.array(paramShape).max(8).optional(),
  provided: z
    .object({
      functions: z.array(methodShape).max(8),
      code: z.object({
        python: z.string().max(20_000),
        javascript: z.string().max(20_000),
        cpp: z.string().max(20_000),
        java: z.string().max(20_000),
      }),
    })
    .optional(),
  checker: z.string().max(20_000).optional(),
});

const draft = z.object({
  /** Present when editing; absent when creating. */
  id: z.uuid().optional(),
  setId: z.uuid().nullable().optional(),
  title: z.string().trim().min(3, "Give the problem a title."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The URL name may use lowercase letters, numbers and hyphens."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().int().positive().max(10_000),
  timeLimitMs: z.number().int().min(500).max(7_000),
  memoryLimitKb: z.number().int().min(16_384).max(524_288),
  order: z.number().int().min(0).max(999),
  statementMd: z.string().trim().min(20, "Write a statement so participants know what to do."),
  signature: signatureShape,
  tests: z
    .array(
      z.object({
        stdin: z.string().trim().min(1),
        expectedStdout: z.string().trim().min(1),
        isSample: z.boolean(),
      }),
    )
    .min(1, "Add at least one test case."),
});

export type ProblemDraft = z.infer<typeof draft>;

export async function saveProblem(input: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = draft.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
  }
  const value = parsed.data;

  // Starter code is generated from the signature so the four language stubs can
  // never drift from each other or from the harness.
  const starterCode = starterCodeFor(value.signature);

  // The same validator the seed script and `yarn check:problems` use. It is the
  // one thing standing between a typo and a problem nobody can solve.
  const problems = validateProblem({
    slug: value.slug,
    signature: value.signature,
    points: value.points,
    timeLimitMs: value.timeLimitMs,
    starterCode,
    tests: value.tests,
  });
  if (problems.length > 0) {
    return { ok: false, errors: problems.map((line) => line.replace(`${value.slug}: `, "")) };
  }

  try {
    if (value.id) {
      await updateProblem(value.id, { ...value, starterCode });
    } else {
      await createProblem({ ...value, starterCode, setId: value.setId ?? null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("problems_slug_idx") || message.includes("duplicate key")) {
      return failed(`A problem with the URL name "${value.slug}" already exists.`);
    }
    return failed("Could not save that problem.");
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: value.id
      ? "Saved. Anyone with the problem open sees the change on their next run."
      : `Created. Put it in a set and activate that set to open it to participants. Starter code was generated for all ${LANGUAGES.length} languages.`,
  };
}

/**
 * Runs a reference solution against the author's own test cases, on the real
 * judge, before the problem is saved.
 *
 * Every serious problem-setting tool requires this: HackerRank will not publish
 * a question until an uploaded solution has been run against its tests, and
 * Polygon calls it verification. It is the only thing that catches a wrong
 * expected answer, which is the failure that takes out a whole problem
 * mid-event and looks like everybody's code is broken.
 */
export type VerifyResult =
  | { ok: true; passed: number; total: number; runtimeMs: number;
      tests: { index: number; passed: boolean; verdict: string; expected: string; actual: string; stderr: string }[] }
  | { ok: false; errors: string[] };

export async function verifySolution(input: {
  language: Language;
  source: string;
  signature: unknown;
  tests: { stdin: string; expectedStdout: string }[];
  timeLimitMs: number;
}): Promise<VerifyResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, errors: ["You are not signed in as an admin."] };
  }

  const shape = z.object({
    language: z.enum(LANGUAGES),
    source: z.string().min(1, "Paste a solution first.").max(MAX_SOURCE_BYTES),
    signature: signatureShape,
    tests: z.array(z.object({ stdin: z.string(), expectedStdout: z.string() })).min(1),
    timeLimitMs: z.number().int().min(500).max(7_000),
  });

  const parsed = shape.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
  }

  try {
    const result = await runTests({
      language: parsed.data.language,
      source: parsed.data.source,
      signature: parsed.data.signature,
      tests: parsed.data.tests,
      // The author wrote these tests; showing them their own data is the point.
      revealActual: true,
      timeLimitMs: parsed.data.timeLimitMs,
      memoryLimitKb: 131072,
    });

    return {
      ok: true,
      passed: result.passedCount,
      total: result.totalCount,
      runtimeMs: result.runtimeMs,
      tests: result.outcomes.map((outcome) => ({
        index: outcome.index,
        passed: outcome.passed,
        verdict: outcome.verdict,
        expected: parsed.data.tests[outcome.index]?.expectedStdout ?? "",
        actual: outcome.actual ?? "",
        stderr: outcome.stderr ?? "",
      })),
    };
  } catch {
    return { ok: false, errors: ["The judge could not be reached. Try again in a moment."] };
  }
}

