"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { ResizeHandle } from "./resize-handle";

const DockContext = createContext<HTMLDivElement | null>(null);
export const useVisualizationDock = () => useContext(DockContext);

/** Narrower than this the trace is unreadable; wider and the editor is. */
const MIN_WIDTH = 420;
const clamp = (width: number) =>
  Math.min(Math.max(MIN_WIDTH, width), Math.max(MIN_WIDTH, window.innerWidth - 360));

/** A shared right-hand slot keeps the trace beside the whole coding workspace. */
export function VisualizationWorkspace({ children }: { children: ReactNode }) {
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  // Null until the participant drags: the untouched width is the CSS default,
  // which is responsive. Once they choose a width, their choice is the width.
  const [width, setWidth] = useState<number | null>(null);

  const onDrag = useCallback((clientX: number) => {
    setWidth(clamp(window.innerWidth - clientX));
  }, []);

  const onStep = useCallback(
    (direction: -1 | 1) =>
      setWidth((current) => clamp((current ?? dock?.getBoundingClientRect().width ?? MIN_WIDTH) - direction * 32)),
    [dock],
  );

  return (
    <DockContext.Provider value={dock}>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        <div className="wit-visualization-dock" style={width ? { width: `${width}px` } : undefined}>
          {/* The same seam as the one between the problem and the code, so the
              trace is resized the way every other pane here is resized. */}
          <ResizeHandle label="Resize visualization" onDrag={onDrag} onStep={onStep} />
          <div ref={setDock} className="wit-visualization-slot" />
        </div>
      </div>
    </DockContext.Provider>
  );
}
