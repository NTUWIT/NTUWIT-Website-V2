import Link from "next/link";
import { notFound } from "next/navigation";

import { SetEditor } from "@/components/admin/SetEditor";
import { ChevronIcon } from "@/components/ide/icons";
import { getActiveSelection, getSet, listAllProblems, listSets } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EditSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [set, problems, sets, active] = await Promise.all([
    getSet(id),
    listAllProblems(),
    listSets(),
    getActiveSelection(),
  ]);
  if (!set) notFound();

  // listAllProblems is already in display order.
  const current = problems.filter((problem) => !problem.archivedAt);
  const members = current.filter((problem) => problem.setId === id);
  const setNames = new Map(sets.map((s) => [s.id, s.name]));
  const others = current
    .filter((problem) => problem.setId !== id)
    .map((problem) => ({
      id: problem.id,
      title: problem.title,
      setName: problem.setId ? (setNames.get(problem.setId) ?? null) : null,
    }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
      >
        <ChevronIcon className="h-3 w-3 rotate-180" />
        Console
      </Link>

      <SetEditor
        // Remount when the server's view changes, so local edits always start
        // from what is actually saved.
        key={`${set.name}|${set.description ?? ""}|${members.map((m) => m.id).join(",")}`}
        set={{ id: set.id, name: set.name, description: set.description ?? "" }}
        members={members.map((m) => ({
          id: m.id,
          title: m.title,
          difficulty: m.difficulty,
          points: m.points,
          tests: m.tests,
          attempts: m.attempts,
        }))}
        others={others}
        live={active.setId === id}
      />
    </div>
  );
}
