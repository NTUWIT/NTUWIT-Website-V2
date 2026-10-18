import "server-only";

import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, sql } from "drizzle-orm";

import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";
import type { SessionWindow } from "@/lib/session";
import { db } from "./client";
import {
  eventSessions,
  eventSettings,
  guests,
  problemSets,
  problems,
  runs,
  scores,
  submissions,
  testCases,
} from "./schema";

/** The only module that issues SQL. */

/**
 * What is live right now. Exactly one of a set or a single problem may be
 * active; both null means nothing is open. This is the single source of truth
 * for visibility and is re-checked in every judge route.
 */
export async function getActiveSelection() {
  const [row] = await db
    .select({ setId: eventSettings.activeSetId, problemId: eventSettings.activeProblemId })
    .from(eventSettings)
    .where(eq(eventSettings.id, 1))
    .limit(1);
  return { setId: row?.setId ?? null, problemId: row?.problemId ?? null };
}

/** Problems a participant may open. Empty when nothing is active. */
export async function listProblems() {
  const active = await getActiveSelection();
  if (!active.setId && !active.problemId) return [];

  return db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
      points: problems.points,
    })
    .from(problems)
    .where(
      and(
        isNull(problems.archivedAt),
        active.setId ? eq(problems.setId, active.setId) : eq(problems.id, active.problemId!),
      ),
    )
    .orderBy(asc(problems.order), asc(problems.title));
}

/**
 * The gate every judge route calls before running anything. A problem outside
 * the active selection is treated as if it does not exist, so a stale tab or a
 * hand-crafted request cannot reach another set's problems.
 */
export async function isProblemLive(problemId: string): Promise<boolean> {
  const active = await getActiveSelection();
  if (!active.setId && !active.problemId) return false;

  // Archived problems are never live, whatever the selection says.
  const [row] = await db
    .select({ id: problems.id })
    .from(problems)
    .where(
      and(
        eq(problems.id, problemId),
        isNull(problems.archivedAt),
        active.setId ? eq(problems.setId, active.setId) : eq(problems.id, active.problemId!),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** Admin view: drafts included, with the counts the console needs. */
export async function listAllProblems() {
  return db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
      points: problems.points,
      timeLimitMs: problems.timeLimitMs,
      setId: problems.setId,
      order: problems.order,
      archivedAt: problems.archivedAt,
      // The outer id is written out as "problems"."id" on purpose. Drizzle
      // renders ${problems.id} unqualified here, and inside a subquery a bare
      // "id" means the inner table's own id, so every count came out 0.
      // Submissions plus runs: above zero means the problem has history, so
      // the console offers Archive instead of Delete.
      attempts: sql<number>`(select count(*)::int from ${submissions} where ${submissions.problemId} = "problems"."id")
        + (select count(*)::int from ${runs} where ${runs.problemId} = "problems"."id")`,
      tests: sql<number>`(select count(*)::int from ${testCases} where ${testCases.problemId} = "problems"."id")`,
      samples: sql<number>`(select count(*)::int from ${testCases} where ${testCases.problemId} = "problems"."id" and ${testCases.isSample})`,
    })
    .from(problems)
    .orderBy(asc(problems.order), asc(problems.title));
}

export async function getProblemBySlug(slug: string) {
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.slug, slug))
    .limit(1);
  return problem ?? null;
}

export async function getProblemById(id: string) {
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, id))
    .limit(1);
  return problem ?? null;
}

/**
 * Sample tests only, safe to send to a client. Every client-bound payload
 * must come from here, never from `getAllTests`.
 */
export async function getSampleTests(problemId: string) {
  return db
    .select({
      stdin: testCases.stdin,
      expectedStdout: testCases.expectedStdout,
    })
    .from(testCases)
    .where(and(eq(testCases.problemId, problemId), eq(testCases.isSample, true)))
    .orderBy(asc(testCases.order));
}

/**
 * How many tests a problem has, and how many of them are shown.
 *
 * Counts only. A count carries no stdin, no expected output and no hint about
 * either, so unlike `getAllTests` this is safe to send to a participant, and it
 * is what lets the interface say that hidden tests exist before someone submits
 * and is surprised by them.
 */
export async function countTests(problemId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      samples: sql<number>`(count(*) filter (where ${testCases.isSample}))::int`,
    })
    .from(testCases)
    .where(eq(testCases.problemId, problemId));
  return { total: row?.total ?? 0, samples: row?.samples ?? 0 };
}

