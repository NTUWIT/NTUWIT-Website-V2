"use client";

import { useState, useTransition } from "react";

import { renameSelf } from "@/app/(app)/sign-in/actions";
import { ChevronIcon } from "./icons";
import { Mark, PrimaryButton, Spinner } from "./primitives";

/**
 * The guest's name in the navbar. Clicking it opens a small form to change it;
 * the new name shows on the leaderboard from the next render.
 */
export function GuestNameMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(name);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setDraft(name);
    setFailure(null);
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!pending && !event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Change your name"
        className="flex items-center gap-1.5 rounded-control px-2.5 py-2 text-sm text-ide-ink-2 transition hover:bg-ide-panel-2 hover:text-ide-ink"
      >
        <span className="max-w-32 truncate">{name}</span>
        <ChevronIcon className={`h-3 w-3 text-ide-ink-3 transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <form
          role="dialog"
          aria-label="Change your name"
          className="settle absolute right-0 z-40 mt-1 w-64 space-y-3 rounded-panel bg-ide-panel p-4 shadow-ide-panel"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setFailure(null);
              const result = await renameSelf(draft);
              if (result.ok) {
                setDraft(result.name);
                setOpen(false);
              } else {
                setFailure(result.error);
              }
            });
          }}
        >
          <label className="block">
            <span className="block text-sm font-medium">Display name</span>
            <input
              autoFocus
              required
              maxLength={40}
              autoComplete="nickname"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none"
            />
          </label>

          {failure && (
            <div role="alert" className="rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm">
              <Mark tone="fail">{failure}</Mark>
            </div>
          )}

          <PrimaryButton
            type="submit"
            disabled={pending || draft.trim() === "" || draft.trim() === name}
            className="w-full"
          >
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save"}
          </PrimaryButton>
        </form>
      )}
    </div>
  );
}
