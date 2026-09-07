import Link from "next/link";

/**
 * Ported from the standalone site's NotFound route. The console.error it used
 * to log is dropped: Next already reports unmatched routes, and a participant's
 * console is not where a 404 belongs.
 */
export default function NotFound() {
  return (
    <div className="wit-site flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