/** Server-only: includes hidden tests. Never serialise the result to a client. */
export async function getAllTests(problemId: string) {
  return db
    .select({
      stdin: testCases.stdin,
      expectedStdout: testCases.expectedStdout,
      isSample: testCases.isSample,
    })
    .from(testCases)
    .where(eq(testCases.problemId, problemId))
    .orderBy(asc(testCases.order));
}

export async function insertSubmission(row: {
  userId: string;
  problemId: string;
  language: Language;
  source: string;
  status: string;
  runtimeMs: number;
  passedCount: number;
  totalCount: number;
  score: number;
}) {
  const [inserted] = await db
    .insert(submissions)
    .values(row)
    .returning({ id: submissions.id });
  return inserted?.id ?? null;
}

/**
 * Idempotent best-score write. A single statement, so a replayed or concurrent
 * accepted submission cannot inflate a total, and `first_solved_at` is never
 * overwritten by a later solve.
 */
export async function upsertScore(args: {
  userId: string;
  problemId: string;
  score: number;
}) {
  await db
    .insert(scores)
    .values({
      userId: args.userId,
      problemId: args.problemId,
      bestScore: args.score,
    })
    .onConflictDoUpdate({
      target: [scores.userId, scores.problemId],
      set: { bestScore: sql`excluded.best_score` },
      setWhere: sql`excluded.best_score > ${scores.bestScore}`,
    });
}

/**
 * Ranking derived from `scores`, never recomputed over `submissions`.
 * Ties on total score are broken by the earliest solve.
 */
export async function getLeaderboard(limit = 100) {
  const total = sql<number>`sum(${scores.bestScore})::int`;
  const earliest = sql<string>`min(${scores.firstSolvedAt})`;
  return db
    .select({
      userId: scores.userId,
      totalScore: total,
      solved: sql<number>`count(*)::int`,
      firstSolvedAt: earliest,
    })
    .from(scores)
    .groupBy(scores.userId)
    .orderBy(desc(total), asc(earliest))
    .limit(limit);
}

/**
 * A participant's recent attempts at one problem, newest first. Reads only
 * their own rows, the caller passes the id from the Clerk session, never a
 * request body. Source is included so a past attempt can be restored.
 */
export async function listSubmissions(userId: string, problemId: string, limit = 20) {
  return db
    .select({
      id: submissions.id,
      language: submissions.language,
      source: submissions.source,
      status: submissions.status,
      runtimeMs: submissions.runtimeMs,
      passedCount: submissions.passedCount,
      totalCount: submissions.totalCount,
      score: submissions.score,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.problemId, problemId)))
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
}

/** The session window: the one read of the clock row. */
export async function getSessionWindow(): Promise<SessionWindow> {
  const [row] = await db
    .select({ startsAt: eventSettings.startsAt, endsAt: eventSettings.endsAt })
    .from(eventSettings)
    .where(eq(eventSettings.id, 1))
    .limit(1);
  return { startsAt: row?.startsAt ?? null, endsAt: row?.endsAt ?? null };
}

/** The end of the window alone. Null means no timed session is running, which
 *  is the normal state between Coding Nights. */
export const getEventEndsAt = async (): Promise<Date | null> => (await getSessionWindow()).endsAt;

/** The clock as the console renders it. Reading the wall clock belongs here
 *  rather than in a component body, where it counts as impure render. */
export async function getEventClock() {
  const endsAt = await getEventEndsAt();
  const running = endsAt !== null && endsAt.getTime() > Date.now();
  return {
    endsAt,
    running,
    remainingMinutes: running ? Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 60_000)) : 0,
  };
}

/**
 * Starts, extends, or clears the countdown without touching what is open.
 * Starting one opens the window now; clearing it removes the window entirely,
 * which returns the session to untimed rather than permanently ended.
 */
export async function setEventEndsAt(endsAt: Date | null) {
  const values = { startsAt: endsAt ? new Date() : null, endsAt };
  await db
    .insert(eventSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: eventSettings.id, set: values });
}

/**
 * Creates a problem and its test cases together. Both or neither: a problem
 * with no tests would accept any submission, so it must never exist even for a
 * moment.
 */
