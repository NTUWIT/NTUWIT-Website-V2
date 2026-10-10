"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useSyncExternalStore } from "react";

import { ChevronIcon } from "@/components/ide/icons";
import { Mark, Panel, SecondaryButton, type Tone } from "@/components/ide/primitives";

type Session = { id: string; label: string; startsAt: string; endsAt: string };
type ProblemCell = {
  bestScore: number;
  bestPassed: number;
  total: number;
  solved: boolean;
  bestAt: string | null;
  submissions: number;
  runs: number;
};
type Event = {
  id: string;
  kind: "submit" | "run";
  problemId: string;
  language: string;
  status: string;
  passedCount: number;
  totalCount: number;
  at: string;
};
type Row = {
  userId: string;
  name: string;
  account: string;
  rank: number | null;
  tied: boolean;
  score: number;
  problems: Record<string, ProblemCell>;
  testsPassed: number;
  testsTotal: number;
  solved: number;
  timeTakenMs: number | null;
  submissions: number;
  runs: number;
  timeline: Event[];
};
export type ResultsData = {
  label: string;
  startsAt: string;
  endsAt: string;
  provisional: boolean;
  problems: { id: string; title: string; points: number }[];
  /** Already ranked: scored participants in rank order, then everyone else. */
  rows: Row[];
};

type SortKey = "rank" | "name" | "tests" | "time" | "submissions" | "runs";

const VERDICT: Record<string, { word: string; tone: Tone }> = {
  accepted: { word: "Accepted", tone: "pass" },
  wrong_answer: { word: "Wrong answer", tone: "fail" },
  runtime_error: { word: "Runtime error", tone: "fail" },
  compile_error: { word: "Compilation error", tone: "fail" },
  time_limit_exceeded: { word: "Time limit exceeded", tone: "warn" },
};
const verdict = (status: string) => VERDICT[status] ?? { word: status.replace(/_/g, " "), tone: "quiet" as Tone };

const LANGUAGE: Record<string, string> = { python: "Python", javascript: "JavaScript", java: "Java", cpp: "C++" };

