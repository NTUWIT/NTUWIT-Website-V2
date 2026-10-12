import Link from "next/link";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Editor } from "@/components/ide/editor";
import { ProblemList, ProblemNav, StatementPane } from "@/components/ide/problem-list";
import { ChevronIcon } from "@/components/ide/icons";
import { VisualizationWorkspace } from "@/components/ide/visualization-workspace";
import { Split } from "@/components/ide/split";
import {
  countTests,
  getSampleTests,
  listProblems,
  getProblemBySlug,
  listSubmissions,
} from "@/lib/db/queries";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "WIT IDE",
  description: "Solve coding problems in the browser during a WIT Coding Night.",
  robots: { index: false },
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const userId = await requireUser();
  const params = await searchParams;
  const requested = typeof params.problem === "string" ? params.problem : null;

  const all = await listProblems();
  if (all.length === 0) {
    return (
      <Empty title="Nothing to solve yet">
        Problems appear here when the session starts.
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

  // Nobody can run or submit without a name, so ask for it first and come
  // back to this same problem.
  if (!userId) redirect(`/sign-in?next=${encodeURIComponent(`/ide?problem=${problem.slug}`)}`);

  const index = all.findIndex((p) => p.id === problem.id);
  const neighbour = (i: number) => (all[i] ? { slug: all[i].slug, title: all[i].title } : null);
  const prev = neighbour(index - 1);
  const next = neighbour(index + 1);

  // Sample tests only, hidden tests never reach the client. The counts beside
  // them are safe: how many tests exist says nothing about what they contain.
  const samples = await getSampleTests(problem.id);
  const counts = await countTests(problem.id);
  const hiddenCount = Math.max(0, counts.total - counts.samples);

  // History is the participant's own rows only, keyed by the Clerk session or
  // the signed guest cookie rather than anything the client could supply.
  const history = (await listSubmissions(userId, problem.id)).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  const statement = (
    <aside className="flex h-full min-h-0 min-w-0 flex-col p-3 pt-0 lg:pr-1.5">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel">
        {all.length > 1 && index >= 0 && <ProblemNav index={index} count={all.length} prev={prev} next={next} />}
        <StatementPane problemId={problem.id} next={next}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-6 pb-2 sm:px-8 sm:pt-8">
              <h1 className="font-ide-display text-[2rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-[2.6rem] sm:leading-[1.05]">
                {problem.title}
              </h1>
              <p className="mt-3 flex items-center gap-4 text-sm text-ide-ink-3">
                <span className="capitalize">{problem.difficulty}</span>
                <span className="tnum">{problem.points} points</span>
              </p>
            </div>
  
            <div className="px-5 pb-8 sm:px-8">
              <div className="max-w-[68ch] text-[0.95rem] leading-[1.75] text-ide-ink-2 [&_code]:break-words [&_code]:rounded-[0.3rem] [&_code]:bg-ide-panel-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ide-ink [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-ide-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ide-ink [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-ide-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ide-ink [&_li]:my-1.5 [&_p]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-inset [&_pre]:bg-ide-panel-2 [&_pre]:p-4 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-ide-ink [&_ul]:list-disc [&_ul]:pl-5">
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
                  <dl className="mt-3 divide-y divide-ide-hairline border-y border-ide-hairline">
                    {samples.map((sample, index) => (
                      <div
                        key={index}
                        className="grid gap-x-6 gap-y-1 py-3.5 font-mono text-xs sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline"
                      >
                        <span className="tnum font-sans text-ide-ink-3">
                          {index + 1}
                        </span>
                        <div>
                          <dt className="mb-1 font-sans text-ide-ink-3">Input</dt>
                          <dd className="text-ide-ink break-all">{sample.stdin}</dd>
                        </div>
                        <div>
                          <dt className="mb-1 font-sans text-ide-ink-3">Expected output</dt>
                          <dd className="text-ide-ink break-all">{sample.expectedStdout}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
  
                  {/* Hidden tests are named before someone meets them, never
                      after. The count is safe; the content never leaves the
                      server. */}
                  {hiddenCount > 0 && (
                    <p className="tnum mt-3 text-xs leading-relaxed text-ide-ink-2">
                      Submit also runs {hiddenCount} hidden test{hiddenCount === 1 ? "" : "s"}.
                    </p>
                  )}
                </div>
              )}
  
              {all.length > 1 && (
                <ProblemList
                  entries={all.map(({ id, slug, title, points }) => ({ id, slug, title, points }))}
                  currentSlug={problem.slug}
                />
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
        </StatementPane>
      </section>
    </aside>
  );

  return (
    <VisualizationWorkspace>
      <Split
        left={statement}
        right={
          <Editor
            key={problem.id}
            problemId={problem.id}
            visualizationSignature={{
              name: problem.signature.name,
              params: problem.signature.params,
              returns: problem.signature.returns,
              mutates: problem.signature.mutates,
              methods: problem.signature.methods,
              requiresJudge: Boolean(problem.signature.provided || problem.signature.hidden?.length),
            }}
            starterCode={problem.starterCode}
            samples={samples}
            hiddenCount={hiddenCount}
            history={history}
          />
        }
      />
    </VisualizationWorkspace>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm rounded-panel bg-ide-panel px-8 py-7 text-center shadow-ide-panel">
        <h1 className="font-ide-display text-xl font-semibold">{title}</h1>
        <p className="mt-1.5 text-sm text-ide-ink-2">{children}</p>
      </div>
    </div>
  );
}
