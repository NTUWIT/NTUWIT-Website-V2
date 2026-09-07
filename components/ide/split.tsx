"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Two-pane layout with a draggable divider. Collapses to stacked panes below
 * `lg`, where a horizontal split has nothing to divide.
 * ponytail: pointer events and a percentage, no resize library.
 */
export function Split({
  left,
  right,
  initial = 42,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  initial?: number;
}) {
  const [percent, setPercent] = useState(initial);
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
    <div ref={frame} className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="min-h-0 lg:shrink-0" style={{ flexBasis: `${percent}%` }}>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{right}</div>
    </div>
  );
}
