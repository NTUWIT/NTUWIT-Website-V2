"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  archive,
  moveProblem,
  removeProblem,
  removeSet,
  reorderSet,
  updateSetDetails,
  type ActionResult,
} from "@/app/(admin)/admin/actions";
import { ChevronIcon } from "@/components/ide/icons";
import {
  GhostButton,
  Mark,
  Panel,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "@/components/ide/primitives";
import { moveItem } from "@/lib/order";
import { Feedback } from "./Console";

type Member = { id: string; title: string; difficulty: string; points: number; tests: number; attempts: number };
type Other = { id: string; title: string; setName: string | null };

/**
 * Editing one collection: its name, its problems, their order. Details and
 * order each save explicitly, so nothing reaches participants half-edited;
 * removing, adding and deleting are single actions that save at once.
 */
export function SetEditor({
  set,
  members,
  others,
  live,
}: {
  set: { id: string; name: string; description: string };
  members: Member[];
  others: Other[];
  live: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(set.name);
  const [description, setDescription] = useState(set.description);
  const [order, setOrder] = useState(members);
  const [adding, setAdding] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setResult(await action()));

  const detailsDirty = name.trim() !== set.name || description.trim() !== set.description;
  const orderDirty = order.some((member, index) => member.id !== members[index]?.id);
  const unassigned = others.filter((o) => !o.setName);
  const elsewhere = others.filter((o) => o.setName);

  return (
    <>
      <h1 className="mt-6 font-ide-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {set.name}
      </h1>
      {live ? (
        <p className="mt-3">
          <Mark tone="warn">Open to participants now. Changes reach them on their next page load.</Mark>
        </p>
      ) : (
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
          Participants see these problems in this order when the set is opened.
        </p>
      )}

      {/* Details */}
      <section className="mt-8" aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-ide-display text-xl font-semibold tracking-tight">
          Details
        </h2>
        <form
          className="mt-3 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => updateSetDetails(set.id, name, description));
          }}
        >
          <label className="block">
            <span className="block text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              className="mt-2 w-full rounded-control bg-ide-panel-2 px-3 py-2.5 text-ide-ink outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium">Description</span>
            <span className="mt-1 block text-xs text-ide-ink-3">Optional. Only organisers see it.</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={2}
              className="mt-2 w-full resize-none rounded-control bg-ide-panel-2 px-3 py-2.5 text-sm text-ide-ink outline-none"
            />
          </label>
          <div className="flex items-center gap-3">
            <SecondaryButton type="submit" disabled={pending || !detailsDirty || name.trim().length < 2}>
              Save details
            </SecondaryButton>
            {detailsDirty && <span className="text-xs text-ide-ink-3">Unsaved changes</span>}
          </div>
        </form>
      </section>

      {/* Problems */}
      <section className="mt-10" aria-labelledby="problems-heading">
        <div className="flex items-baseline gap-3">
          <h2 id="problems-heading" className="font-ide-display text-xl font-semibold tracking-tight">
            Problems
          </h2>
          <span className="tnum text-sm text-ide-ink-3">{order.length}</span>
          {pending && <Spinner className="ml-auto h-3.5 w-3.5" />}
        </div>

        <Panel className="mt-3">
          {order.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ide-ink-2">
              No problems yet. Add one below.
            </p>
          ) : (
            <ol className="divide-y divide-ide-hairline">
              {order.map((member, index) => (
                <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="tnum w-5 shrink-0 text-sm text-ide-ink-3">{index + 1}</span>

                  {/* Up and down rather than drag: works from the keyboard and
                      on a trackpad in a dark lecture hall. */}
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${member.title} up`}
                      disabled={pending || index === 0}
                      onClick={() => setOrder((current) => moveItem(current, index, -1))}
                      className="rounded-control p-1 text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-25"
                    >
                      <ChevronIcon className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${member.title} down`}
                      disabled={pending || index === order.length - 1}
                      onClick={() => setOrder((current) => moveItem(current, index, 1))}
                      className="rounded-control p-1 text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-25"
                    >
                      <ChevronIcon className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.title}</p>
                    <p className="tnum mt-0.5 text-xs text-ide-ink-3">
                      <span className="capitalize">{member.difficulty}</span> · {member.points} pts ·{" "}
                      {member.tests} tests
                    </p>
                  </div>

                  <Link
                    href={`/admin/problems/${member.id}`}
                    className="rounded-control px-2.5 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={pending || orderDirty}
                    title={orderDirty ? "Save or undo the new order first" : "Moves it to Not in a set; nothing is deleted"}
                    onClick={() => run(() => moveProblem(member.id, null))}
                    className="rounded-control px-2.5 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-40"
                  >
                    Remove from set
                  </button>
                  {member.attempts > 0 ? (
                    <button
                      type="button"
                      disabled={pending || orderDirty}
                      title="Hides it from participants and keeps every submission and run"
                      onClick={() => run(() => archive(member.id))}
                      className="rounded-control px-2.5 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-40"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || orderDirty}
                      onClick={() => {
                        if (confirmingDelete === member.id) {
                          setConfirmingDelete(null);
                          run(() => removeProblem(member.id));
                          return;
                        }
                        setConfirmingDelete(member.id);
                      }}
                      onBlur={() => setConfirmingDelete(null)}
                      className={`rounded-control px-2.5 py-2 text-xs transition disabled:opacity-40 ${
                        confirmingDelete === member.id
                          ? "bg-ide-fail-quiet font-medium text-ide-fail"
                          : "text-ide-ink-3 hover:text-ide-fail"
                      }`}
                    >
                      {confirmingDelete === member.id ? "Really delete?" : "Delete"}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}

          {orderDirty && (
            <div className="settle flex flex-wrap items-center gap-3 border-t border-ide-hairline px-4 py-3 sm:px-5">
              <span className="text-sm text-ide-ink-2">New order not saved yet.</span>
              <GhostButton disabled={pending} onClick={() => setOrder(members)} className="ml-auto">
                Undo
              </GhostButton>
              <PrimaryButton disabled={pending} onClick={() => run(() => reorderSet(set.id, order.map((m) => m.id)))}>
                Save order
              </PrimaryButton>
            </div>
          )}
        </Panel>

        {/* Adding */}
        {others.length > 0 && (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!adding) return;
              run(async () => {
                const outcome = await moveProblem(adding, set.id);
                if (outcome.ok) setAdding("");
                return outcome;
              });
            }}
          >
            <label htmlFor="add-problem" className="sr-only">
              Add a problem to this set
            </label>
            <select
              id="add-problem"
              value={adding}
              disabled={pending || orderDirty}
              onChange={(event) => setAdding(event.target.value)}
              className="min-w-0 flex-1 rounded-control bg-ide-panel-2 px-3 py-2.5 text-sm text-ide-ink outline-none disabled:opacity-40"
            >
              <option value="">Add a problem…</option>
              {unassigned.length > 0 && (
                <optgroup label="Not in a set">
                  {unassigned.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {elsewhere.length > 0 && (
                <optgroup label="Move from another set">
                  {elsewhere.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} (in {o.setName})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <SecondaryButton type="submit" disabled={pending || !adding || orderDirty}>
              Add
            </SecondaryButton>
          </form>
        )}
        <p className="mt-2 text-xs text-ide-ink-3">
          New problems go to the end. <Link href="/admin/problems/new" className="underline underline-offset-2 hover:text-ide-ink">Write a new problem</Link>
        </p>

        {result && (
          <div className="settle mt-4">
            <Feedback result={result} />
          </div>
        )}
      </section>

      {/* Deleting the set */}
      <section className="mt-14" aria-labelledby="delete-heading">
        <h2 id="delete-heading" className="text-sm font-medium">
          Delete this set
        </h2>
        <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-ide-ink-3">
          {live
            ? "Close the set from the Console before deleting it."
            : "Its problems are kept and move to Not in a set. Submissions and results are untouched."}
        </p>
        <button
          type="button"
          disabled={pending || live}
          onClick={() => {
            if (confirmingDelete === "set") {
              setConfirmingDelete(null);
              startTransition(async () => {
                const outcome = await removeSet(set.id);
                if (outcome.ok) router.push("/admin");
                else setResult(outcome);
              });
              return;
            }
            setConfirmingDelete("set");
          }}
          onBlur={() => setConfirmingDelete(null)}
          className={`mt-3 rounded-control px-3 py-2 text-sm transition disabled:opacity-40 ${
            confirmingDelete === "set"
              ? "bg-ide-fail-quiet font-medium text-ide-fail"
              : "text-ide-ink-3 hover:bg-ide-panel-2 hover:text-ide-fail"
          }`}
        >
          {confirmingDelete === "set" ? "Really delete this set?" : "Delete set"}
        </button>
      </section>
    </>
  );
}
