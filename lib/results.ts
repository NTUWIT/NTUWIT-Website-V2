/**
 * A session's results, as a pure function of its submissions and runs.
 *
 * Kept free of imports, like lib/session.ts, so every number the results page
 * shows is asserted directly by scripts/check-results.ts.
 */

export type Attempt = {
  id: string;
  kind: "submit" | "run";
  userId: string;
  problemId: string;
  language: string;
  status: string;
  passedCount: number;
  totalCount: number;
  /** Points the judge awarded this submission (partial credit). Always 0 for a run. */
  score: number;
  createdAt: Date;
};

export type ProblemResult = {
  /** Highest score of any one submission. Runs never count. */
  bestScore: number;
  /** Tests passed by that best submission. */
  bestPassed: number;
  /** Test count of that best submission; 0 if nothing was submitted. */
  total: number;
  solved: boolean;
  /** When the best was first reached. A later equal score does not move it. */
  bestAt: Date | null;
  submissions: number;
  runs: number;
};

export type ParticipantResult = {
  userId: string;
  problems: Record<string, ProblemResult>;
  /** Sum of the best score on each problem: what the ranking uses first. */
  score: number;
  testsPassed: number;
  testsTotal: number;
  solved: number;
  /** Session start to the moment the final result was reached; null with no submissions. */
  timeTakenMs: number | null;
  submissions: number;
  runs: number;
  firstAt: Date;
  lastAt: Date;
  /** Every submission and run, oldest first. */
  timeline: Attempt[];
};

const time = (value: Date | string) => new Date(value).getTime();

export function summarise(attempts: Attempt[], startedAt: Date): ParticipantResult[] {
  // Oldest first, with a stable tie-break, so "first reached" is well defined
  // and the output does not depend on input order.
  const sorted = attempts
    .map((attempt) => ({ ...attempt, createdAt: new Date(attempt.createdAt) }))
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id),
    );

  const byUser = new Map<string, Attempt[]>();
  for (const attempt of sorted) {
    const list = byUser.get(attempt.userId) ?? [];
    list.push(attempt);
    byUser.set(attempt.userId, list);
  }

  const rows: ParticipantResult[] = [];
  for (const [userId, timeline] of byUser) {
    const problems: Record<string, ProblemResult> = {};
    for (const attempt of timeline) {
      const result = (problems[attempt.problemId] ??= {
        bestScore: 0,
        bestPassed: 0,
        total: 0,
        solved: false,
        bestAt: null,
        submissions: 0,
        runs: 0,
      });
      if (attempt.kind === "run") {
        result.runs += 1;
        continue;
      }
      result.submissions += 1;
      // Better means a higher score, or the same score with more tests passed
      // (rounding can make those equal). Strictly better only, so a tie keeps
      // the earliest submission and its time.
      const better =
        result.bestAt === null ||
        attempt.score > result.bestScore ||
        (attempt.score === result.bestScore && attempt.passedCount > result.bestPassed);
      if (better) {
        result.bestScore = attempt.score;
        result.bestPassed = attempt.passedCount;
        result.total = attempt.totalCount;
        result.bestAt = attempt.createdAt;
      }
      result.solved = result.total > 0 && result.bestPassed === result.total;
    }

    const results = Object.values(problems);
    const reached = results.flatMap((r) => (r.bestAt ? [r.bestAt.getTime()] : []));
    rows.push({
      userId,
      problems,
      score: results.reduce((sum, r) => sum + r.bestScore, 0),
      testsPassed: results.reduce((sum, r) => sum + r.bestPassed, 0),
      testsTotal: results.reduce((sum, r) => sum + r.total, 0),
      solved: results.filter((r) => r.solved).length,
      timeTakenMs: reached.length ? Math.max(0, Math.max(...reached) - time(startedAt)) : null,
      submissions: results.reduce((sum, r) => sum + r.submissions, 0),
      runs: results.reduce((sum, r) => sum + r.runs, 0),
      firstAt: timeline[0]!.createdAt,
      lastAt: timeline.at(-1)!.createdAt,
      timeline,
    });
  }

  return rows.sort((a, b) => a.userId.localeCompare(b.userId));
}

export type RankedParticipant = ParticipantResult & {
  /** 1-based, shared on an exact tie (1, 2, 2, 4). Null for anyone with no points. */
  rank: number | null;
  /** True when someone else has exactly the same score and time. */
  tied: boolean;
};

/**
 * The order prizes are awarded in:
 *   1. higher total score;
 *   2. then earlier time taken (when the final score was reached), to the ms;
 *   3. still equal: the same rank, flagged as tied for organisers to decide.
 * Nobody with zero points is ranked; they follow, by user id.
 */
export function rankParticipants(rows: ParticipantResult[]): RankedParticipant[] {
  const scored = rows.filter((r) => r.score > 0);
  const unscored = rows.filter((r) => r.score <= 0).sort((a, b) => a.userId.localeCompare(b.userId));
  const compare = (a: ParticipantResult, b: ParticipantResult) =>
    b.score - a.score || (a.timeTakenMs ?? Infinity) - (b.timeTakenMs ?? Infinity);
  const sorted = [...scored].sort((a, b) => compare(a, b) || a.userId.localeCompare(b.userId));

  const ranked: RankedParticipant[] = sorted.map((row, index) => {
    let first = index;
    while (first > 0 && compare(sorted[first - 1]!, row) === 0) first--;
    const tied =
      (index > 0 && compare(sorted[index - 1]!, row) === 0) ||
      (index < sorted.length - 1 && compare(sorted[index + 1]!, row) === 0);
    return { ...row, rank: first + 1, tied };
  });
  return [...ranked, ...unscored.map((row) => ({ ...row, rank: null, tied: false }))];
}