export async function createProblem(input: {
  setId: string | null;
  slug: string;
  title: string;
  difficulty: string;
  statementMd: string;
  signature: Signature;
  starterCode: Partial<Record<Language, string>>;
  points: number;
  timeLimitMs: number;
  memoryLimitKb: number;
  order: number;
  tests: { stdin: string; expectedStdout: string; isSample: boolean }[];
}) {
  // The neon-http driver has no interactive transactions, so the id is chosen
  // here and both inserts go in one batch, which Neon runs as a single
  // transaction. A problem without its tests still cannot exist.
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(problems).values({
      id,
      setId: input.setId,
        slug: input.slug,
        title: input.title,
        difficulty: input.difficulty,
        statementMd: input.statementMd,
        signature: input.signature,
        starterCode: input.starterCode,
        points: input.points,
        timeLimitMs: input.timeLimitMs,
        memoryLimitKb: input.memoryLimitKb,
        order: input.order,
    }),
    db.insert(testCases).values(input.tests.map((test, order) => ({ ...test, problemId: id, order }))),
  ]);
  return id;
}


/** Deletes a draft and its test cases. Submissions and runs cascade, so this
 *  refuses once anyone has submitted or run code against the problem: that
 *  history is kept forever. */
export async function deleteProblem(problemId: string) {
  const count = sql<number>`count(*)::int`;
  const [[submitted], [ran]] = await Promise.all([
    db.select({ count }).from(submissions).where(eq(submissions.problemId, problemId)),
    db.select({ count }).from(runs).where(eq(runs.problemId, problemId)),
  ]);
  if ((submitted?.count ?? 0) + (ran?.count ?? 0) > 0) throw new Error("HAS_SUBMISSIONS");
  await db.delete(problems).where(eq(problems.id, problemId));
}

/* ---------- problem sets ---------- */

export async function listSets() {
  return db
    .select({
      id: problemSets.id,
      name: problemSets.name,
      description: problemSets.description,
      order: problemSets.order,
      // count(problems.id) rather than count(*): a left join produces one row
      // for an empty set, and count(*) would report it as holding one problem.
      problems: sql<number>`count(${problems.id})::int`,
    })
    .from(problemSets)
    .leftJoin(problems, eq(problems.setId, problemSets.id))
    .groupBy(problemSets.id)
    .orderBy(asc(problemSets.order), asc(problemSets.name));
}

export async function createSet(name: string, description: string | null, order: number) {
  const [row] = await db
    .insert(problemSets)
    .values({ name, description, order })
    .returning({ id: problemSets.id });
  return row?.id ?? null;
}

/** Deleting a set leaves its problems intact and unassigned. */
export async function deleteSet(setId: string) {
  await db.delete(problemSets).where(eq(problemSets.id, setId));
}

/**
 * Hides a problem from the console and participants without touching its
 * submissions or runs. It leaves its set, so unarchiving returns it to Not in
 * a set rather than silently back into whatever set is open.
 */
export async function archiveProblem(problemId: string) {
  await db.update(problems).set({ archivedAt: new Date(), setId: null }).where(eq(problems.id, problemId));
}

export async function unarchiveProblem(problemId: string) {
  await db.update(problems).set({ archivedAt: null }).where(eq(problems.id, problemId));
}

/** Moves a problem into a set (at the end of it), or out of every set when given null. */
export async function assignProblemToSet(problemId: string, setId: string | null) {
  if (!setId) {
    await db.update(problems).set({ setId }).where(eq(problems.id, problemId));
    return;
  }
  await db
    .update(problems)
    .set({
      setId,
      order: sql`(select coalesce(max(${problems.order}), -1) + 1 from ${problems} where ${problems.setId} = ${setId})`,
    })
    .where(eq(problems.id, problemId));
}

export async function getSet(setId: string) {
  const [set] = await db.select().from(problemSets).where(eq(problemSets.id, setId)).limit(1);
  return set ?? null;
}

export async function updateSet(setId: string, name: string, description: string | null) {
  await db.update(problemSets).set({ name, description }).where(eq(problemSets.id, setId));
}

/** The set's problem ids in their current order. */
export async function listSetProblemIds(setId: string): Promise<string[]> {
  const rows = await db
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.setId, setId))
    .orderBy(asc(problems.order), asc(problems.title));
  return rows.map((row) => row.id);
}

/** Writes order = position for every problem in the set, as one transaction. */
export async function setProblemOrder(setId: string, orderedIds: string[]) {
  if (orderedIds.length === 0) return;
  const [first, ...rest] = orderedIds.map((id, order) =>
    db.update(problems).set({ order }).where(and(eq(problems.id, id), eq(problems.setId, setId))),
  );
  await db.batch([first!, ...rest]);
}

/**
 * Activates a set or a single problem, never both. Passing two nulls closes
 * everything, which is how a night ends.
 */
