"use client";

import Link from "next/link";
import { useState } from "react";

import { ChevronIcon } from "./icons";

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
