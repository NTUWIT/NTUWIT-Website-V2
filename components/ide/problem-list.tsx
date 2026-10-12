"use client";

import Link from "next/link";
import { useState } from "react";

import { CheckIcon, ChevronIcon } from "./icons";
import { useSolved } from "./visualization-workspace";

type Entry = { id: string; slug: string; title: string; points: number };

/** Below this many problems the whole list fits, and a search box is clutter. */
const SEARCH_FROM = 9;

/**
 * The set's problems, as a list that scrolls in its own box and, for a large
 * set, filters as you type. Matching is on the title, ignoring case.
 */
export function ProblemList({ entries, currentSlug }: { entries: Entry[]; currentSlug: string }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle ? entries.filter((e) => e.title.toLowerCase().includes(needle)) : entries;

  return (
    <nav className="mt-10" aria-label="Problems in this set">
      <h2 className="flex items-baseline justify-between font-ide-display text-base font-semibold text-ide-ink">
        Other problems
        <span className="tnum font-sans text-xs font-normal text-ide-ink-3">
          {needle ? `${shown.length} of ${entries.length}` : `${entries.length} in this set`}
        </span>
      </h2>

      {entries.length >= SEARCH_FROM && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search problems"
          aria-label="Search problems"
          className="mt-3 w-full rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
        />
      )}

      {/* A large set scrolls in its own box, about eight rows tall, rather
          than pushing the leaderboard link off the page. */}
      <ul className="mt-3 max-h-96 divide-y divide-ide-hairline overflow-y-auto overscroll-contain border-y border-ide-hairline">
        {shown.map((entry) => {
          const current = entry.slug === currentSlug;
          return (
            <li key={entry.id}>
              <Link
                href={`/ide?problem=${entry.slug}`}
                aria-current={current ? "page" : undefined}
                className="group flex items-center gap-3 py-3 text-sm"
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${current ? "bg-ide-accent" : "bg-transparent"}`}
                />
                <span className={current ? "font-medium text-ide-ink" : "text-ide-ink-2 group-hover:text-ide-ink"}>
                  {entry.title}
                </span>
                <span className="tnum ml-auto text-xs text-ide-ink-3">{entry.points}</span>
                <ChevronIcon className="h-3.5 w-3.5 text-ide-ink-3 opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="py-3 text-sm text-ide-ink-3">No problem matches &ldquo;{query.trim()}&rdquo;.</li>
        )}
      </ul>
    </nav>
  );
}

type Neighbour = { slug: string; title: string } | null;

const STEP =
  "flex items-center gap-1.5 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm font-medium text-ide-ink transition hover:bg-ide-panel-3";

/** Previous and next, by the set's order, at the top of the problem. */
export function ProblemNav({ index, count, prev, next }: { index: number; count: number; prev: Neighbour; next: Neighbour }) {
  return (
    <nav aria-label="Problem navigation" className="flex items-center justify-between gap-3 border-b border-ide-hairline px-3 py-2.5 sm:px-5">
      {prev ? (
        <Link href={`/ide?problem=${prev.slug}`} className={STEP} title={prev.title}>
          <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
          Previous
        </Link>
      ) : (
        <span aria-disabled className={`${STEP} pointer-events-none opacity-40`}>
          <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
          Previous
        </span>
      )}
      <span className="tnum text-sm text-ide-ink-2">
        Problem {index + 1} of {count}
      </span>
      {next ? (
        <Link href={`/ide?problem=${next.slug}`} className={STEP} title={next.title}>
          Next
          <ChevronIcon className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <span aria-disabled className={`${STEP} pointer-events-none opacity-40`}>
          Next
          <ChevronIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </nav>
  );
}

/**
 * The problem, or, right after an accepted submit, a plain "you solved it"
 * in its place with the way on to the next one.
 */
export function StatementPane({ problemId, next, children }: { problemId: string; next: Neighbour; children: React.ReactNode }) {
  const [solved, setSolved] = useSolved();
  if (solved?.problemId !== problemId) return children;

  return (
    <div role="status" className="settle flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ide-pass-quiet text-ide-pass">
        <CheckIcon className="h-8 w-8" />
      </span>
      <div>
        <h2 className="font-ide-display text-3xl font-semibold tracking-tight">Solution accepted</h2>
        <p className="tnum mt-2 text-ide-ink-2">
          All {solved.total} tests passed · {solved.score} points
        </p>
      </div>
      <dl className="tnum grid grid-cols-2 divide-x divide-ide-hairline rounded-inset bg-ide-panel-2 py-3 text-left">
        <div className="px-5">
          <dt className="text-xs text-ide-ink-3">Runtime</dt>
          <dd className="mt-0.5 font-mono text-lg text-ide-ink">{solved.runtimeMs} ms</dd>
        </div>
        <div className="px-5">
          <dt className="text-xs text-ide-ink-3">Memory</dt>
          <dd className="mt-0.5 font-mono text-lg text-ide-ink">
            {solved.memoryKb == null ? "n/a" : `${(solved.memoryKb / 1024).toFixed(1)} MB`}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {next && (
          <Link
            href={`/ide?problem=${next.slug}`}
            className="flex items-center gap-2 rounded-control bg-ide-accent px-4 py-2.5 text-sm font-semibold text-ide-on-accent transition hover:brightness-105"
          >
            Next problem
            <ChevronIcon className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setSolved(null)}
          className="rounded-control px-4 py-2.5 text-sm font-medium text-ide-ink-2 transition hover:bg-ide-panel-2 hover:text-ide-ink"
        >
          View problem again
        </button>
      </div>
    </div>
  );
}