export async function setActiveSelection(args: {
  setId: string | null;
  problemId: string | null;
  endsAt: Date | null;
}) {
  const values = {
    id: 1,
    activeSetId: args.setId,
    activeProblemId: args.setId ? null : args.problemId,
    // A timer implies a window; without one there is nothing to start.
    startsAt: args.endsAt ? new Date() : null,
    endsAt: args.endsAt,
  };
  await db
    .insert(eventSettings)
    .values(values)
    .onConflictDoUpdate({ target: eventSettings.id, set: values });
}

/* ---------- editing an existing problem ---------- */

/** Everything the wizard needs to reopen a problem. */
export async function getProblemForEdit(problemId: string) {
  const [problem] = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem) return null;
  const tests = await db
    .select({
      stdin: testCases.stdin,
      expectedStdout: testCases.expectedStdout,
      isSample: testCases.isSample,
    })
    .from(testCases)
    .where(eq(testCases.problemId, problemId))
    .orderBy(asc(testCases.order));
  return { problem, tests };
}

/**
 * Replaces a problem and its test cases in one transaction. Test cases are
 * replaced wholesale rather than diffed: they are a small list, and a partial
 * update is how a problem ends up half-edited mid-event.
 */
export async function updateProblem(
  problemId: string,
  input: {
    slug: string;
    title: string;
    difficulty: string;
    statementMd: string;
    signature: Signature;
    starterCode: Partial<Record<Language, string>>;
    points: number;
    timeLimitMs: number;
    memoryLimitKb: number;
    order: number;
    tests: { stdin: string; expectedStdout: string; isSample: boolean }[];
  },
) {
  // One batch, which Neon runs as a single transaction: the neon-http driver
  // has no interactive transactions.
  const { tests, ...fields } = input;
  await db.batch([
    db.update(problems).set(fields).where(eq(problems.id, problemId)),
    db.delete(testCases).where(eq(testCases.problemId, problemId)),
    db.insert(testCases).values(tests.map((test, order) => ({ ...test, problemId, order }))),
  ]);
}

/** How many attempts exist, so the console can warn before an edit or delete. */
export async function countSubmissions(problemId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(eq(submissions.problemId, problemId));
  return row?.count ?? 0;
}

/* ---------- runs, sessions and results ---------- */

export async function insertRun(row: {
  userId: string;
  problemId: string;
  language: Language;
  status: string;
  passedCount: number;
  totalCount: number;
}) {
  await db.insert(runs).values(row);
}

/** Records a timed session when its timer starts. */
export async function insertSession(label: string, startsAt: Date, endsAt: Date) {
  await db.insert(eventSessions).values({ label, startsAt, endsAt });
}

/** A timer cleared or a session ended early: the running session ends now. */
export async function closeRunningSessions(now: Date) {
  await db
    .update(eventSessions)
    .set({ endsAt: now })
    .where(and(lt(eventSessions.startsAt, now), gt(eventSessions.endsAt, now)));
}

export async function listSessions(limit = 50) {
  return db.select().from(eventSessions).orderBy(desc(eventSessions.startsAt)).limit(limit);
}

/** Every submission in [from, to), without source: the results page needs timing and outcome only. */
export async function listSubmissionsBetween(from: Date, to: Date) {
  return db
    .select({
      id: submissions.id,
      userId: submissions.userId,
      problemId: submissions.problemId,
      language: submissions.language,
      status: submissions.status,
      passedCount: submissions.passedCount,
      totalCount: submissions.totalCount,
      score: submissions.score,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(and(gte(submissions.createdAt, from), lt(submissions.createdAt, to)))
    .orderBy(asc(submissions.createdAt));
}

export async function listRunsBetween(from: Date, to: Date) {
  return db
    .select({
      id: runs.id,
      userId: runs.userId,
      problemId: runs.problemId,
      language: runs.language,
      status: runs.status,
      passedCount: runs.passedCount,
      totalCount: runs.totalCount,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(and(gte(runs.createdAt, from), lt(runs.createdAt, to)))
    .orderBy(asc(runs.createdAt));
}

/* ---------- guests ---------- */

export async function insertGuest(id: string, displayName: string) {
  await db.insert(guests).values({ id, displayName });
}

export async function renameGuest(id: string, displayName: string) {
  await db.update(guests).set({ displayName }).where(eq(guests.id, id));
}

export async function getGuestNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const rows = await db
    .select({ id: guests.id, displayName: guests.displayName })
    .from(guests)
    .where(inArray(guests.id, ids));
  for (const row of rows) names.set(row.id, row.displayName);
  return names;
}
