"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * The account control for the marketing site.
 *
 * Written against the site's own tokens rather than reusing the IDE's account
 * menu: the two surfaces have separate palettes and type, and a panel from the
 * editor dropped into this header would read as a foreign object.
 *
 * The marketing pages are statically prerendered, so no session exists when the
 * HTML is generated and Clerk's `Show` renders nothing there. Rather than leave
 * a hole in the header until hydration, the control renders "Sign in" as its
 * resting state and swaps once the session is known. That is correct
 * immediately for the visitors this page mostly serves, and the slot keeps a
 * minimum width so nothing shifts when it changes.
 *
 * Deliberately not a dropdown: on the public site there is exactly one account
 * action worth offering, so it is a button rather than a menu hiding a button.
 */
const CONTROL =
  "mono-eyebrow inline-flex min-w-20 items-center justify-center rounded-full px-3 py-2 text-ink-soft transition-colors hover:text-ink";

export function SiteAccount({ className = "" }: { className?: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!isLoaded || !isSignedIn) {
    return (
      <Link href="/sign-in" className={`${CONTROL} ${className}`}>
        Sign in
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/");
        })
      }
      className={`${CONTROL} disabled:opacity-50 ${className}`}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
