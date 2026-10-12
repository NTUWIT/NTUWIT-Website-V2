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
  const { userId: clerkUserId } = await auth();
  // In none mode requireUser is the named guest, if any; Clerk never stands in.
  const guestId = mode === "none" ? await requireUser() : null;
  const view = signInView({ mode, clerkUserId, guestId, redirectTo });
  if (view === "redirect") redirect(redirectTo);

  if (view === "guest") {
    return (
      // Accounts are for admin only, and organisers go to /admin directly, so
      // participants are never shown one.
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <GuestJoinForm redirectTo={redirectTo} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <SignInForm redirectTo={redirectTo} />
    </div>
  );
}
