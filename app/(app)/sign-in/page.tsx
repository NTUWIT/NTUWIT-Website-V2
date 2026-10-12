import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { GuestJoinForm } from "@/components/ide/GuestJoinForm";
import { SignInForm } from "@/components/ide/SignInForm";
import { readAuthMode, requireUser } from "@/lib/auth";
import { signInView } from "@/lib/auth-mode";

export const metadata = {
  title: "Sign in | WIT IDE",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only same-origin paths, so the parameter cannot be used to bounce somebody
  // off the platform after they authenticate.
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/ide";

  const { mode } = readAuthMode();

  // Only the IDE opens up when auth is disabled. Anything headed for /admin
  // gets the account form, and a guest cookie never counts for it.
  // A Clerk session counts here even with auth disabled: it is how admin signs in.
  const participantId = (await auth()).userId ?? (await requireUser());
  const view = signInView({ mode, participantId, redirectTo });
  if (view === "redirect") redirect(redirectTo);

  if (view === "guest") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
        <GuestJoinForm redirectTo={redirectTo} />
        {/* Organisers still sign in with Clerk: admin never accepts a guest. */}
        <details className="w-full max-w-sm text-sm text-ide-ink-3">
          <summary className="cursor-pointer select-none hover:text-ide-ink">
            Have an account? Sign in instead
          </summary>
          <div className="mt-6">
            <SignInForm redirectTo={redirectTo} inviteOnly={false} />
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <SignInForm redirectTo={redirectTo} />
    </div>
  );
}
