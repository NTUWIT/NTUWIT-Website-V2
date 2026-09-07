import Link from "next/link";
import { notFound } from "next/navigation";

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
      <header className="flex h-13 shrink-0 items-center justify-between gap-4 px-5">
        <Link href="/admin" className="text-[0.95rem] font-semibold tracking-tight">
          Console
        </Link>
        <nav className="flex items-center gap-4 text-sm text-ide-ink-3">
          <Link href="/ide" className="transition hover:text-ide-ink">
            Open the IDE
          </Link>
          <Link href="/" className="transition hover:text-ide-ink">
            Main site
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
