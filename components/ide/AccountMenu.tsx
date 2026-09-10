"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ChevronIcon } from "./icons";

/**
 * Replaces Clerk's UserButton. Same reason as the sign-in form: the hosted
 * component is fetched from a CDN on demand, and this is part of the bundle.
 */
export function AccountMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isLoaded || !user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    "Account";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm transition hover:bg-ide-panel-2"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ide-accent-quiet text-xs font-semibold text-ide-accent-ink">
          {initials || "?"}
        </span>
        <span className="hidden max-w-32 truncate sm:block">{name}</span>
        <ChevronIcon className={`h-3 w-3 text-ide-ink-3 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="settle absolute right-0 z-40 mt-1 w-60 overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel"
        >
          <p className="truncate px-4 py-3 text-xs text-ide-ink-3">
            {user.primaryEmailAddress?.emailAddress ?? name}
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await signOut();
                router.push("/");
              })
            }
            className="w-full border-t border-ide-hairline px-4 py-3 text-left text-sm transition hover:bg-ide-panel-2 disabled:opacity-40"
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
