import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountMenu } from "@/components/ide/AccountMenu";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

/**
 * Everything under /admin. A non-admin gets a 404 rather than a "forbidden"
 * page: there is no reason to confirm the route exists to someone who cannot
 * use it. The server actions re-check the role themselves, because this guard
 * does not cover them.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) notFound();

  return (
    <div className="ide-surface flex min-h-screen flex-col">
      <header className="flex h-13 shrink-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <Link href="/admin" className="flex items-center gap-2.5 px-1 py-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-ide-accent" />
          <span className="text-[0.95rem] font-semibold tracking-tight">Console</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-ide-ink-3">
          <Link href="/ide" className="rounded-control px-2.5 py-2 transition hover:bg-ide-panel-2 hover:text-ide-ink">
            WIT IDE
          </Link>
          <Link href="/" className="rounded-control px-2.5 py-2 transition hover:bg-ide-panel-2 hover:text-ide-ink">
            Main site
          </Link>
          <AccountMenu />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
