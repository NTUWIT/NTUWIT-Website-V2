import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { auth } from "@clerk/nextjs/server";

import { Editor } from "@/components/ide/editor";
import { ChevronIcon } from "@/components/ide/icons";
import { Split } from "@/components/ide/split";
import {
  getSampleTests,
  listProblems,
  getProblemBySlug,
  listSubmissions,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "WIT IDE",
  description: "Solve coding problems in the browser during a WIT Coding Night.",
  robots: { index: false },
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const { userId } = await auth();
  const params = await searchParams;
  const requested = typeof params.problem === "string" ? params.problem : null;

  const all = await listProblems();
  if (all.length === 0) {
    return (
      <Empty title="Nothing to solve yet">
        No problems are seeded. Run <code className="font-mono text-ide-ink">yarn seed</code>.
      </Empty>
    );
  }

  const slug = requested ?? all[0]!.slug;
  const problem = await getProblemBySlug(slug);
  if (!problem) {
    return (
      <Empty title="Problem not found">
        That link points at a problem that no longer exists.
      </Empty>
    );
  }

  // Sample tests only, hidden tests never reach the client.
  const samples = await getSampleTests(problem.id);

  // History is the signed-in participant's own rows only, keyed by the session
  // id rather than anything the client could supply.
  const history = userId
    ? (await listSubmissions(userId, problem.id)).map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      }))
    : [];

  const statement = (
    <aside className="flex h-full min-h-0 flex-col p-3 pt-0 lg:pr-1.5">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ide-panel bg-ide-panel shadow-ide-panel">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-8 pt-8 pb-2">
            <h1 className="font-ide-display text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
              {problem.title}
            </h1>
            <p className="mt-3 flex items-center gap-4 text-sm text-ide-ink-3">
              <span className="capitalize">{problem.difficulty}</span>
              <span className="tnum">{problem.points} points</span>
            </p>
          </div>

          <div className="px-8 pb-8">
            <div className="max-w-[68ch] text-[0.95rem] leading-[1.75] text-ide-ink-2 [&_code]:rounded-[0.3rem] [&_code]:bg-ide-panel-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ide-ink [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-ide-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ide-ink [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-ide-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ide-ink [&_li]:my-1.5 [&_p]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-inset [&_pre]:bg-ide-panel-2 [&_pre]:p-4 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-ide-ink [&_ul]:list-disc [&_ul]:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {problem.statementMd}
              </ReactMarkdown>
            </div>

            {samples.length > 0 && (
              <div className="mt-10">
                <h2 className="font-ide-display text-base font-semibold text-ide-ink">
                  Sample test cases
                </h2>
                {/* Ruled rows, not cards: a card inside a panel is a box inside
                    a box, and these are readings of one sheet. */}
                <dl className="mt-3 divide-y divide-hairline border-y border-ide-hairline">
                  {samples.map((sample, index) => (
                    <div
                      key={index}
                      className="grid gap-x-6 gap-y-1 py-3.5 font-mono text-xs sm:grid-cols-[auto_1fr_1fr] sm:items-baseline"
                    >
                      <span className="tnum font-sans text-ide-ink-3">
                        {index + 1}
                      </span>
                      <div>
                        <dt className="mb-1 font-sans text-ide-ink-3">Input</dt>
                        <dd className="text-ide-ink">{sample.stdin}</dd>
                      </div>
                      <div>
                        <dt className="mb-1 font-sans text-ide-ink-3">Expected output</dt>
                        <dd className="text-ide-ink">{sample.expectedStdout}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {all.length > 1 && (
              <nav className="mt-10">
                <h2 className="font-ide-display text-base font-semibold text-ide-ink">
                  Other problems
                </h2>
                <ul className="mt-3 divide-y divide-hairline border-y border-ide-hairline">
                  {all.map((entry) => {
                    const current = entry.slug === problem.slug;
                    return (
                      <li key={entry.id}>
                        <Link
                          href={`/ide?problem=${entry.slug}`}
                          aria-current={current ? "page" : undefined}
                          className="group flex items-center gap-3 py-3 text-sm"
                        >
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              current ? "bg-ide-accent" : "bg-transparent"
                            }`}
                          />
                          <span
                            className={
                              current ? "font-medium text-ide-ink" : "text-ide-ink-2 group-hover:text-ide-ink"
                            }
                          >
                            {entry.title}
                          </span>
                          <span className="tnum ml-auto text-xs text-ide-ink-3">
                            {entry.points}
                          </span>
                          <ChevronIcon className="h-3.5 w-3.5 text-ide-ink-3 opacity-0 transition group-hover:opacity-100" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            {/* Ranking is not part of a Coding Night. The board still works;
                it just does not compete with the problem for attention. */}
            <Link
              href="/leaderboard"
              className="mt-8 inline-flex items-center gap-1.5 text-xs text-ide-ink-3 transition hover:text-ide-ink-2"
            >
              Leaderboard
              <ChevronIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>
    </aside>
  );

  return (
    <Split
      left={statement}
      right={
        <Editor
          problemId={problem.id}
          starterCode={problem.starterCode}
          samples={samples}
          history={history}
          signedIn={Boolean(userId)}
        />
      }
    />
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm rounded-ide-panel bg-ide-panel px-8 py-7 text-center shadow-ide-panel">
        <h1 className="font-ide-display text-xl font-semibold">{title}</h1>
        <p className="mt-1.5 text-sm text-ide-ink-2">{children}</p>
      </div>
    </div>
  );
}
