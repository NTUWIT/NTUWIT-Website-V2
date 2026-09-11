"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  activate,
  addSet,
  deactivateAll,
  moveProblem,
  removeProblem,
  removeSet,
  startEvent,
  stopEvent,
  type ActionResult,
} from "@/app/(admin)/admin/actions";
import { ClockIcon, PlayIcon } from "@/components/ide/icons";
import {
  GhostButton,
  Mark,
  Panel,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "@/components/ide/primitives";

export type AdminProblem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  timeLimitMs: number;
  setId: string | null;
  tests: number;
  samples: number;
};

export type AdminSet = {
  id: string;
  name: string;
  description: string | null;
  problems: number;
};

/**
 * Two halves that must never be mistaken for each other.
 *
 * The current state is the only raised surface on the page: it carries the one
 * large line, and its header takes the pass tone while something is open. The
 * library is deliberately not a panel — a flat ruled list on the page ground —
 * because it is a shelf of options rather than a statement about the present.
 */
export function Console({
  sets,
  problems,
  activeSetId,
  activeProblemId,
  endsAt,
  remainingMinutes,
}: {
  sets: AdminSet[];
  problems: AdminProblem[];
  activeSetId: string | null;
  activeProblemId: string | null;
  endsAt: string | null;
  remainingMinutes: number;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState<number | "">("");
  const [newSetName, setNewSetName] = useState("");

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setResult(await action()));

  const timer = minutes === "" ? null : Number(minutes);
  const liveSet = sets.find((set) => set.id === activeSetId) ?? null;
  const liveProblem = problems.find((problem) => problem.id === activeProblemId) ?? null;
  const openProblems = liveSet
    ? problems.filter((problem) => problem.setId === liveSet.id)
    : liveProblem
      ? [liveProblem]
      : [];
  const isOpen = openProblems.length > 0;
  const unassigned = problems.filter((problem) => problem.setId === null);
  const empty = sets.length === 0 && problems.length === 0;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14">
      {/* Current state: the only raised surface on this page. */}
      <Panel className="lg:sticky lg:top-6">
        <header className="flex items-center gap-2 border-b border-ide-hairline px-5 py-3">
          <h2>
            <Mark tone={isOpen ? "pass" : "quiet"}>
              {isOpen ? "Open to participants" : "Nothing open"}
            </Mark>
          </h2>
          {pending && (
            <span className="ml-auto flex items-center gap-2">
              <Spinner className="h-3.5 w-3.5" />
              <span className="sr-only" role="status">
                Working
              </span>
            </span>
          )}
        </header>

        {isOpen ? (
          <>
            <div className="px-5 pt-5 pb-4">
              <p className="font-ide-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                {liveSet ? liveSet.name : liveProblem!.title}
              </p>
              <p className="tnum mt-2 flex flex-wrap items-center gap-x-4 text-sm text-ide-ink-3">
                <span>
                  {openProblems.length} problem{openProblems.length === 1 ? "" : "s"}
                </span>
                <span>
                  {endsAt
                    ? `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} remaining`
                    : "No timer"}
                </span>
              </p>
            </div>

            <ul className="max-h-80 divide-y divide-ide-hairline overflow-y-auto overscroll-contain border-t border-ide-hairline">
              {openProblems.map((problem) => (
                <li key={problem.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{problem.title}</span>
                  <span className="tnum text-xs text-ide-ink-3">{problem.points} pts</span>
                  <span className="tnum text-xs text-ide-ink-3">{problem.tests} tests</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 border-t border-ide-hairline px-5 py-4">
              <ClockControl
                endsAt={endsAt}
                pending={pending}
                onStart={(m) => run(() => startEvent(m))}
                onStop={() => run(stopEvent)}
              />
              <GhostButton
                disabled={pending}
                onClick={() => run(deactivateAll)}
                className="ml-auto hover:text-ide-fail"
              >
                End session
              </GhostButton>
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-ide-display text-2xl font-semibold tracking-tight">
              Nothing is open
            </p>
            <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed text-ide-ink-2">
              Participants cannot open any problem. Select{" "}
              <span className="font-medium text-ide-ink">Open</span> on a set in
              the library.
            </p>
          </div>
        )}
      </Panel>

      {/* Library: a flat ruled list on the page ground, never a panel. */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-ide-display text-xl font-semibold tracking-tight">Library</h2>
          {!empty && (
            // One control that reads as a sentence, rather than a label, a
            // number box and a unit pretending to be one.
            <label className="flex w-full items-center gap-2 text-xs text-ide-ink-3 sm:ml-auto sm:w-auto">
              When opened
              <select
                value={minutes}
                onChange={(event) =>
                  setMinutes(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="rounded-control bg-ide-panel px-2.5 py-2 text-xs text-ide-ink outline-none"
              >
                <option value="">Run without a timer</option>
                <option value={30}>Run for 30 minutes</option>
                <option value={45}>Run for 45 minutes</option>
                <option value={60}>Run for 60 minutes</option>
                <option value={90}>Run for 90 minutes</option>
                <option value={120}>Run for 120 minutes</option>
              </select>
            </label>
          )}
        </div>

        {empty ? (
          <div className="mt-4 rounded-panel bg-ide-panel px-6 py-10 text-center shadow-ide-panel">
            <p className="font-ide-display text-xl font-semibold">No problems yet</p>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-ide-ink-2">
              Add a problem, group problems into a set, then open that set at the
              start of the session.
            </p>
            <Link
              href="/admin/problems/new"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-control bg-ide-accent px-5 py-2.5 text-sm font-semibold text-ide-on-accent transition hover:brightness-105"
            >
              Add the first problem
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-panel bg-ide-panel-2 p-3">
            <h3 className="px-2 pb-2 text-sm font-medium text-ide-ink-2">Problem sets</h3>
            <ul className="space-y-1.5">
              {sets.map((set) => {
                const members = problems.filter((problem) => problem.setId === set.id);
                const live = activeSetId === set.id;
                // Titles named in the one-line summary before "and N more".
                const PREVIEW = 4;
                return (
                  <li
                    key={set.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-inset bg-ide-panel px-4 py-3.5 transition ${
                      live ? "opacity-55" : "hover:bg-ide-panel-3"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{set.name}</p>
                      <p className="mt-0.5 text-xs text-ide-ink-3">
                        {members.length === 0
                          ? "No problems in this set"
                          : members
                              .slice(0, PREVIEW)
                              .map((problem) => problem.title)
                              .join(", ") +
                            (members.length > PREVIEW ? `, and ${members.length - PREVIEW} more` : "")}
                      </p>
                      {/* The full list on demand, in a box that scrolls rather
                          than a sentence that runs down the page. */}
                      {members.length > PREVIEW && (
                        <details className="mt-1.5 text-xs">
                          <summary className="cursor-pointer text-ide-ink-3 hover:text-ide-ink">
                            Show all {members.length}
                          </summary>
                          <ol className="mt-2 max-h-48 list-decimal overflow-y-auto overscroll-contain rounded-inset bg-ide-panel-2 py-2 pr-3 pl-8 text-ide-ink-2">
                            {members.map((problem) => (
                              <li key={problem.id} className="py-0.5">
                                {problem.title}
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </div>

                    <span className="tnum text-xs text-ide-ink-3">
                      {members.length} problem{members.length === 1 ? "" : "s"}
                    </span>

                    {live ? (
                      <span className="text-xs text-ide-ink-3">Currently open</span>
                    ) : members.length > 0 ? (
                      <PrimaryButton
                        disabled={pending}
                        onClick={() => run(() => activate({ setId: set.id, minutes: timer }))}
                        className="w-full sm:w-auto"
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Open
                      </PrimaryButton>
                    ) : (
                      <GhostButton
                        disabled={pending}
                        onClick={() => run(() => removeSet(set.id))}
                        className="text-xs hover:text-ide-fail"
                      >
                        Delete
                      </GhostButton>
                    )}
                  </li>
                );
              })}
            </ul>

            {unassigned.length > 0 && (
              <>
                <h3 className="mt-4 px-2 pb-1 text-sm font-medium text-ide-ink-2">
                  Not in a set
                </h3>
                <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto overscroll-contain">
                  {unassigned.map((problem) => (
                    <LooseProblemRow
                      key={problem.id}
                      problem={problem}
                      sets={sets}
                      pending={pending}
                      live={activeProblemId === problem.id}
                      run={run}
                      timer={timer}
                    />
                  ))}
                </ul>
              </>
            )}
            </div>

            {/* Authoring is a different job from opening, so it sits on its own
                surface below the listing rather than inside it. */}
            <div className="mt-10 grid gap-px overflow-hidden rounded-panel bg-ide-hairline shadow-ide-panel sm:grid-cols-2">
              <div className="bg-ide-panel p-5">
                <label htmlFor="new-set" className="block text-sm font-medium">
                  Create a set
                </label>
                <p className="mt-1 text-xs leading-relaxed text-ide-ink-3">
                  Groups the problems you want to open together.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    id="new-set"
                    value={newSetName}
                    onChange={(event) => setNewSetName(event.target.value)}
                    placeholder="Coding Night 1"
                    className="min-w-40 flex-1 rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
                  />
                  <button
                    type="button"
                    disabled={pending || newSetName.trim().length < 2}
                    onClick={() =>
                      run(async () => {
                        const outcome = await addSet(newSetName, "", sets.length);
                        if (outcome.ok) setNewSetName("");
                        return outcome;
                      })
                    }
                    className="rounded-control bg-ide-panel px-4 py-2.5 text-sm font-medium text-ide-ink shadow-ide-panel transition hover:bg-ide-panel-2 disabled:opacity-40 disabled:shadow-none"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="bg-ide-panel p-5">
                <p className="text-sm font-medium">Add a problem</p>
                <p className="mt-1 text-xs leading-relaxed text-ide-ink-3">
                  Define a function, a statement and its test cases.
                </p>
                <Link
                  href="/admin/problems/new"
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-control bg-ide-panel px-4 py-2.5 text-sm font-medium text-ide-ink shadow-ide-panel transition hover:bg-ide-panel-2"
                >
                  New problem
                </Link>
              </div>
            </div>
          </>
        )}

        {result && (
          <div className="settle mt-4">
            <Feedback result={result} />
          </div>
        )}
      </section>
    </div>
  );
}

/** Changes the countdown without changing which problems are open. */
function ClockControl({
  endsAt,
  pending,
  onStart,
  onStop,
}: {
  endsAt: string | null;
  pending: boolean;
  onStart: (minutes: number) => void;
  onStop: () => void;
}) {
  const [minutes, setMinutes] = useState(30);

  if (endsAt) {
    return (
      <SecondaryButton disabled={pending} onClick={onStop}>
        <ClockIcon className="h-3.5 w-3.5" />
        Clear timer
      </SecondaryButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={1440}
        value={minutes}
        onChange={(event) => setMinutes(Number(event.target.value))}
        aria-label="Minutes"
        className="tnum w-16 rounded-control bg-ide-panel-2 px-2 py-1.5 text-sm text-ide-ink outline-none"
      />
      <SecondaryButton disabled={pending} onClick={() => onStart(minutes)}>
        <ClockIcon className="h-3.5 w-3.5" />
        Start timer
      </SecondaryButton>
    </div>
  );
}

function LooseProblemRow({
  problem,
  sets,
  pending,
  live,
  run,
  timer,
}: {
  problem: AdminProblem;
  sets: AdminSet[];
  pending: boolean;
  live: boolean;
  run: (action: () => Promise<ActionResult>) => void;
  timer: number | null;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-inset bg-ide-panel px-4 py-3.5 transition ${
        live ? "opacity-55" : "hover:bg-ide-panel-3"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{problem.title}</p>
        <p className="tnum mt-0.5 text-xs text-ide-ink-3">
          {problem.difficulty} · {problem.points} pts · {problem.tests} tests
        </p>
      </div>

      <label className="sr-only" htmlFor={`set-${problem.id}`}>
        Add {problem.title} to a set
      </label>
      <select
        id={`set-${problem.id}`}
        value=""
        disabled={pending || sets.length === 0}
        onChange={(event) => run(() => moveProblem(problem.id, event.target.value))}
        className="rounded-control bg-ide-panel px-2.5 py-2 text-xs text-ide-ink-2 outline-none disabled:opacity-40"
      >
        <option value="">Add to set…</option>
        {sets.map((set) => (
          <option key={set.id} value={set.id}>
            {set.name}
          </option>
        ))}
      </select>

      <Link
        href={`/admin/problems/${problem.id}`}
        className="rounded-control px-2.5 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel-3 hover:text-ide-ink"
      >
        Edit
      </Link>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirming) {
            run(() => removeProblem(problem.id));
            setConfirming(false);
            return;
          }
          setConfirming(true);
        }}
        onBlur={() => setConfirming(false)}
        className={`rounded-control px-2.5 py-2 text-xs transition disabled:opacity-40 ${
          confirming ? "bg-ide-fail-quiet font-medium text-ide-fail" : "text-ide-ink-3 hover:text-ide-fail"
        }`}
      >
        {confirming ? "Really delete?" : "Delete"}
      </button>

      {live ? (
        <span className="text-xs text-ide-ink-3">Currently open</span>
      ) : (
        <PrimaryButton
          disabled={pending}
          onClick={() => run(() => activate({ problemId: problem.id, minutes: timer }))}
          className="w-full sm:w-auto"
        >
          <PlayIcon className="h-3.5 w-3.5" />
          Open
        </PrimaryButton>
      )}
    </li>
  );
}

/**
 * Every action here replaces content without moving focus, so the outcome has
 * to be announced. Success is polite; a failure interrupts, because the admin
 * has just been told something worked when it did not.
 */
export function Feedback({ result }: { result: ActionResult }) {
  if (result.ok) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-inset bg-ide-pass-quiet px-3 py-2 text-sm text-ide-pass"
      >
        {result.message}
      </p>
    );
  }
  return (
    <ul
      role="alert"
      className="space-y-1 rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm text-ide-fail"
    >
      {result.errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
