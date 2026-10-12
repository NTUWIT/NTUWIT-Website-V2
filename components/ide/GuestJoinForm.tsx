"use client";

import { useState, useTransition } from "react";

import { joinAsGuest } from "@/app/(app)/sign-in/actions";
import { Mark, PrimaryButton, Spinner } from "./primitives";

/**
 * Shown only while auth mode is `none`: join with a display name, no account.
 * The server action re-checks the mode, so this form is a convenience only.
 */
export function GuestJoinForm({ redirectTo = "/ide" }: { redirectTo?: string }) {
  const [name, setName] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div id="wit-guest-join" className="mx-auto w-full max-w-sm">
      <h1 className="font-ide-display text-3xl font-semibold tracking-tight">Join tonight</h1>
      <p className="mt-2 text-sm leading-relaxed text-ide-ink-2">
        No account needed. Pick the name to show on the leaderboard, and stay in
        this browser: your progress is tied to it.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            setFailure(null);
            // On success the action redirects, so only failures come back.
            const result = await joinAsGuest(name, redirectTo);
            if (result && !result.ok) setFailure(result.error);
          });
        }}
      >
        <label className="block">
          <span className="block text-sm font-medium">Display name</span>
          <input
            required
            maxLength={40}
            autoComplete="nickname"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada L."
            className="mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 text-ide-ink outline-none placeholder:text-ide-ink-3"
          />
        </label>

        {failure && (
          <div role="alert" className="settle rounded-inset bg-ide-fail-quiet px-3 py-2.5">
            <Mark tone="fail">{failure}</Mark>
          </div>
        )}

        <PrimaryButton type="submit" disabled={pending || name.trim() === ""} className="w-full">
          {pending && <Spinner />}
          {pending ? "Joining…" : "Start coding"}
        </PrimaryButton>
      </form>
    </div>
  );
}

/** Everything the IDE keeps in this browser (drafts, language) starts with this. */
export const STORAGE_PREFIX = "wit-ide:";

/**
 * Leaving hands the browser to whoever sits down next, so the drafts and
 * language choices left in it go too. The form's server action does the rest.
 */
export function LeaveButton({ className }: { className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={() => {
        try {
          for (const key of Object.keys(window.localStorage)) {
            if (key.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(key);
          }
        } catch {
          // Storage unavailable: nothing was saved in it either.
        }
      }}
    >
      Leave
    </button>
  );
}
