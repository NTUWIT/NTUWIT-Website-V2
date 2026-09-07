"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import {
  assignProblemToSet,
  countSubmissions,
  createProblem,
  createSet,
  deleteProblem,
  deleteSet,
  renameSet,
  setActiveSelection,
  setEventEndsAt,
  updateProblem,
} from "@/lib/db/queries";
import { LANGUAGES } from "@/lib/languages";
import { PARAM_TYPES } from "@/lib/problems/signature";
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

export async function startEvent(minutes: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
    return failed("Length must be between 1 minute and 24 hours.");
  }

  const endsAt = new Date(Date.now() + minutes * 60_000);
  await setEventEndsAt(endsAt);
  revalidatePath("/", "layout");
  return { ok: true, message: `Countdown running until ${endsAt.toLocaleTimeString()}.` };
}

export async function stopEvent(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await setEventEndsAt(null);
  revalidatePath("/", "layout");
  return { ok: true, message: "Countdown cleared." };
}

/* ---------- sets and activation ---------- */

export async function addSet(name: string, description: string, order: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (name.trim().length < 2) return failed("Give the set a name.");

  await createSet(name.trim(), description.trim() || null, order);
  revalidatePath("/admin");
  return { ok: true, message: `Created "${name.trim()}".` };
}

export async function editSet(setId: string, name: string, description: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (name.trim().length < 2) return failed("Give the set a name.");

  await renameSet(setId, name.trim(), description.trim() || null);
  revalidatePath("/admin");
  return { ok: true, message: "Set updated." };
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

  await setActiveSelection({
    setId,
    problemId,
    endsAt: minutes === null ? null : new Date(Date.now() + minutes * 60_000),
  });

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: minutes === null ? "Live now, with no timer." : `Live now for ${minutes} minutes.`,
  };
}

/** Closes everything. Scores already earned are untouched. */
export async function deactivateAll(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  await setActiveSelection({ setId: null, problemId: null, endsAt: null });
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
        "Somebody has already submitted to this problem, so deleting it would delete their attempts. Move it out of the active set instead.",
      );
    }
    return failed("Could not delete that problem.");
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Problem deleted." };
}

/* ---------- authoring ---------- */

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
  signature: z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]*$/, "The function name must be snake_case."),
    params: z
      .array(
        z.object({
          name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Parameter names must be snake_case."),
          type: z.enum(PARAM_TYPES),
        }),
      )
      .max(8),
    returns: z.enum(PARAM_TYPES),
  }),
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

/** How many attempts a problem already has, so the console can warn first. */
export async function attemptsFor(problemId: string): Promise<number> {
  try {
    await requireAdmin();
  } catch {
    return 0;
  }
  return countSubmissions(problemId);
}
