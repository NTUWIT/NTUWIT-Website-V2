"use client";

import { useCallback, useRef, useState } from "react";

import { TabButton } from "./primitives";

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

export function Split({
  left,
  right,
  leftLabel = "Problem",
  rightLabel = "Code",
  initial = 42,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  initial?: number;
}) {
  const [percent, setPercent] = useState(initial);
  const [pane, setPane] = useState<Pane>("code");
  const frame = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    const next = ((event.clientX - box.left) / box.width) * 100;
    // Neither pane may be squeezed to uselessness.
    setPercent(Math.min(65, Math.max(25, next)));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The tab strip exists only where the panes cannot coexist. */}
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2 lg:hidden">
        <TabButton active={pane === "problem"} onClick={() => setPane("problem")}>
          {leftLabel}
        </TabButton>
        <TabButton active={pane === "code"} onClick={() => setPane("code")}>
          {rightLabel}
        </TabButton>
      </div>

      <div ref={frame} className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/*
         * The percentage is a width, so it is only applied once the panes sit
         * side by side. Left on the element at every width it would set the
         * height of a stacked pane instead.
         */}
        <div
          style={{ "--split": `${percent}%` } as React.CSSProperties}
          className={`min-h-0 lg:flex lg:shrink-0 lg:basis-[var(--split)] ${
            pane === "problem" ? "flex flex-1 flex-col" : "hidden"
          }`}
        >
          {left}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPercent((p) => Math.max(25, p - 2));
            if (event.key === "ArrowRight") setPercent((p) => Math.min(65, p + 2));
          }}
          tabIndex={0}
          className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center outline-none lg:flex"
        >
          <span className="h-10 w-[2px] rounded-full bg-ide-panel-3 transition group-hover:bg-ide-accent group-focus-visible:bg-ide-accent" />
        </div>

        <div
          className={`min-h-0 min-w-0 lg:flex lg:flex-1 lg:flex-col ${
            pane === "code" ? "flex flex-1 flex-col" : "hidden"
          }`}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
