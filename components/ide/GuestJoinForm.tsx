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

/**
 * The same join, inline in the editor's action strip, so a participant can
 * save a name right where they are about to run or submit. The page passes
 * `guestJoin` only in `none` mode; the action refuses in any other mode.
 * Drafts live in localStorage, so the reload after joining keeps the code.
 */
export function GuestNameInline() {
  const [name, setName] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setFailure(null);
          const here = `${window.location.pathname}${window.location.search}`;
          const result = await joinAsGuest(name, here);
          if (result && !result.ok) setFailure(result.error);
        });
      }}
    >
      <label className="sr-only" htmlFor="wit-guest-name">
        Your name for the leaderboard
      </label>
      <input
        id="wit-guest-name"
        required
        maxLength={40}
        autoComplete="nickname"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name to submit"
        className="w-44 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
      />
      <button
        type="submit"
        disabled={pending || name.trim() === ""}
        className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm text-ide-accent-ink transition hover:bg-ide-accent-quiet disabled:opacity-40"
      >
        {pending && <Spinner className="h-3.5 w-3.5" />}
        {pending ? "Saving…" : "Save name"}
      </button>
      {failure && (
        <span role="alert" className="w-full text-xs text-ide-fail">
          {failure}
        </span>
      )}
    </form>
  );
}
