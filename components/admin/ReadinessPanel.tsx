"use client";

import { ICON, TONE, type Tone } from "@/components/ide/primitives";

/**
 * A standing checklist of what the problem still needs, modelled on Polygon's
 * always-visible status panel. Each row links to the step that resolves it.
 */

export type ReadinessItem = {
  label: string;
  detail: string;
  state: "done" | "todo" | "warn";
  step: string;
};

const AS_TONE: Record<ReadinessItem["state"], Tone> = {
  done: "pass",
  warn: "warn",
  todo: "quiet",
};

export function ReadinessPanel({
  items,
  advice,
  onJump,
}: {
  items: ReadinessItem[];
  advice: string[];
  onJump: (step: string) => void;
}) {
  const done = items.filter((item) => item.state === "done").length;

  return (
    <aside className="rounded-panel bg-ide-panel p-4 shadow-ide-panel">
      <h2 className="flex items-baseline gap-2 text-sm font-semibold">
        Checklist
        <span className="tnum text-xs font-normal text-ide-ink-3">
          {done} of {items.length}
        </span>
      </h2>

      <ul className="mt-3 space-y-1">
        {items.map((item) => {
          const tone = AS_TONE[item.state];
          const Icon = ICON[tone];
          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => onJump(item.step)}
                className="flex w-full items-start gap-2.5 rounded-control px-2 py-1.5 text-left transition hover:bg-ide-panel-2"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${TONE[tone].quiet} ${TONE[tone].text}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm">{item.label}</span>
                  <span className="block text-xs text-ide-ink-3">{item.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {advice.length > 0 && (
        <div className="mt-4 border-t border-ide-hairline pt-3">
          {/* Advisory only, in the spirit of HackerRank's quality review. A
              short warm-up problem is a legitimate thing to author. */}
          <p className="text-xs font-medium text-ide-ink-2">Suggestions</p>
          <ul className="mt-1.5 space-y-1">
            {advice.map((line) => (
              <li key={line} className="text-xs leading-relaxed text-ide-ink-3">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
