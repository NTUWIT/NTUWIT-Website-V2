"use client";

import { useCallback } from "react";

/**
 * The seam between two panes: a 2px pill that turns pink while it is the live
 * point of interaction. One implementation, used by every resizable edge in the
 * workspace, so a participant who learns to drag one has learned all of them.
 *
 * It reports raw pointer x and leaves the arithmetic to the caller, because the
 * split measures a percentage of its frame and the dock measures a width from
 * the right edge of the window.
 */
export function ResizeHandle({
  label,
  onDrag,
  onStep,
  className = "",
}: {
  label: string;
  onDrag: (clientX: number) => void;
  onStep: (direction: -1 | 1) => void;
  className?: string;
}) {
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      onDrag(event.clientX);
    },
    [onDrag],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onStep(-1);
        if (event.key === "ArrowRight") onStep(1);
      }}
      className={`group flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none ${className}`}
    >
      <span className="h-10 w-[2px] rounded-full bg-ide-panel-3 transition group-hover:bg-ide-accent group-focus-visible:bg-ide-accent" />
    </div>
  );
}
