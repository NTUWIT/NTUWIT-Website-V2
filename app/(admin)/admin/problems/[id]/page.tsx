import Link from "next/link";
import { notFound } from "next/navigation";

import { ProblemWizard } from "@/components/admin/ProblemWizard";
import { ChevronIcon } from "@/components/ide/icons";
import { countSubmissions, getProblemForEdit } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EditProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const found = await getProblemForEdit(id);
  if (!found) notFound();

  const { problem, tests } = found;
  const attempts = await countSubmissions(id);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
      >
        <ChevronIcon className="h-3 w-3 rotate-180" />
        Console
      </Link>

      <h1 className="mt-6 font-ide-display text-4xl font-semibold tracking-tight">
        {problem.title}
      </h1>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
        Every field is editable, and every change is re-validated against the
        function signature before it saves. Starter code is regenerated from the
        signature, so the four languages stay in step.
      </p>

      <ProblemWizard
        existing={{
          id: problem.id,
          setId: problem.setId,
          title: problem.title,
          slug: problem.slug,
          difficulty: problem.difficulty as "easy" | "medium" | "hard",
          points: problem.points,
          timeLimitMs: problem.timeLimitMs,
          order: problem.order,
          statementMd: problem.statementMd,
          signature: problem.signature,
          tests,
          attempts,
        }}
      />
    </div>
  );
}
