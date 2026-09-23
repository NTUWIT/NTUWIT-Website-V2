"use client";

import { useCallback, useRef, useState } from "react";

import { ResizeHandle } from "./resize-handle";

/** Neither pane may be squeezed to uselessness. */
const clamp = (percent: number) => Math.min(65, Math.max(25, percent));

/**
 * Two panes side by side on a laptop, one at a time below it.
 *
 * A narrow screen cannot hold both. Splitting a 667px viewport between a
 * statement and an editor leaves roughly 230px of code and 150px of results,
 * which is not a smaller version of the tool — it is a different, worse one. So
 * below `lg` the panes become tabs and each gets the full height.
 *
 * Both panes stay mounted across the change. Monaco is expensive to create and
 * carries the participant's unsaved work; switching tabs must never risk it.
 */
type Pane = "problem" | "code";

export function Split({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [percent, setPercent] = useState(42);
  const [pane, setPane] = useState<Pane>("code");
  const frame = useRef<HTMLDivElement>(null);

  const onDrag = useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPercent(clamp(((clientX - box.left) / box.width) * 100));
  }, []);

  return (
    <div className="@container flex min-h-0 flex-1 flex-col">
      {/* The tab strip exists only where the panes cannot coexist. */}
      <div className="flex shrink-0 items-center px-3 pb-2 @min-[900px]:hidden">
        {/* A segmented control, not two bare tabs: on the bare ground a
            recess-tinted active pill is nearly the ground's own colour, and the
            pair reads as two more pieces of plain text in a row full of them. */}
        <div role="tablist" className="inline-flex gap-0.5 rounded-control bg-ide-panel-2 p-0.5">
          {(["problem", "code"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={pane === value}
              onClick={() => setPane(value)}
              className={`rounded-focus px-3 py-1.5 text-sm capitalize transition ${
                pane === value
                  ? "bg-ide-panel font-medium text-ide-ink shadow-ide-panel"
                  : "text-ide-ink-3 hover:text-ide-ink"
              }`}
            >
              {value === "problem" ? "Problem" : "Code"}
            </button>
          ))}
        </div>
      </div>

      <div ref={frame} className="flex min-h-0 flex-1 flex-col @min-[900px]:flex-row">
        {/*
         * The percentage is a width, so it is only applied once the panes sit
         * side by side. Left on the element at every width it would set the
         * height of a stacked pane instead.
         */}
        <div
          style={{ "--split": `${percent}%` } as React.CSSProperties}
          className={`min-h-0 min-w-0 lg:flex lg:shrink-0 lg:basis-[var(--split)] ${
            pane === "problem" ? "flex flex-1 flex-col" : "hidden"
          }`}
        >
          {left}
        </div>

        <ResizeHandle
          label="Resize panes"
          onDrag={onDrag}
          onStep={(direction) => setPercent((p) => clamp(p + direction * 2))}
          className="hidden @min-[900px]:flex"
        />

        <div
          className={`min-h-0 min-w-0 @min-[900px]:flex @min-[900px]:flex-1 @min-[900px]:flex-col ${
            pane === "code" ? "flex flex-1 flex-col" : "hidden"
          }`}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
