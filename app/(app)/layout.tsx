import Link from "next/link";
import { Show } from "@clerk/nextjs";

import { AccountMenu } from "@/components/ide/AccountMenu";

import { EventTimer } from "@/components/ide/event-timer";
import { ThemeToggle } from "@/components/ide/theme";
import { getEventEndsAt } from "@/lib/db/queries";

// The event clock is read per request so starting or stopping a session takes
// effect for everyone on their next page load, with no redeploy.
export const dynamic = "force-dynamic";

/**
 * The IDE and leaderboard. `ide-surface` scopes the editor's palette, fonts,
 * caret and scrollbars, which must not reach the marketing site.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const endsAt = await getEventEndsAt();

  return (
    // A fixed height, not a minimum: with min-h-screen a long statement grew the
    // whole page and stretched the editor with it, so neither pane scrolled.
    <div className="ide-surface flex h-dvh flex-col">
      <header className="flex h-13 shrink-0 items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2.5 px-1 py-1" aria-label="Back to the main site">
            <img src="/wit-logo.png" alt="" className="h-5 w-5 object-contain" />
            <span className="text-[0.95rem] font-semibold tracking-tight">WIT IDE</span>
          </Link>
          <Link
            href="/"
            className="rounded-control px-2.5 py-2 text-sm text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink"
          >
            Main site
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <EventTimer endsAt={endsAt ? endsAt.toISOString() : null} />
          <ThemeToggle />
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="ml-1 rounded-control bg-ide-accent px-4 py-2 text-sm font-semibold text-ide-on-accent transition hover:brightness-105"
            >
              Sign in
            </Link>
          </Show>
          <Show when="signed-in">
            <AccountMenu />
          </Show>
        </div>
      </header>
      {/* Pages taller than the screen, like the leaderboard, scroll here. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
