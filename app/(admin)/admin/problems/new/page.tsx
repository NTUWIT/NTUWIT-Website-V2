import Link from "next/link";

import { ProblemWizard } from "@/components/admin/ProblemWizard";
import { ChevronIcon } from "@/components/ide/icons";

export default function NewProblemPage() {
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
        Write a problem
      </h1>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
        Five short steps. You describe one function; the starting code for
        Python, JavaScript, C++ and Java is written for you, and every example
        is checked against it before this can save. Nothing you write here is
        visible to anyone until you open it from the console.
      </p>

      <ProblemWizard />
    </div>
  );
}
