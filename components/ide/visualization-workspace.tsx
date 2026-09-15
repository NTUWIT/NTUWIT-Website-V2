"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const DockContext = createContext<HTMLDivElement | null>(null);
export const useVisualizationDock = () => useContext(DockContext);

/** A shared right-hand slot keeps the trace beside the whole coding workspace. */
export function VisualizationWorkspace({ children }: { children: ReactNode }) {
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  return (
    <DockContext.Provider value={dock}>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        <div ref={setDock} className="wit-visualization-dock" />
      </div>
    </DockContext.Provider>
  );
}
