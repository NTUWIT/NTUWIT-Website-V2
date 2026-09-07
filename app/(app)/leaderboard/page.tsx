import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { ChevronIcon } from "@/components/ide/icons";
import { readLeaderboard } from "@/lib/leaderboard";
import { displayNames } from "@/lib/users";

export const revalidate = 10;

export const metadata = {
  title: "Leaderboard | WIT IDE",
  description: "Running totals from WIT IDE.",
  robots: { index: false },
};

export default async function LeaderboardPage() {
  const rows = await readLeaderboard();
  const [{ userId: me }, names] = await Promise.all([
    auth(),
    displayNames(rows.map((row) => row.userId)),
  ]);

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
        <ol className="mt-8 divide-y divide-hairline border-y border-ide-hairline">
          {rows.map((row, index) => {
            const isMe = row.userId === me;
            return (
              <li key={row.userId} className="flex items-center gap-4 py-3.5">
                <span className="tnum w-6 shrink-0 text-sm text-ide-ink-3">
                  {index + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    isMe ? "font-medium text-ide-ink" : "text-ide-ink-2"
                  }`}
                >
                  {/* Clerk is the only store of names; unknown ids can only
                      mean a deleted account or a Clerk outage. */}
                  {names.get(row.userId) ?? "Unknown participant"}
                  {isMe && <span className="ml-2 text-xs text-ide-accent">you</span>}
                </span>
                <span className="tnum shrink-0 text-xs text-ide-ink-3">
                  {row.solved} solved
                </span>
                <span className="tnum w-14 shrink-0 text-right text-sm text-ide-ink">
                  {row.totalScore}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
