import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

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
    <div className="ide-surface flex min-h-screen flex-col">
      <header className="flex h-13 shrink-0 items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2.5 px-1 py-1" aria-label="Back to the main site">
            <img src="/wit-logo.png" alt="" className="h-5 w-5 object-contain" />
            <span className="text-[0.95rem] font-semibold tracking-tight">WIT IDE</span>
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <EventTimer endsAt={endsAt ? endsAt.toISOString() : null} />
          <ThemeToggle />
          <Show when="signed-out">
            {/* Modal keeps sign-in on the page: the default redirect mode
                sends participants to the hosted account portal. */}
            <SignInButton mode="modal">
              <button
                type="button"
                className="ml-1 cursor-pointer rounded-control bg-ide-accent px-3.5 py-1.5 text-sm font-medium text-ide-on-accent transition hover:brightness-105"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <span className="ml-1 flex items-center">
              <UserButton />
            </span>
          </Show>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