/** 1:05:09 or 12:04, always with seconds: these are compared down to the second. */
function duration(ms: number) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const sessionText = (s: { label: string; startsAt: string; endsAt: string }) =>
  `${s.label} · ${day(s.startsAt)}, ${new Date(s.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${new Date(s.endsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

/** `<input type="datetime-local">` speaks local time without a zone. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const noop = () => () => {};

/**
 * Every time on this page is shown in the organiser's own time zone, which the
 * server (UTC on Vercel) cannot know. Rendering only in the browser avoids a
 * hydration mismatch and a flash of UTC times.
 */
export function ResultsView(props: {
  sessions: Session[];
  selectedSessionId: string | null;
  data: ResultsData | null;
}) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!inBrowser) return <p className="mt-8 text-sm text-ide-ink-3">Loading results…</p>;
  return <ResultsBody {...props} />;
}

function ResultsBody({
  sessions,
  selectedSessionId,
  data,
}: {
  sessions: Session[];
  selectedSessionId: string | null;
  data: ResultsData | null;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>({ key: "rank", desc: false });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(data ? toLocalInput(data.startsAt) : "");
  const [to, setTo] = useState(data ? toLocalInput(data.endsAt) : "");

  const titles = useMemo(() => new Map(data?.problems.map((p) => [p.id, p.title]) ?? []), [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.rows.filter((r) => r.name.toLowerCase().includes(q) || r.account.toLowerCase().includes(q))
      : data.rows;
    const value = (r: Row): number | string => {
      switch (sort.key) {
        case "rank":
          // Unranked always last; the server's order already breaks ties.
          return r.rank ?? (sort.desc ? -1 : Number.MAX_SAFE_INTEGER);
        case "name":
          return r.name.toLowerCase();
        case "tests":
          return r.testsPassed;
        case "time":
          // Nobody-submitted sorts last in either direction.
          return r.timeTakenMs ?? (sort.desc ? -1 : Number.MAX_SAFE_INTEGER);
        case "submissions":
          return r.submissions;
        case "runs":
          return r.runs;
      }
    };
    const serverOrder = new Map(data.rows.map((r, i) => [r.userId, i]));
    return [...filtered].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      const cmp = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
      return (
        (sort.desc ? -cmp : cmp) ||
        (sort.key === "rank" ? serverOrder.get(a.userId)! - serverOrder.get(b.userId)! : a.name.localeCompare(b.name))
      );
    });
  }, [data, query, sort]);

  const toggle = (userId: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  const downloadCsv = () => {
    if (!data) return;
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = [
      "Rank",
      "Tied",
      "Name",
      "Account",
      ...data.problems.map((p) => `${p.title} (tests passed)`),
      "Score",
      "Tests passed",
      "Tests total",
      "Problems solved",
      "Time taken",
      "Submissions",
      "Runs",
    ];
    const lines = rows.map((r) => [
      r.rank ?? "",
      r.tied ? "yes" : "",
      r.name,
      r.account,
      ...data.problems.map((p) => {
        const cell = r.problems[p.id];
        return cell && cell.submissions > 0 ? `${cell.bestPassed}/${cell.total}` : "";
      }),
      r.score,
      r.testsPassed,
      r.testsTotal,
      r.solved,
      r.timeTakenMs === null ? "" : duration(r.timeTakenMs),
      r.submissions,
      r.runs,
    ]);
    const activity = [
      ["Name", "Account", "Time", "Kind", "Problem", "Language", "Result", "Tests passed", "Tests total"],
      ...rows.flatMap((r) =>
        r.timeline.map((e) => [
          r.name,
          r.account,
          new Date(e.at).toLocaleString(),
          e.kind === "submit" ? "Submit" : "Run",
          titles.get(e.problemId) ?? e.problemId,
          LANGUAGE[e.language] ?? e.language,
          verdict(e.status).word,
          e.passedCount,
          e.totalCount,
        ]),
      ),
    ];
    const csv = [header, ...lines, [], ["Activity"], ...activity]
      .map((line) => line.map(quote).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `results-${data.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${data.startsAt.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Which session */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {sessions.length > 0 && (
          <label className="min-w-0 flex-1 sm:max-w-md">
            <span className="block text-xs text-ide-ink-3">Session</span>
            <select
              value={selectedSessionId ?? ""}
              onChange={(event) => router.push(`/admin/results?session=${event.target.value}`)}
              className="mt-1 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 text-sm text-ide-ink outline-none"
            >
              {selectedSessionId === null && <option value="">Custom range</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {sessionText(s)}
                </option>
              ))}
            </select>
          </label>
        )}

        <details className="text-sm" open={sessions.length === 0}>
          <summary className="cursor-pointer select-none py-2.5 text-ide-ink-3 hover:text-ide-ink">
            Custom time range
          </summary>
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!from || !to) return;
              // Converted here, in the organiser's own time zone; the server runs in UTC.
              const params = new URLSearchParams({
                from: new Date(from).toISOString(),
                to: new Date(to).toISOString(),
              });
              router.push(`/admin/results?${params}`);
            }}
          >
            <label>
              <span className="block text-xs text-ide-ink-3">From</span>
              <input
                type="datetime-local"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="tnum mt-1 rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none"
              />
            </label>
            <label>
              <span className="block text-xs text-ide-ink-3">To</span>
              <input
                type="datetime-local"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="tnum mt-1 rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none"
              />
            </label>
            <SecondaryButton type="submit" disabled={!from || !to || from >= to}>
              Show
            </SecondaryButton>
          </form>
        </details>
      </div>

      {!data ? (
        <div className="mt-8 rounded-panel bg-ide-panel px-6 py-12 text-center shadow-ide-panel">
          <p className="font-ide-display text-xl font-semibold">No sessions yet</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm leading-relaxed text-ide-ink-2">
            A session is recorded each time you open a set with a timer. Its results
            appear here as soon as people start running and submitting. For anything
            run without a timer, use a custom time range.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="tnum text-sm text-ide-ink-2">
              <span className="font-medium text-ide-ink">{data.label}</span> · {day(data.startsAt)},{" "}
              {clock(data.startsAt)} to {clock(data.endsAt)} ·{" "}
              {duration(new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime())} long
            </p>
            <p className="tnum text-sm text-ide-ink-3">
              {data.rows.length} participant{data.rows.length === 1 ? "" : "s"} ·{" "}
              {data.rows.reduce((n, r) => n + r.submissions, 0)} submissions ·{" "}
              {data.rows.reduce((n, r) => n + r.runs, 0)} runs
            </p>
            {data.rows.length > 0 && (
              <SecondaryButton onClick={downloadCsv} className="sm:ml-auto">
                Download CSV
              </SecondaryButton>
            )}
          </div>

          {data.rows.length > 0 && <Podium rows={data.rows} provisional={data.provisional} />}

          {data.rows.length === 0 ? (
            <div className="mt-4 rounded-panel bg-ide-panel px-6 py-12 text-center shadow-ide-panel">
              <p className="font-ide-display text-xl font-semibold">No activity in this window</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed text-ide-ink-2">
                Nobody ran or submitted code between these times.
              </p>
            </div>
          ) : (
            <>
              <label className="mt-4 block max-w-xs">
                <span className="sr-only">Find a participant</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find by name or email"
                  className="w-full rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
                />
              </label>

              <Panel className="mt-3">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead className="text-xs text-ide-ink-3">
                      <tr className="border-b border-ide-hairline">
                        <SortHeader sort={sort} onSort={setSort} k="rank" className="pl-5">Rank</SortHeader>
                        <SortHeader sort={sort} onSort={setSort} k="name" className="sticky left-0 bg-ide-panel">Participant</SortHeader>
                        {data.problems.map((p, index) => (
                          <th key={p.id} scope="col" className="px-3 py-3 font-medium" title={p.title}>
                            <span className="block max-w-28 truncate">
                              <span className="tnum">{index + 1}.</span> {p.title}
                            </span>
                          </th>
                        ))}
                        <SortHeader sort={sort} onSort={setSort} k="tests" className="text-right">Score</SortHeader>
                        <th scope="col" className="px-3 py-3 text-right font-medium">Tests passed</th>
                        <SortHeader sort={sort} onSort={setSort} k="time" className="text-right">Time taken</SortHeader>
                        <SortHeader sort={sort} onSort={setSort} k="submissions" className="text-right">Submissions</SortHeader>
                        <SortHeader sort={sort} onSort={setSort} k="runs" className="pr-5 text-right">Runs</SortHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ide-hairline">
                      {rows.map((row) => {
                        const expanded = open.has(row.userId);
                        return (
                          <Fragment key={row.userId}>
                            <tr className="group align-top transition hover:bg-ide-panel-2">
                              <td className="tnum py-3 pr-1 pl-5 font-ide-display text-base font-semibold text-ide-ink">
                                {row.rank ?? <span className="font-sans text-xs font-normal text-ide-ink-3">–</span>}
                                {row.tied && <span className="block font-sans text-xs font-normal text-ide-warn">Tied</span>}
                              </td>
                              <th scope="row" className="sticky left-0 bg-ide-panel py-0 pl-2 font-normal transition group-hover:bg-ide-panel-2">
                                <button
                                  type="button"
                                  onClick={() => toggle(row.userId)}
                                  aria-expanded={expanded}
                                  className="flex w-full items-start gap-2 rounded-control px-1 py-3 text-left"
                                >
                                  <ChevronIcon
                                    className={`mt-1 h-3 w-3 shrink-0 text-ide-ink-3 transition ${expanded ? "rotate-90" : ""}`}
                                  />
                                  <span className="min-w-0">
                                    <span className="block max-w-56 truncate font-medium text-ide-ink">{row.name}</span>
                                    <span className="block max-w-56 truncate text-xs text-ide-ink-3">{row.account}</span>
                                  </span>
                                </button>
                              </th>
                              {data.problems.map((p) => (
                                <td key={p.id} className="px-3 py-3">
                                  <Cell cell={row.problems[p.id]} startsAt={data.startsAt} />
                                </td>
                              ))}
                              <td className="tnum px-3 py-3 text-right font-medium text-ide-ink">{row.score}</td>
                              <td className="tnum px-3 py-3 text-right">
                                <span className="text-ide-ink-2">{row.testsPassed}</span>
                                <span className="text-ide-ink-3"> / {row.testsTotal}</span>
                              </td>
                              <td className="tnum px-3 py-3 text-right text-ide-ink-2">
                                {row.timeTakenMs === null ? <span className="text-ide-ink-3">No submission</span> : duration(row.timeTakenMs)}
                              </td>
                              <td className="tnum px-3 py-3 text-right text-ide-ink-2">{row.submissions}</td>
                              <td className="tnum py-3 pr-5 pl-3 text-right text-ide-ink-2">{row.runs}</td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={data.problems.length + 7} className="bg-ide-panel-2 px-5 py-4">
                                  <Timeline events={row.timeline} startsAt={data.startsAt} titles={titles} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-ide-ink-3">
                Each problem shows its best submission: the highest score, which is points
                scaled by tests passed. Runs never count. Time taken runs from the session start
                to the submission that reached the participant&apos;s final score. Select a name to
                see every run and submission.
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}

type Sort = { key: SortKey; desc: boolean };

function SortHeader({
  k,
  sort,
  onSort,
  children,
  className = "",
}: {
  k: SortKey;
  sort: Sort;
  onSort: (update: (current: Sort) => Sort) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={sort.key === k ? (sort.desc ? "descending" : "ascending") : "none"}
      className={`px-3 py-3 font-medium ${className}`}
    >
      {/* Names and times start ascending; counts start with the most first. */}
      <button
        type="button"
        onClick={() => onSort((s) => ({ key: k, desc: s.key === k ? !s.desc : k !== "name" && k !== "time" }))}
        className={`inline-flex items-center gap-1 rounded-control transition hover:text-ide-ink ${sort.key === k ? "text-ide-ink" : ""}`}
      >
        {children}
        {sort.key === k && <ChevronIcon className={`h-3 w-3 ${sort.desc ? "rotate-90" : "-rotate-90"}`} />}
      </button>
    </th>
  );
}

const ORDINAL = ["1st", "2nd", "3rd"];

/**
 * The top three, for awarding. Ties are shown as ties rather than broken
 * arbitrarily: two people at rank 2 both appear as "Tied 2nd", and the next
 * place shown is 4th's turn, not 3rd's.
 */
function Podium({ rows, provisional }: { rows: Row[]; provisional: boolean }) {
  const top = rows.filter((r) => r.rank !== null && r.rank <= 3);
  return (
    <section aria-labelledby="podium-heading" className="mt-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 id="podium-heading" className="font-ide-display text-xl font-semibold tracking-tight">
          Top 3
        </h2>
        {provisional ? (
          <Mark tone="warn">Session still running. These standings are provisional.</Mark>
        ) : (
          <Mark tone="pass">Final. The session has ended.</Mark>
        )}
      </div>
      {top.length === 0 ? (
        <p className="mt-3 text-sm text-ide-ink-2">Nobody has scored yet.</p>
      ) : (
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {top.map((r) => (
            <li key={r.userId}>
              <Panel className="h-full px-5 py-4">
                <p className="flex items-baseline gap-2">
                  <span className="font-ide-display text-3xl font-semibold tracking-tight">
                    {ORDINAL[r.rank! - 1]}
                  </span>
                  {r.tied && <span className="text-sm font-medium text-ide-warn">Tied</span>}
                </p>
                <p className="mt-2 truncate text-lg font-semibold text-ide-ink">{r.name}</p>
                <p className="truncate text-xs text-ide-ink-3">{r.account}</p>
                <dl className="tnum mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-ide-ink-3">Score</dt>
                    <dd className="font-medium text-ide-ink">{r.score}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ide-ink-3">Time taken</dt>
                    <dd className="font-medium text-ide-ink">{r.timeTakenMs === null ? "–" : duration(r.timeTakenMs)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ide-ink-3">Problems solved</dt>
                    <dd className="text-ide-ink-2">{r.solved}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ide-ink-3">Tests passed</dt>
                    <dd className="text-ide-ink-2">
                      {r.testsPassed} / {r.testsTotal}
                    </dd>
                  </div>
                </dl>
              </Panel>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 max-w-[72ch] text-xs leading-relaxed text-ide-ink-3">
        Ranked by total score, then by who reached it first (to the millisecond). Exactly equal
        score and time share a place and are marked Tied. Anyone with no points is not ranked.
      </p>
    </section>
  );
}

function Cell({ cell, startsAt }: { cell: ProblemCell | undefined; startsAt: string }) {
  if (!cell || cell.submissions === 0) {
    return (
      <span className="whitespace-nowrap text-xs text-ide-ink-3">
        {cell?.runs ? `${cell.runs} run${cell.runs === 1 ? "" : "s"}, no submission` : "Not attempted"}
      </span>
    );
  }
  const tone: Tone = cell.solved ? "pass" : cell.bestPassed > 0 ? "warn" : "fail";
  const reached = cell.bestAt ? duration(new Date(cell.bestAt).getTime() - new Date(startsAt).getTime()) : null;
  return (
    <span className="block whitespace-nowrap" title={reached ? `Best reached at +${reached}` : undefined}>
      <Mark tone={tone}>
        <span className="tnum">
          {cell.bestPassed}/{cell.total}
        </span>
      </Mark>
      {reached && <span className="tnum mt-0.5 block pl-7 text-xs text-ide-ink-3">at +{reached}</span>}
    </span>
  );
}

function Timeline({
  events,
  startsAt,
  titles,
}: {
  events: Event[];
  startsAt: string;
  titles: Map<string, string>;
}) {
  const start = new Date(startsAt).getTime();
  return (
    <ol className="divide-y divide-ide-hairline">
      {events.map((e) => {
        const v = verdict(e.status);
        const offset = new Date(e.at).getTime() - start;
        return (
          <li key={e.id} className="grid grid-cols-[5.5rem_4.5rem_4rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 text-xs sm:text-sm">
            <span className="tnum text-ide-ink-2">{clock(e.at)}</span>
            <span className="tnum text-ide-ink-3">{offset >= 0 ? `+${duration(offset)}` : `−${duration(-offset)}`}</span>
            <span className={e.kind === "submit" ? "font-medium text-ide-ink" : "text-ide-ink-3"}>
              {e.kind === "submit" ? "Submit" : "Run"}
            </span>
            <span className="truncate text-ide-ink-2">
              {titles.get(e.problemId) ?? "Deleted problem"}{" "}
              <span className="text-ide-ink-3">· {LANGUAGE[e.language] ?? e.language}</span>
            </span>
            <span className="flex items-baseline gap-3 justify-self-end">
              <Mark tone={v.tone}>{v.word}</Mark>
              <span className="tnum text-ide-ink-3">
                {e.passedCount} of {e.totalCount} {e.kind === "run" ? "samples" : "tests"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
