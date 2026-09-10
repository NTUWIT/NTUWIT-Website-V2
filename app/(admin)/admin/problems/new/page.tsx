import Link from "next/link";

import { ProblemWizard } from "@/components/admin/ProblemWizard";
import { ChevronIcon } from "@/components/ide/icons";

export default function NewProblemPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
      >
        <ChevronIcon className="h-3 w-3 rotate-180" />
        Console
      </Link>

      <h1 className="mt-6 font-ide-display text-3xl font-semibold tracking-tight sm:text-4xl">
        New problem
      </h1>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
        Define the function participants must write, the problem statement, and
        the test cases used for scoring. Starting code is generated for Python,
        JavaScript, C++ and Java. The problem is not visible to participants
        until its set is opened from the console.
      </p>

      <ProblemWizard />
    </div>
  );
}
