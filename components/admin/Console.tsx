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
import { CheckIcon, ClockIcon, PlayIcon } from "@/components/ide/icons";

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
 * Left: exactly what a participant can open right now. Right: everything you
 * could put there. The mirror is the point — an admin who has never seen this
 * screen should be able to answer "can the room see anything?" without reading
 * a label twice.
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
  const anythingLive = openProblems.length > 0;
  const unassigned = problems.filter((problem) => problem.setId === null);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {/* ---------- LIVE NOW ---------- */}
      <section className="flex flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel">
        <header className="flex items-center gap-2 bg-ide-panel-2 px-5 py-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Live now</h2>
          <span className="text-xs text-ide-ink-3">what the room can open</span>
          {pending && (
            <span className="ml-auto h-3.5 w-3.5 animate-spin rounded-full border-[1.75px] border-ide-accent border-t-transparent" />
          )}
        </header>

        {anythingLive ? (
          <div className="flex flex-1 flex-col">
            <div className="px-5 pt-5">
              <p className="flex items-center gap-2 font-ide-display text-2xl font-semibold tracking-tight">
                {liveSet ? liveSet.name : liveProblem!.title}
                <span className="inline-flex items-center gap-1 rounded-full bg-ide-pass-quiet px-2 py-0.5 text-xs font-medium text-ide-pass">
                  <CheckIcon className="h-3 w-3" />
                  Open
                </span>
              </p>
              <p className="tnum mt-1 text-sm text-ide-ink-3">
                {openProblems.length} problem{openProblems.length === 1 ? "" : "s"} ·{" "}
                {endsAt
                  ? `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} left`
                  : "no timer"}
              </p>
            </div>

            <ul className="mt-4 divide-y divide-ide-hairline border-t border-ide-hairline">
              {openProblems.map((problem) => (
                <li key={problem.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{problem.title}</span>
                  <span className="tnum text-xs text-ide-ink-3">{problem.points} pts</span>
                  <span className="tnum text-xs text-ide-ink-3">{problem.tests} tests</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-wrap items-center gap-3 px-5 py-4">
              <ClockControl
                endsAt={endsAt}
                pending={pending}
                onStart={(m) => run(() => startEvent(m))}
                onStop={() => run(stopEvent)}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(deactivateAll)}
                className="ml-auto rounded-control px-3 py-2 text-sm text-ide-ink-3 transition hover:text-ide-fail disabled:opacity-40"
              >
                End session
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <p className="font-ide-display text-xl font-semibold">Participants see nothing</p>
            <p className="max-w-[40ch] text-sm leading-relaxed text-ide-ink-2">
              Nobody can open a problem until you open one. Pick something from
              the library and press <span className="font-medium text-ide-ink">Open this</span>.
            </p>
          </div>
        )}
      </section>

      {/* ---------- LIBRARY ---------- */}
      <section className="flex flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel">
        <header className="flex flex-wrap items-center gap-2 bg-ide-panel-2 px-5 py-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Library</h2>
          <span className="text-xs text-ide-ink-3">everything you could open</span>
          <label className="tnum ml-auto flex items-center gap-1.5 text-xs text-ide-ink-3">
            timer
            <input
              type="number"
              min={1}
              max={1440}
              placeholder="off"
              value={minutes}
              onChange={(event) =>
                setMinutes(event.target.value === "" ? "" : Number(event.target.value))
              }
              className="tnum w-16 rounded-control bg-ide-panel px-2 py-1 text-ide-ink outline-none placeholder:text-ide-ink-3"
            />
            min
          </label>
        </header>

        {sets.length === 0 && problems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <p className="font-ide-display text-xl font-semibold">Nothing here yet</p>
            <p className="max-w-[40ch] text-sm leading-relaxed text-ide-ink-2">
              Write your first problem, group a few into a set, then open the set
              when the night starts.
            </p>
            <Link
              href="/admin/problems/new"
              className="mt-3 rounded-control bg-ide-accent px-4 py-2 text-sm font-medium text-ide-on-accent transition hover:brightness-105"
            >
              Write the first problem
            </Link>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <ul className="divide-y divide-ide-hairline">
              {sets.map((set) => {
                const members = problems.filter((problem) => problem.setId === set.id);
                const live = activeSetId === set.id;
                return (
                  <li key={set.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{set.name}</p>
                        <p className="tnum mt-0.5 text-xs text-ide-ink-3">
                          {members.length === 0
                            ? "empty"
                            : `${members.length} problem${members.length === 1 ? "" : "s"}: ${members
                                .map((problem) => problem.title)
                                .join(", ")}`}
                        </p>
                      </div>

                      {live ? (
                        <span className="text-xs text-ide-pass">Open now</span>
                      ) : members.length > 0 ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => activate({ setId: set.id, minutes: timer }))}
                          className="flex items-center gap-1.5 rounded-control bg-ide-accent px-3.5 py-2 text-sm font-medium text-ide-on-accent transition hover:brightness-105 disabled:opacity-40"
                        >
                          <PlayIcon className="h-3 w-3" />
                          Open this
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => removeSet(set.id))}
                          className="rounded-control px-2 py-1 text-xs text-ide-ink-3 transition hover:text-ide-fail disabled:opacity-40"
                        >
                          Delete set
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}

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

            <div className="mt-auto flex flex-wrap items-center gap-2 px-5 py-4">
              <input
                value={newSetName}
                onChange={(event) => setNewSetName(event.target.value)}
                placeholder="New set, e.g. Coding Night 1"
                className="min-w-48 flex-1 rounded-control bg-ide-panel-2 px-3 py-2 text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
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
                className="rounded-control bg-ide-panel-2 px-3 py-2 text-sm font-medium transition hover:bg-ide-panel-3 disabled:opacity-40"
              >
                Add set
              </button>
              <Link
                href="/admin/problems/new"
                className="rounded-control bg-ide-panel-2 px-3 py-2 text-sm font-medium transition hover:bg-ide-panel-3"
              >
                Write a problem
              </Link>
            </div>
          </div>
        )}
      </section>

      {result && (
        <div className="lg:col-span-2">
          <Feedback result={result} />
        </div>
      )}
    </div>
  );
}

/** Adjusts the clock without changing what is open. */
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
      <button
        type="button"
        disabled={pending}
        onClick={onStop}
        className="flex items-center gap-1.5 rounded-control bg-ide-panel-2 px-3 py-2 text-sm transition hover:bg-ide-panel-3 disabled:opacity-40"
      >
        <ClockIcon className="h-3.5 w-3.5" />
        Clear the timer
      </button>
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
      <button
        type="button"
        disabled={pending}
        onClick={() => onStart(minutes)}
        className="flex items-center gap-1.5 rounded-control bg-ide-panel-2 px-3 py-2 text-sm transition hover:bg-ide-panel-3 disabled:opacity-40"
      >
        <ClockIcon className="h-3.5 w-3.5" />
        Start a timer
      </button>
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
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{problem.title}</p>
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
        className="rounded-control bg-ide-panel-2 px-2 py-1.5 text-xs text-ide-ink-2 outline-none disabled:opacity-40"
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
        className="rounded-control px-2 py-1 text-xs text-ide-ink-3 transition hover:text-ide-ink"
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
        className={`rounded-control px-2 py-1 text-xs transition disabled:opacity-40 ${
          confirming ? "bg-ide-fail-quiet font-medium text-ide-fail" : "text-ide-ink-3 hover:text-ide-fail"
        }`}
      >
        {confirming ? "Really delete?" : "Delete"}
      </button>

      {live ? (
        <span className="text-xs text-ide-pass">Open now</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => activate({ problemId: problem.id, minutes: timer }))}
          className="flex items-center gap-1.5 rounded-control bg-ide-accent px-3.5 py-2 text-sm font-medium text-ide-on-accent transition hover:brightness-105 disabled:opacity-40"
        >
          <PlayIcon className="h-3 w-3" />
          Open this
        </button>
      )}
    </li>
  );
}

export function Feedback({ result }: { result: ActionResult }) {
  if (result.ok) {
    return (
      <p className="rounded-inset bg-ide-pass-quiet px-3 py-2 text-sm text-ide-pass">
        {result.message}
      </p>
    );
  }
  return (
    <ul className="space-y-1 rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm text-ide-fail">
      {result.errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
