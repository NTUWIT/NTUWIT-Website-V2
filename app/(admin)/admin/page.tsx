import { Console } from "@/components/admin/Console";
import { getActiveSelection, getEventClock, listAllProblems, listSets } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [clock, active, sets, problems] = await Promise.all([
    getEventClock(),
    getActiveSelection(),
    listSets(),
    listAllProblems(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="font-ide-display text-4xl font-semibold tracking-tight">Console</h1>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
        One thing is open at a time. Whatever is on the left is exactly what a
        participant can see; everything else is invisible to them and refused by
        the judge.
      </p>

      <Console
        sets={sets}
        problems={problems}
        activeSetId={active.setId}
        activeProblemId={active.problemId}
        endsAt={clock.endsAt ? clock.endsAt.toISOString() : null}
        remainingMinutes={clock.remainingMinutes}
      />
    </div>
  );
}
