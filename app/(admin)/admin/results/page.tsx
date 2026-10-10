import Link from "next/link";

import { ResultsView, type ResultsData } from "@/components/admin/ResultsView";
import { ChevronIcon } from "@/components/ide/icons";
import {
  listAllProblems,
  listRunsBetween,
  listSessions,
  listSubmissionsBetween,
} from "@/lib/db/queries";
import { rankParticipants, summarise, type Attempt } from "@/lib/results";
import { describeParticipants } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = { title: "Results | Console" };

/** A custom window is capped so one click cannot pull the whole history at once. */
const MAX_RANGE_MS = 7 * 24 * 60 * 60_000;

/** Reading the wall clock belongs outside a component body. */
const isStillRunning = (endsAt: Date) => endsAt.getTime() > Date.now();

const parseDate = (value: string | string[] | undefined) => {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Before migration 0006 the sessions table does not exist yet.
  const sessions = await listSessions().catch(() => null);
  if (!sessions) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
        >
          <ChevronIcon className="h-3 w-3 rotate-180" />
          Console
        </Link>
        <h1 className="mt-6 font-ide-display text-3xl font-semibold tracking-tight sm:text-4xl">Results</h1>
        <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
          Results are not set up on this database yet. Ask the WIT team to run{" "}
          <code className="font-mono text-ide-ink">yarn db:migrate</code>.
        </p>
      </div>
    );
  }

  // A custom range wins; then a chosen session; then the most recent one.
  const from = parseDate(params.from);
  const to = parseDate(params.to);
  const custom = from && to && to > from && to.getTime() - from.getTime() <= MAX_RANGE_MS;
  const chosen = custom
    ? null
    : (sessions.find((s) => s.id === params.session) ?? sessions[0] ?? null);
  const window = custom
    ? { label: "Custom range", startsAt: from!, endsAt: to! }
    : chosen;

  const header = (
    <>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
      >
        <ChevronIcon className="h-3 w-3 rotate-180" />
        Console
      </Link>
      <h1 className="mt-6 font-ide-display text-3xl font-semibold tracking-tight sm:text-4xl">Results</h1>
    </>
  );

  let data: ResultsData | null = null;
  if (window) {
    const [submitted, ran, problems] = await Promise.all([
      listSubmissionsBetween(window.startsAt, window.endsAt),
      listRunsBetween(window.startsAt, window.endsAt),
      listAllProblems(),
    ]);
    const attempts: Attempt[] = [
      ...submitted.map((s) => ({ ...s, kind: "submit" as const })),
      ...ran.map((r) => ({ ...r, kind: "run" as const, score: 0 })),
    ];
    const rows = rankParticipants(summarise(attempts, window.startsAt));
    const people = await describeParticipants(rows.map((row) => row.userId));

    // Columns: every problem anyone touched in the window, in library order.
    const touched = new Set(attempts.map((a) => a.problemId));
    data = {
      label: window.label,
      startsAt: window.startsAt.toISOString(),
      endsAt: window.endsAt.toISOString(),
      // Standings are final only once the window has closed.
      provisional: isStillRunning(window.endsAt),
      problems: problems
        .filter((p) => touched.has(p.id))
        .map((p) => ({ id: p.id, title: p.title, points: p.points })),
      rows: rows.map((row) => ({
        userId: row.userId,
        name: people.get(row.userId)?.name ?? "Unknown participant",
        account: people.get(row.userId)?.account ?? row.userId,
        rank: row.rank,
        tied: row.tied,
        score: row.score,
        problems: Object.fromEntries(
          Object.entries(row.problems).map(([id, p]) => [
            id,
            { ...p, bestAt: p.bestAt ? p.bestAt.toISOString() : null },
          ]),
        ),
        testsPassed: row.testsPassed,
        testsTotal: row.testsTotal,
        solved: row.solved,
        timeTakenMs: row.timeTakenMs,
        submissions: row.submissions,
        runs: row.runs,
        timeline: row.timeline.map((a) => ({
          id: a.id,
          kind: a.kind,
          problemId: a.problemId,
          language: a.language,
          status: a.status,
          passedCount: a.passedCount,
          totalCount: a.totalCount,
          at: a.createdAt.toISOString(),
        })),
      })),
    };
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {header}
      <ResultsView
        sessions={sessions.map((s) => ({
          id: s.id,
          label: s.label,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
        }))}
        selectedSessionId={chosen?.id ?? null}
        data={data}
      />
    </div>
  );
}
