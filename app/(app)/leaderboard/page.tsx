import Link from "next/link";

import { ChevronIcon, CrownIcon } from "@/components/ide/icons";
import { requireUser } from "@/lib/auth";
import { readLeaderboard } from "@/lib/leaderboard";
import { displayNames } from "@/lib/users";

export const revalidate = 10;

export const metadata = {
  title: "Leaderboard | WIT IDE",
  description: "Running totals from WIT IDE.",
  robots: { index: false },
};

const PAGE_SIZE = 10;

const PODIUM = [
  { text: "text-ide-gold", ring: "bg-ide-gold/12 ring-ide-gold/40" },
  { text: "text-ide-silver", ring: "bg-ide-silver/12 ring-ide-silver/40" },
  { text: "text-ide-bronze", ring: "bg-ide-bronze/12 ring-ide-bronze/40" },
];

const STEP =
  "flex items-center gap-1.5 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm font-medium text-ide-ink transition hover:bg-ide-panel-3";

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  // ponytail: pages over the cached top 100 in memory; page in SQL if the board outgrows that.
  const rows = await readLeaderboard();
  const params = await searchParams;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requested = Number(typeof params.page === "string" ? params.page : 1);
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const shown = rows.slice(start, start + PAGE_SIZE);

  const me = await requireUser();
  const myRank = rows.findIndex((row) => row.userId === me);
  // Off this page, your own row is pinned under the list so you never have to hunt for it.
  const pinned = myRank >= 0 && (myRank < start || myRank >= start + PAGE_SIZE) ? rows[myRank]! : null;
  const names = await displayNames([...shown, ...(pinned ? [pinned] : [])].map((row) => row.userId));

  const renderRow = (row: (typeof rows)[number], rank: number) => {
    const isMe = row.userId === me;
    const podium = PODIUM[rank];
    return (
      <li
        key={row.userId}
        className={`flex items-center gap-4 rounded-inset px-3 py-3.5 ${
          isMe
            ? "bg-ide-accent-quiet ring-2 ring-ide-accent"
            : podium
              ? `ring-1 ${podium.ring}`
              : ""
        }`}
      >
        <span className={`tnum flex w-8 shrink-0 items-center gap-1 text-sm ${podium ? `font-semibold ${podium.text}` : "text-ide-ink-3"}`}>
          {podium ? <CrownIcon className="h-4 w-4" /> : null}
          {rank + 1}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            isMe ? "font-semibold text-ide-ink" : podium ? "font-medium text-ide-ink" : "text-ide-ink-2"
          }`}
        >
          {/* Names come from Clerk or the guests table; an unknown
              id means a deleted account or an outage of either. */}
          {names.get(row.userId) ?? "Unknown participant"}
          {isMe && (
            <span className="ml-2 rounded-full bg-ide-accent px-2 py-0.5 text-[0.7rem] font-semibold text-ide-on-accent">
              You
            </span>
          )}
        </span>
        <span className="tnum shrink-0 text-xs text-ide-ink-3">
          {row.solved} solved
        </span>
        <span className={`tnum w-14 shrink-0 text-right text-sm ${podium ? `font-semibold ${podium.text}` : "text-ide-ink"}`}>
          {row.totalScore}
        </span>
      </li>
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-16">
      <Link
        href="/ide"
        className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
      >
        <ChevronIcon className="h-3 w-3 rotate-180" />
        Back to the problem
      </Link>

      <h1 className="mt-6 font-ide-display text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em]">
        Leaderboard
      </h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ide-ink-2">
        Coding Nights are not ranked, nobody here is being assessed. This page
        is just a running total of best scores, and it refreshes every ten
        seconds.
      </p>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-ide-ink-3">
          Nothing here yet. Scores appear once someone submits a solution.
        </p>
      ) : (
        <>
          <ol className="mt-8 flex flex-col gap-1.5">
            {shown.map((row, index) => renderRow(row, start + index))}
          </ol>

          {pinned && (
            <ol className="mt-4 border-t border-dashed border-ide-hairline pt-4">
              {renderRow(pinned, myRank)}
            </ol>
          )}

          {pages > 1 && (
            <nav aria-label="Leaderboard pages" className="mt-6 flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={`/leaderboard?page=${page - 1}`} className={STEP}>
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
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={`/leaderboard?page=${page + 1}`} className={STEP}>
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
          )}
        </>
      )}
    </div>
  );
}
